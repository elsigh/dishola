#!/usr/bin/env node

/**
 * Image Migration Script
 * Migrates dish images from filesystem to Vercel Blob storage and updates Supabase
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
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
 * Parse dish_images data from production SQL file
 */
function parseDishImagesFromSql() {
  console.log('📖 Parsing dish_images from production SQL...');
  
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
  
  console.log(`✅ Found ${dishImages.length} dish_images records`);
  return dishImages;
}

/**
 * Find image file in imgstore directory
 */
function findImageFile(filename) {
  // Walk through imgstore directory structure
  const imgstoreDir = config.imgstoreDir;
  
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
  
  return walkDir(imgstoreDir);
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
      addRandomSuffix: true  // Add random suffix to avoid conflicts
    });
    
    console.log(`✅ Uploaded to: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error(`❌ Failed to upload ${originalFilename}:`, error.message);
    throw error;
  }
}

/**
 * Get content type from filename
 */
function getContentType(filename) {
  const ext = extname(filename).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.webp': 'image/webp'
  };
  
  return contentTypes[ext] || 'image/jpeg';
}

/**
 * Insert image record into Supabase
 */
async function insertImageRecord(dishImage, blobUrl, filePath) {
  console.log(`💾 Inserting image record for dish ${dishImage.dish_id}...`);
  
  if (config.dryRun) {
    console.log(`[DRY RUN] Would insert:`, {
      dish_id: dishImage.dish_id,
      blob_url: blobUrl,
      original_filename: dishImage.description
    });
    return { id: Math.floor(Math.random() * 1000) };
  }
  
  const stat = statSync(filePath);
  
  const { data, error } = await supabase
    .from('dish_images')
    .insert({
      dish_id: dishImage.dish_id,
      review_id: null, // Will be updated later if needed
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
 * Check if dish exists in current database
 */
async function checkDishExists(dishId) {
  if (config.dryRun) {
    return true; // Skip check in dry run
  }
  
  const { data } = await supabase
    .from('dishes')
    .select('id')
    .eq('id', dishId)
    .single();
  
  return data !== null;
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 Starting image migration...');
  console.log(`📁 Imgstore directory: ${config.imgstoreDir}`);
  console.log(`🔄 Dry run: ${config.dryRun}`);
  
  // Parse dish images from production SQL
  const dishImages = parseDishImagesFromSql();
  
  // Get existing dish IDs from the database
  const { data: existingDishes } = await supabase
    .from('dishes')
    .select('id');
  
  const existingDishIds = new Set(existingDishes.map(d => d.id));
  console.log(`📊 Found ${existingDishIds.size} existing dishes in database`);
  
  // Filter images to only process ones for existing dishes
  const validImages = dishImages.filter(img => existingDishIds.has(img.dish_id));
  console.log(`📊 Found ${validImages.length} images for existing dishes (out of ${dishImages.length} total)`);
  
  // Group images by dish_id to handle canonical images
  const imagesByDish = {};
  let processed = 0;
  let skipped = 0;
  let errors = 0;
  let dishNotFound = 0;
  
  for (const dishImage of validImages) {
    try {
      console.log(`\\n📋 Processing image ${processed + skipped + errors + dishNotFound + 1}/${validImages.length}`);
      console.log(`   Dish ID: ${dishImage.dish_id}, Filename: ${dishImage.description}`);
      
      // Dish is guaranteed to exist since we filtered for existing dishes
      
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
  
  // Set canonical images (first image for each dish)
  console.log('\\n🖼️  Setting canonical images...');
  for (const [dishId, images] of Object.entries(imagesByDish)) {
    if (images.length > 0) {
      await updateCanonicalImage(parseInt(dishId), images[0].id);
    }
  }
  
  console.log('\\n🎉 Migration completed!');
  console.log(`✅ Processed: ${processed}`);
  console.log(`⚠️  Skipped (file not found): ${skipped}`);
  console.log(`⚠️  Skipped (dish not found): ${dishNotFound}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total dishes with images: ${Object.keys(imagesByDish).length}`);
}

// Run the migration
main().catch(console.error);