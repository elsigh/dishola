import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { put } from '@vercel/blob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from API directory
dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN,
  imgstoreDir: join(__dirname, '../imgstore'),
  dryRun: process.env.DRY_RUN === 'true',
  maxImages: process.env.MAX_IMAGES ? parseInt(process.env.MAX_IMAGES) : 100 // Safety limit
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

// Get existing dishes from database
async function getExistingDishes() {
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name');
  
  return new Map(dishes.map(d => [d.id, d.name]));
}

/**
 * Get content type from filename
 */
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

/**
 * Upload image to Vercel Blob
 */
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

/**
 * Insert image record into Supabase
 */
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

/**
 * Update canonical image for dish if it doesn't have one
 */
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

/**
 * Find all image files in imgstore directory
 */
function findAllImages() {
  const images = [];
  
  function walkDir(dir, level = 0) {
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const itemPath = join(dir, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          walkDir(itemPath, level + 1);
        } else {
          // Check if it's an image file
          const ext = item.split('.').pop().toLowerCase();
          if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(ext)) {
            // Extract potential dish ID from path
            const pathParts = dir.replace(config.imgstoreDir, '').split('/').filter(p => p);
            
            // Try to determine dish ID from directory structure
            // Pattern seems to be imgstore/X/Y/ where Y might be dish ID
            let potentialDishId = null;
            if (pathParts.length >= 2) {
              const secondLevel = parseInt(pathParts[1]);
              if (!isNaN(secondLevel)) {
                potentialDishId = secondLevel;
              }
            }
            
            images.push({
              path: itemPath,
              filename: item,
              potentialDishId,
              relativePath: itemPath.replace(config.imgstoreDir + '/', '')
            });
          }
        }
      }
    } catch (err) {
      console.error(`Error walking directory ${dir}:`, err.message);
    }
  }
  
  walkDir(config.imgstoreDir);
  return images;
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting comprehensive image migration...');
  console.log(`📁 Imgstore directory: ${config.imgstoreDir}`);
  console.log(`🔄 Dry run: ${config.dryRun}`);
  console.log(`🚫 Max images limit: ${config.maxImages}`);
  
  // Get existing dishes
  const existingDishes = await getExistingDishes();
  console.log(`📊 Found ${existingDishes.size} existing dishes in database`);
  
  // Find all images in imgstore
  console.log('🔍 Scanning imgstore directory for images...');
  const allImages = findAllImages();
  console.log(`📊 Found ${allImages.length} total images in imgstore`);
  
  // Filter images that might belong to existing dishes
  const relevantImages = allImages.filter(img => 
    img.potentialDishId && existingDishes.has(img.potentialDishId)
  );
  
  console.log(`📊 Found ${relevantImages.length} images that might belong to existing dishes`);
  
  // Limit the number of images to process for safety
  const imagesToProcess = relevantImages.slice(0, config.maxImages);
  if (imagesToProcess.length < relevantImages.length) {
    console.log(`⚠️  Processing only first ${config.maxImages} images for safety`);
  }
  
  // Group images by dish ID
  const imagesByDish = {};
  let processed = 0;
  let errors = 0;
  
  for (const imageData of imagesToProcess) {
    try {
      const dishId = imageData.potentialDishId;
      const dishName = existingDishes.get(dishId);
      
      console.log(`\n📋 Processing image ${processed + errors + 1}/${imagesToProcess.length}`);
      console.log(`   Dish ID: ${dishId} (${dishName})`);
      console.log(`   File: ${imageData.relativePath}`);
      
      // Upload to Vercel Blob
      const blobUrl = await uploadToBlob(imageData.path, imageData.filename);
      
      // Insert into Supabase
      const imageRecord = await insertImageRecord(dishId, blobUrl, imageData.filename, imageData.path);
      
      // Track for canonical image setting
      if (!imagesByDish[dishId]) {
        imagesByDish[dishId] = [];
      }
      imagesByDish[dishId].push(imageRecord);
      
      processed++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing image ${imageData.filename}:`, error.message);
      errors++;
    }
  }
  
  // Set canonical images for dishes that don't have them
  console.log('\n🖼️  Setting canonical images...');
  for (const [dishId, images] of Object.entries(imagesByDish)) {
    if (images.length > 0) {
      await updateCanonicalImage(parseInt(dishId), images[0].id);
    }
  }
  
  console.log('\n🎉 Migration completed!');
  console.log(`✅ Processed: ${processed}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total dishes with new images: ${Object.keys(imagesByDish).length}`);
  
  // Show summary by dish
  console.log('\n📋 Summary by dish:');
  for (const [dishId, images] of Object.entries(imagesByDish)) {
    const dishName = existingDishes.get(parseInt(dishId));
    console.log(`   Dish ${dishId} (${dishName}): ${images.length} images`);
  }
}

// Run the migration
main().catch(console.error);