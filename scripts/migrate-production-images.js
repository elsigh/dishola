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
  dryRun: process.env.DRY_RUN === 'true',
  maxImages: process.env.MAX_IMAGES ? parseInt(process.env.MAX_IMAGES) : 50 // Safety limit
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Parse ALL dish_images records from production SQL
 */
function parseAllDishImagesFromSql() {
  console.log('📖 Parsing ALL dish_images from production SQL...');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  // Find the INSERT statement for dish_images
  const insertMatch = sqlContent.match(/INSERT INTO `dish_images` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find dish_images INSERT statement');
    return [];
  }
  
  const valuesString = insertMatch[1];
  const dishImages = [];
  
  // Parse each VALUES clause: (id,dish_id,image_id,original_image_id,'filename','created','modified')
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    
    // Split by comma but be careful with quoted strings
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = null;
    
    for (let i = 0; i < valuesStr.length; i++) {
      const char = valuesStr[i];
      
      if (!inQuotes && (char === "'" || char === '"')) {
        inQuotes = true;
        quoteChar = char;
        current += char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = null;
        current += char;
      } else if (!inQuotes && char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      values.push(current.trim());
    }
    
    if (values.length >= 7) {
      dishImages.push({
        id: parseInt(values[0]),
        dish_id: parseInt(values[1]),
        image_id: parseInt(values[2]),
        original_image_id: parseInt(values[3]),
        description: values[4].replace(/^'|'$/g, ''),
        created: values[5].replace(/^'|'$/g, ''),
        modified: values[6].replace(/^'|'$/g, '')
      });
    }
  }
  
  console.log(`✅ Found ${dishImages.length} total dish_images records from production SQL`);
  return dishImages;
}

/**
 * Get existing dishes from Supabase
 */
async function getExistingDishes() {
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name');
  
  return new Map(dishes.map(d => [d.id, d.name]));
}

/**
 * Find image file in imgstore directory
 */
function findImageFile(filename) {
  function walkDir(dir) {
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const itemPath = join(dir, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          const result = walkDir(itemPath);
          if (result) return result;
        } else if (item === filename) {
          return itemPath;
        }
      }
    } catch (err) {
      // Directory might not exist, continue
    }
    
    return null;
  }
  
  return walkDir(config.imgstoreDir);
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
async function insertImageRecord(dishImage, blobUrl, filePath) {
  if (config.dryRun) {
    console.log(`[DRY RUN] Would insert image for dish ${dishImage.dish_id}: ${dishImage.description}`);
    return { id: Math.floor(Math.random() * 1000) };
  }
  
  const stat = statSync(filePath);
  
  const { data, error } = await supabase
    .from('dish_images')
    .insert({
      dish_id: dishImage.dish_id,
      review_id: null,
      blob_url: blobUrl,
      original_filename: dishImage.description,
      content_type: getContentType(dishImage.description),
      file_size: stat.size,
      description: dishImage.description,
      created_at: new Date(dishImage.created).toISOString(),
      updated_at: new Date(dishImage.modified).toISOString()
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
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting production-based image migration...');
  console.log(`📁 Imgstore directory: ${config.imgstoreDir}`);
  console.log(`🔄 Dry run: ${config.dryRun}`);
  console.log(`🚫 Max images limit: ${config.maxImages}`);
  
  // Get existing dishes from Supabase
  const existingDishes = await getExistingDishes();
  console.log(`📊 Found ${existingDishes.size} existing dishes in database`);
  
  // Parse ALL dish_images records from production SQL
  const allDishImages = parseAllDishImagesFromSql();
  
  // Filter to only images for existing dishes
  const validDishImages = allDishImages.filter(img => existingDishes.has(img.dish_id));
  console.log(`📊 Found ${validDishImages.length} images for existing dishes (out of ${allDishImages.length} total)`);
  
  // Apply safety limit
  const imagesToProcess = validDishImages.slice(0, config.maxImages);
  if (imagesToProcess.length < validDishImages.length) {
    console.log(`⚠️  Processing only first ${config.maxImages} images for safety`);
  }
  
  // Group images by dish ID for canonical image setting
  const imagesByDish = {};
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const dishImage of imagesToProcess) {
    try {
      const dishName = existingDishes.get(dishImage.dish_id);
      
      console.log(`\n📋 Processing image ${processed + skipped + errors + 1}/${imagesToProcess.length}`);
      console.log(`   Dish ID: ${dishImage.dish_id} (${dishName})`);
      console.log(`   Filename: ${dishImage.description}`);
      console.log(`   Original created: ${dishImage.created}`);
      
      // Find the image file
      const filePath = findImageFile(dishImage.description);
      if (!filePath) {
        console.log(`⚠️  Image file not found: ${dishImage.description}`);
        skipped++;
        continue;
      }
      
      console.log(`📂 Found image at: ${filePath}`);
      
      // Upload to Vercel Blob
      const blobUrl = await uploadToBlob(filePath, dishImage.description);
      
      // Insert into Supabase
      const imageRecord = await insertImageRecord(dishImage, blobUrl, filePath);
      
      // Track for canonical image setting
      if (!imagesByDish[dishImage.dish_id]) {
        imagesByDish[dishImage.dish_id] = [];
      }
      imagesByDish[dishImage.dish_id].push(imageRecord);
      
      processed++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing image for dish ${dishImage.dish_id}:`, error.message);
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
  console.log(`⚠️  Skipped (file not found): ${skipped}`);
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