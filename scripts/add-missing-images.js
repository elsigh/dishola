import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN,
  imgstoreDir: join(__dirname, '../imgstore'),
  dryRun: process.env.DRY_RUN === 'true'
};

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const contentTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'webp': 'image/webp'
  };
  
  return contentTypes[ext] || 'image/jpeg';
}

async function uploadToBlob(filePath, originalFilename) {
  try {
    if (config.dryRun) {
      console.log(`[DRY RUN] Would upload: ${filePath}`);
      return `https://blob.vercel-storage.com/fake-${originalFilename}`;
    }
    
    const fileBuffer = readFileSync(filePath);
    const contentType = getContentType(originalFilename);
    
    const blob = await put(originalFilename, fileBuffer, {
      access: 'public',
      contentType,
      token: config.blobToken,
      addRandomSuffix: true
    });
    
    console.log(`✅ Uploaded to: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error(`❌ Failed to upload ${originalFilename}:`, error.message);
    throw error;
  }
}

async function insertImageRecord(dishId, blobUrl, originalFilename, filePath) {
  if (config.dryRun) {
    console.log(`[DRY RUN] Would insert image for dish ${dishId}: ${originalFilename}`);
    return { id: Math.floor(Math.random() * 1000) };
  }
  
  const stat = statSync(filePath);
  
  const { data, error } = await supabase
    .from('dish_images')
    .insert({
      dish_id: dishId,
      review_id: null,
      blob_url: blobUrl,
      original_filename: originalFilename,
      content_type: getContentType(originalFilename),
      file_size: stat.size,
      description: originalFilename,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Failed to insert image record:`, error);
    throw error;
  }
  
  console.log(`✅ Inserted image record with ID: ${data.id}`);
  return data;
}

async function updateCanonicalImage(dishId, imageId) {
  if (config.dryRun) {
    console.log(`[DRY RUN] Would set canonical image ${imageId} for dish ${dishId}`);
    return;
  }
  
  // Check if dish already has a canonical image
  const { data: dish } = await supabase
    .from('dishes')
    .select('canonical_image_id')
    .eq('id', dishId)
    .single();
  
  if (!dish.canonical_image_id) {
    const { error } = await supabase
      .from('dishes')
      .update({ canonical_image_id: imageId })
      .eq('id', dishId);
    
    if (error) {
      console.error(`❌ Failed to update canonical image:`, error);
      throw error;
    }
    
    console.log(`✅ Updated canonical image for dish ${dishId}`);
  } else {
    console.log(`⚠️  Dish ${dishId} already has canonical image ${dish.canonical_image_id}`);
  }
}

async function addMissingImages() {
  console.log('🔧 Adding missing images from dish_image_filepath...');
  console.log(`🔄 Dry run: ${config.dryRun}`);
  
  // Get dishes that have dish_image_filepath
  const { data: dishesWithFilepaths } = await supabase
    .from('dishes')
    .select('id, name, dish_image_filepath')
    .not('dish_image_filepath', 'is', null)
    .neq('dish_image_filepath', '');
  
  console.log(`Found ${dishesWithFilepaths.length} dishes with image filepaths`);
  
  // Get dishes that already have images
  const { data: existingImages } = await supabase
    .from('dish_images')
    .select('dish_id');
  
  const dishesWithImages = new Set(existingImages.map(img => img.dish_id));
  
  // Filter to dishes that don't already have images
  const dishesNeedingImages = dishesWithFilepaths.filter(dish => 
    !dishesWithImages.has(dish.id)
  );
  
  console.log(`${dishesNeedingImages.length} dishes need images added:`);
  dishesNeedingImages.forEach(dish => {
    console.log(`  Dish ${dish.id}: ${dish.name}`);
    console.log(`    Image path: ${dish.dish_image_filepath}`);
  });
  
  if (dishesNeedingImages.length === 0) {
    console.log('ℹ️  No missing images to add!');
    return;
  }
  
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const dish of dishesNeedingImages) {
    try {
      console.log(`\n📷 Processing dish ${dish.id}: "${dish.name}"`);
      console.log(`   Image path: ${dish.dish_image_filepath}`);
      
      // Extract filename from path
      const filename = dish.dish_image_filepath.split('/').pop();
      
      // Build the expected file path
      const relativePath = dish.dish_image_filepath.replace('/imgstore/', '');
      const absolutePath = join(config.imgstoreDir, relativePath);
      
      console.log(`   Looking for: ${absolutePath}`);
      
      // Check if file exists
      let fileExists = false;
      try {
        const stat = statSync(absolutePath);
        fileExists = stat.isFile();
      } catch (err) {
        fileExists = false;
      }
      
      if (!fileExists) {
        console.log(`⚠️  Image file not found: ${absolutePath}`);
        skipped++;
        continue;
      }
      
      console.log(`📂 Found image at: ${absolutePath}`);
      
      // Upload to Vercel Blob
      const blobUrl = await uploadToBlob(absolutePath, filename);
      
      // Insert into Supabase
      const imageRecord = await insertImageRecord(dish.id, blobUrl, filename, absolutePath);
      
      // Set as canonical image
      await updateCanonicalImage(dish.id, imageRecord.id);
      
      processed++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing dish ${dish.id}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n🎉 Missing images processing completed!');
  console.log(`✅ Processed: ${processed}`);
  console.log(`⚠️  Skipped (file not found): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

addMissingImages().catch(console.error);