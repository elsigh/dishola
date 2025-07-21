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
  productionSqlFile: join(__dirname, '../dishola_production.sql'),
  dryRun: process.env.DRY_RUN === 'true'
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Parse dishes with image filepaths from production SQL
 */
function parseDishesWithImages() {
  console.log('📖 Parsing dishes with image filepaths from production SQL...');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  // Find dishes with image filepaths - look for the specific pattern
  const dishesWithImages = [];
  const lines = sqlContent.split('\n');
  
  for (const line of lines) {
    if (line.includes('INSERT INTO `dishes` VALUES') && line.includes('/imgstore/')) {
      // Extract all tuples from this line
      const tupleRegex = /\(([^)]+)\)/g;
      let match;
      
      while ((match = tupleRegex.exec(line)) !== null) {
        const tupleContent = match[1];
        
        // Look for dish_id (first field) and imgstore path
        const fields = tupleContent.split(',');
        if (fields.length > 18) { // dishes table has many fields
          const dishId = parseInt(fields[0]);
          
          // Find the imgstore path in the fields
          for (const field of fields) {
            const cleanField = field.trim().replace(/^'|'$/g, '');
            if (cleanField.includes('/imgstore/')) {
              dishesWithImages.push({
                dish_id: dishId,
                image_path: cleanField
              });
              break;
            }
          }
        }
      }
    }
  }
  
  console.log(`✅ Found ${dishesWithImages.length} dishes with image filepaths`);
  return dishesWithImages;
}

/**
 * Check if file exists at path
 */
function fileExists(filePath) {
  try {
    const stat = statSync(filePath);
    return stat.isFile();
  } catch (err) {
    return false;
  }
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
    console.log(`📤 Uploading ${originalFilename} to Vercel Blob...`);
    
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
  console.log(`💾 Inserting image record for dish ${dishId}...`);
  
  if (config.dryRun) {
    console.log(`[DRY RUN] Would insert:`, {
      dish_id: dishId,
      blob_url: blobUrl,
      original_filename: originalFilename
    });
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
 * Update canonical image for dish
 */
async function updateCanonicalImage(dishId, imageId) {
  console.log(`🖼️  Setting canonical image for dish ${dishId}...`);
  
  if (config.dryRun) {
    console.log(`[DRY RUN] Would set canonical image ${imageId} for dish ${dishId}`);
    return;
  }
  
  const { error } = await supabase
    .from('dishes')
    .update({ canonical_image_id: imageId })
    .eq('id', dishId);
  
  if (error) {
    console.error(`❌ Failed to update canonical image:`, error);
    throw error;
  }
  
  console.log(`✅ Updated canonical image for dish ${dishId}`);
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting filepath image migration...');
  console.log(`📁 Imgstore directory: ${config.imgstoreDir}`);
  console.log(`🔄 Dry run: ${config.dryRun}`);
  
  // Parse dishes with image filepaths
  const dishesWithImages = parseDishesWithImages();
  
  // Get existing dish IDs from the database
  const { data: existingDishes } = await supabase
    .from('dishes')
    .select('id');
  
  const existingDishIds = new Set(existingDishes.map(d => d.id));
  console.log(`📊 Found ${existingDishIds.size} existing dishes in database`);
  
  // Filter images to only process ones for existing dishes
  const validImages = dishesWithImages.filter(img => existingDishIds.has(img.dish_id));
  console.log(`📊 Found ${validImages.length} images for existing dishes (out of ${dishesWithImages.length} total)`);
  
  // Group images by dish_id to handle canonical images
  const imagesByDish = {};
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const dishImageData of validImages) {
    try {
      console.log(`\n📋 Processing image ${processed + skipped + errors + 1}/${validImages.length}`);
      console.log(`   Dish ID: ${dishImageData.dish_id}, Path: ${dishImageData.image_path}`);
      
      // Convert relative path to absolute
      const imagePath = dishImageData.image_path;
      const relativePath = imagePath.replace(/^\/imgstore\//, '');
      const absolutePath = join(config.imgstoreDir, relativePath);
      
      // Check if file exists
      if (!fileExists(absolutePath)) {
        console.log(`⚠️  Image file not found: ${absolutePath}`);
        skipped++;
        continue;
      }
      
      console.log(`📂 Found image at: ${absolutePath}`);
      
      // Extract filename
      const filename = relativePath.split('/').pop();
      
      // Upload to Vercel Blob
      const blobUrl = await uploadToBlob(absolutePath, filename);
      
      // Insert into Supabase
      const imageRecord = await insertImageRecord(dishImageData.dish_id, blobUrl, filename, absolutePath);
      
      // Track for canonical image setting
      if (!imagesByDish[dishImageData.dish_id]) {
        imagesByDish[dishImageData.dish_id] = [];
      }
      imagesByDish[dishImageData.dish_id].push(imageRecord);
      
      processed++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing image for dish ${dishImageData.dish_id}:`, error.message);
      errors++;
    }
  }
  
  // Set canonical images (first image for each dish that doesn't already have one)
  console.log('\n🖼️  Setting canonical images...');
  for (const [dishId, images] of Object.entries(imagesByDish)) {
    if (images.length > 0) {
      // Check if dish already has a canonical image
      const { data: dish } = await supabase
        .from('dishes')
        .select('canonical_image_id')
        .eq('id', parseInt(dishId))
        .single();
      
      if (!dish.canonical_image_id) {
        await updateCanonicalImage(parseInt(dishId), images[0].id);
      } else {
        console.log(`⚠️  Dish ${dishId} already has canonical image ${dish.canonical_image_id}`);
      }
    }
  }
  
  console.log('\n🎉 Migration completed!');
  console.log(`✅ Processed: ${processed}`);
  console.log(`⚠️  Skipped (file not found): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total dishes with images: ${Object.keys(imagesByDish).length}`);
}

// Run the migration
main().catch(console.error);