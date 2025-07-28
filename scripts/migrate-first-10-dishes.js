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
  dishLimit: 10
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Parse users from production SQL
 */
function parseUsersFromSql() {
  console.log('📖 Parsing users from production SQL...');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  const insertMatch = sqlContent.match(/INSERT INTO `users` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find users INSERT statement');
    return [];
  }
  
  const valuesString = insertMatch[1];
  const users = [];
  
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 10) {
      users.push({
        id: parseInt(values[0]),
        email: values[1].replace(/^'|'$/g, ''),
        username: values[2].replace(/^'|'$/g, ''),
        first_name: values[3].replace(/^'|'$/g, ''),
        last_name: values[4].replace(/^'|'$/g, ''),
        created: values[8].replace(/^'|'$/g, ''),
        modified: values[9].replace(/^'|'$/g, '')
      });
    }
  }
  
  console.log(`✅ Found ${users.length} users`);
  return users;
}

/**
 * Parse restaurant_locations from production SQL
 */
function parseRestaurantLocationsFromSql() {
  console.log('📖 Parsing restaurant_locations from production SQL...');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  const insertMatch = sqlContent.match(/INSERT INTO `restaurant_locations` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find restaurant_locations INSERT statement');
    return [];
  }
  
  const valuesString = insertMatch[1];
  const locations = [];
  
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 8) {
      locations.push({
        id: parseInt(values[0]),
        user_id: parseInt(values[1]),
        name: values[2].replace(/^'|'$/g, ''),
        address: values[3].replace(/^'|'$/g, ''),
        phone: values[4].replace(/^'|'$/g, ''),
        website: values[5].replace(/^'|'$/g, ''),
        created: values[6].replace(/^'|'$/g, ''),
        modified: values[7].replace(/^'|'$/g, '')
      });
    }
  }
  
  console.log(`✅ Found ${locations.length} restaurant_locations`);
  return locations;
}

/**
 * Parse first N dishes from production SQL
 */
function parseDishesFromSql(limit = 10) {
  console.log(`📖 Parsing first ${limit} dishes from production SQL...`);
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  const insertMatch = sqlContent.match(/INSERT INTO `dishes` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find dishes INSERT statement');
    return [];
  }
  
  const valuesString = insertMatch[1];
  const dishes = [];
  
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  let count = 0;
  
  while ((match = valuesRegex.exec(valuesString)) !== null && count < limit) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 20) {
      dishes.push({
        id: parseInt(values[0]),
        user_id: parseInt(values[1]),
        name: values[2].replace(/^'|'$/g, ''),
        location_id: parseInt(values[3]),
        disabled: parseInt(values[4]),
        created: values[5].replace(/^'|'$/g, ''),
        modified: values[6].replace(/^'|'$/g, ''),
        vote_avg: parseFloat(values[7]) || 0,
        vote_count: parseInt(values[8]) || 0,
        members_vote_avg: parseFloat(values[9]) || 0,
        members_vote_count: parseInt(values[10]) || 0,
        industry_vote_avg: parseFloat(values[11]) || 0,
        industry_vote_count: parseInt(values[12]) || 0,
        critics_vote_avg: parseFloat(values[13]) || 0,
        critics_vote_count: parseInt(values[14]) || 0,
        last_review_date: values[15].replace(/^'|'$/g, ''),
        review_count: parseInt(values[16]) || 0,
        is_divine: parseInt(values[17]) || 0,
        dish_image_filepath: values[18].replace(/^'|'$/g, ''),
        dish_image_created: values[19].replace(/^'|'$/g, '')
      });
      count++;
    }
  }
  
  console.log(`✅ Found ${dishes.length} dishes`);
  return dishes;
}

/**
 * Parse dish_images for specific dish IDs
 */
function parseDishImagesForDishes(dishIds) {
  console.log(`📖 Parsing dish_images for dish IDs: ${dishIds.join(', ')}`);
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  const insertMatch = sqlContent.match(/INSERT INTO `dish_images` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find dish_images INSERT statement');
    return [];
  }
  
  const valuesString = insertMatch[1];
  const dishImages = [];
  const dishIdSet = new Set(dishIds);
  
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 7) {
      const dishId = parseInt(values[1]);
      if (dishIdSet.has(dishId)) {
        dishImages.push({
          id: parseInt(values[0]),
          dish_id: dishId,
          image_id: parseInt(values[2]),
          original_image_id: parseInt(values[3]),
          description: values[4].replace(/^'|'$/g, ''),
          created: values[5].replace(/^'|'$/g, ''),
          modified: values[6].replace(/^'|'$/g, '')
        });
      }
    }
  }
  
  console.log(`✅ Found ${dishImages.length} dish_images records`);
  return dishImages;
}

/**
 * Parse comma-separated values handling quoted strings
 */
function parseValues(valuesStr) {
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
  
  return values;
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
 * Main migration function
 */
async function main() {
  console.log(`🚀 Starting test migration of first ${config.dishLimit} dishes...`);
  console.log(`🔄 Dry run: ${config.dryRun}`);
  
  // Parse data from production SQL
  const users = parseUsersFromSql();
  const locations = parseRestaurantLocationsFromSql();
  const dishes = parseDishesFromSql(config.dishLimit);
  
  console.log(`\n📋 First ${config.dishLimit} dishes to migrate:`);
  dishes.forEach((dish, index) => {
    const hasImage = dish.dish_image_filepath && dish.dish_image_filepath !== '';
    console.log(`${index + 1}. Dish ${dish.id}: "${dish.name}" ${hasImage ? '📷' : '📷❌'}`);
    if (hasImage) {
      console.log(`   Image: ${dish.dish_image_filepath}`);
    }
  });
  
  // Get dish_images for these dishes
  const dishIds = dishes.map(d => d.id);
  const dishImages = parseDishImagesForDishes(dishIds);
  
  console.log(`\n📊 Summary:`);
  console.log(`• ${dishes.length} dishes`);
  console.log(`• ${dishes.filter(d => d.dish_image_filepath && d.dish_image_filepath !== '').length} dishes with direct image paths`);
  console.log(`• ${dishImages.length} additional dish_images records`);
  
  if (config.dryRun) {
    console.log('\n[DRY RUN] Migration would proceed with:');
    console.log('1. Migrate required users and locations');
    console.log('2. Migrate dishes to Supabase');
    console.log('3. Find and upload images to Vercel Blob');
    console.log('4. Create dish_images records in Supabase');
    console.log('5. Set canonical images');
    return;
  }
  
  // Step 1: Migrate required users
  console.log('\n1️⃣ Migrating required users...');
  const requiredUserIds = [...new Set([...dishes.map(d => d.user_id), ...locations.map(l => l.user_id)])];
  const requiredUsers = users.filter(u => requiredUserIds.includes(u.id));
  console.log(`Need to migrate ${requiredUsers.length} users`);
  
  for (const user of requiredUsers) {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        name: user.username,
        realname: `${user.first_name} ${user.last_name}`.trim() || user.username,
        email: user.email,
        created_at: new Date(user.created).toISOString(),
        updated_at: new Date(user.modified).toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Failed to migrate user ${user.id}:`, error);
    } else {
      console.log(`✅ Migrated user ${user.id}: ${user.username}`);
    }
  }
  
  // Step 2: Migrate required restaurants (from restaurant_locations)
  console.log('\n2️⃣ Migrating required restaurants...');
  const requiredLocationIds = [...new Set(dishes.map(d => d.location_id))];
  const requiredLocations = locations.filter(l => requiredLocationIds.includes(l.id));
  console.log(`Need to migrate ${requiredLocations.length} restaurants`);
  
  for (const location of requiredLocations) {
    const { error } = await supabase
      .from('restaurants')
      .upsert({
        id: location.id,
        name: location.name,
        address_line1: location.address,
        phone: location.phone,
        url: location.website,
        created_at: new Date(location.created).toISOString(),
        updated_at: new Date(location.modified).toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Failed to migrate restaurant ${location.id}:`, error);
    } else {
      console.log(`✅ Migrated restaurant ${location.id}: ${location.name}`);
    }
  }
  
  // Step 3: Migrate dishes
  console.log('\n3️⃣ Migrating dishes...');
  for (const dish of dishes) {
    const { error } = await supabase
      .from('dishes')
      .upsert({
        id: dish.id,
        user_id: dish.user_id,
        name: dish.name,
        restaurant_id: dish.location_id, // Map location_id to restaurant_id
        disabled: dish.disabled === 1,
        vote_avg: dish.vote_avg,
        vote_count: dish.vote_count,
        last_review_date: dish.last_review_date !== '0000-00-00 00:00:00' ? new Date(dish.last_review_date).toISOString() : null,
        review_count: dish.review_count,
        dish_image_filepath: dish.dish_image_filepath,
        dish_image_created: dish.dish_image_created !== '0000-00-00 00:00:00' ? new Date(dish.dish_image_created).toISOString() : null,
        created_at: new Date(dish.created).toISOString(),
        updated_at: new Date(dish.modified).toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error(`❌ Failed to migrate dish ${dish.id}:`, error);
    } else {
      console.log(`✅ Migrated dish ${dish.id}: "${dish.name}"`);
    }
  }
  
  // Step 4: Process dish images
  console.log('\n4️⃣ Processing dish images...');
  const imagesByDish = {};
  let imageProcessed = 0;
  let imageSkipped = 0;
  let imageErrors = 0;
  
  // Process direct dish image paths
  for (const dish of dishes) {
    if (dish.dish_image_filepath && dish.dish_image_filepath !== '') {
      try {
        console.log(`\n📷 Processing direct image for dish ${dish.id}: "${dish.name}"`);
        console.log(`   Image path: ${dish.dish_image_filepath}`);
        
        // Extract filename from path
        const filename = dish.dish_image_filepath.split('/').pop();
        const filePath = findImageFile(filename);
        
        if (!filePath) {
          console.log(`⚠️  Image file not found: ${filename}`);
          imageSkipped++;
          continue;
        }
        
        console.log(`📂 Found image at: ${filePath}`);
        
        // Upload to Vercel Blob
        const blobUrl = await uploadToBlob(filePath, filename);
        
        // Insert into dish_images table
        const stat = statSync(filePath);
        const { data: imageRecord, error } = await supabase
          .from('dish_images')
          .insert({
            dish_id: dish.id,
            review_id: null,
            blob_url: blobUrl,
            original_filename: filename,
            content_type: getContentType(filename),
            file_size: stat.size,
            description: filename,
            created_at: dish.dish_image_created !== '0000-00-00 00:00:00' ? new Date(dish.dish_image_created).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.error(`❌ Failed to insert image record:`, error);
          imageErrors++;
        } else {
          console.log(`✅ Inserted image record with ID: ${imageRecord.id}`);
          if (!imagesByDish[dish.id]) imagesByDish[dish.id] = [];
          imagesByDish[dish.id].push(imageRecord);
          imageProcessed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing image for dish ${dish.id}:`, error.message);
        imageErrors++;
      }
    }
  }
  
  // Process dish_images records
  for (const dishImage of dishImages) {
    try {
      console.log(`\n📷 Processing dish_image record ${dishImage.id} for dish ${dishImage.dish_id}`);
      console.log(`   Filename: ${dishImage.description}`);
      
      const filePath = findImageFile(dishImage.description);
      
      if (!filePath) {
        console.log(`⚠️  Image file not found: ${dishImage.description}`);
        imageSkipped++;
        continue;
      }
      
      console.log(`📂 Found image at: ${filePath}`);
      
      // Upload to Vercel Blob
      const blobUrl = await uploadToBlob(filePath, dishImage.description);
      
      // Insert into dish_images table
      const stat = statSync(filePath);
      const { data: imageRecord, error } = await supabase
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
        imageErrors++;
      } else {
        console.log(`✅ Inserted image record with ID: ${imageRecord.id}`);
        if (!imagesByDish[dishImage.dish_id]) imagesByDish[dishImage.dish_id] = [];
        imagesByDish[dishImage.dish_id].push(imageRecord);
        imageProcessed++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error processing dish_image ${dishImage.id}:`, error.message);
      imageErrors++;
    }
  }
  
  // Step 5: Set canonical images
  console.log('\n5️⃣ Setting canonical images...');
  for (const [dishId, images] of Object.entries(imagesByDish)) {
    if (images.length > 0) {
      const { error } = await supabase
        .from('dishes')
        .update({ canonical_image_id: images[0].id })
        .eq('id', parseInt(dishId));
      
      if (error) {
        console.error(`❌ Failed to set canonical image for dish ${dishId}:`, error);
      } else {
        console.log(`✅ Set canonical image for dish ${dishId}`);
      }
    }
  }
  
  console.log('\n🎉 Test migration completed!');
  console.log(`✅ Images processed: ${imageProcessed}`);
  console.log(`⚠️  Images skipped: ${imageSkipped}`);
  console.log(`❌ Image errors: ${imageErrors}`);
  console.log(`📊 Dishes with images: ${Object.keys(imagesByDish).length}`);
  
  console.log('\n📋 Final summary:');
  for (const [dishId, images] of Object.entries(imagesByDish)) {
    const dish = dishes.find(d => d.id === parseInt(dishId));
    console.log(`   Dish ${dishId} (${dish.name}): ${images.length} images`);
  }
}

// Run the migration
main().catch(console.error);