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
  maxDishes: 10000, // Remove safety limits
  maxImages: 50000,
  skipExisting: process.env.SKIP_EXISTING !== 'false'
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Safe timestamp parsing - handles invalid dates gracefully
 */
function safeTimestamp(timestamp) {
  if (!timestamp || timestamp === 'NULL' || timestamp === '0000-00-00 00:00:00') {
    return new Date().toISOString();
  }
  
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
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
 * Parse users from production SQL with robust error handling
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
      const username = values[2]?.replace(/^'|'$/g, '') || `user_${values[0]}`;
      const email = values[1]?.replace(/^'|'$/g, '') || `user_${values[0]}@example.com`;
      
      // Skip users with problematic data but be more permissive
      if (username && username !== 'NULL' && username.trim() !== '') {
        users.push({
          id: parseInt(values[0]),
          email: email,
          username: username,
          first_name: values[3]?.replace(/^'|'$/g, '') || '',
          last_name: values[4]?.replace(/^'|'$/g, '') || '',
          created: values[8]?.replace(/^'|'$/g, '') || '',
          modified: values[9]?.replace(/^'|'$/g, '') || ''
        });
      }
    }
  }
  
  console.log(`✅ Found ${users.length} valid users`);
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
      // Handle empty names - many restaurants have empty name fields
      let name = values[2]?.replace(/^'|'$/g, '') || '';
      if (!name || name === 'NULL') {
        name = `Restaurant ${values[0]}`;
      }
      
      locations.push({
        id: parseInt(values[0]),
        user_id: parseInt(values[1]) || 1, // Default user if missing
        name: name,
        address: values[3]?.replace(/^'|'$/g, '') || '',
        phone: values[4]?.replace(/^'|'$/g, '') || '',
        website: values[5]?.replace(/^'|'$/g, '') || '',
        created: values[6]?.replace(/^'|'$/g, '') || '',
        modified: values[7]?.replace(/^'|'$/g, '') || ''
      });
    }
  }
  
  console.log(`✅ Found ${locations.length} restaurant_locations`);
  return locations;
}

/**
 * Parse ALL dishes from production SQL
 */
function parseDishesFromSql() {
  console.log('📖 Parsing ALL dishes from production SQL...');
  
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
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 20) {
      const dishName = values[2]?.replace(/^'|'$/g, '') || `Dish ${values[0]}`;
      
      dishes.push({
        id: parseInt(values[0]),
        user_id: parseInt(values[1]) || 1, // Default user if missing
        name: dishName,
        location_id: parseInt(values[3]) || 1, // Default location if missing
        disabled: parseInt(values[4]) || 0,
        created: values[5]?.replace(/^'|'$/g, '') || '',
        modified: values[6]?.replace(/^'|'$/g, '') || '',
        vote_avg: parseFloat(values[7]) || 0,
        vote_count: parseInt(values[8]) || 0,
        members_vote_avg: parseFloat(values[9]) || 0,
        members_vote_count: parseInt(values[10]) || 0,
        industry_vote_avg: parseFloat(values[11]) || 0,
        industry_vote_count: parseInt(values[12]) || 0,
        critics_vote_avg: parseFloat(values[13]) || 0,
        critics_vote_count: parseInt(values[14]) || 0,
        last_review_date: values[15]?.replace(/^'|'$/g, '') || '',
        review_count: parseInt(values[16]) || 0,
        is_divine: parseInt(values[17]) || 0,
        dish_image_filepath: values[18]?.replace(/^'|'$/g, '') || '',
        dish_image_created: values[19]?.replace(/^'|'$/g, '') || ''
      });
    }
  }
  
  console.log(`✅ Found ${dishes.length} total dishes`);
  return dishes;
}

/**
 * Parse dish_images from production SQL  
 */
function parseDishImagesFromSql() {
  console.log('📖 Parsing dish_images from production SQL...');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  const insertMatch = sqlContent.match(/INSERT INTO `dish_images` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find dish_images INSERT statement');
    return [];
  }
  
  const valuesString = insertMatch[1];
  const dishImages = [];
  
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 7) {
      dishImages.push({
        id: parseInt(values[0]),
        dish_id: parseInt(values[1]),
        image_id: parseInt(values[2]),
        original_image_id: parseInt(values[3]),
        description: values[4]?.replace(/^'|'$/g, '') || '',
        created: values[5]?.replace(/^'|'$/g, '') || '',
        modified: values[6]?.replace(/^'|'$/g, '') || ''
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
async function insertImageRecord(dishId, blobUrl, originalFilename, filePath, sourceType = 'filepath') {
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
      description: `${originalFilename} (${sourceType})`,
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
  
  if (!dish?.canonical_image_id) {
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
  console.log('🚀 Starting ROBUST dish migration...');
  console.log(`📁 Imgstore directory: ${config.imgstoreDir}`);
  console.log(`🔄 Dry run: ${config.dryRun}`);
  console.log(`🚫 Max dishes limit: ${config.maxDishes}`);
  console.log(`🚫 Max images limit: ${config.maxImages}`);
  console.log(`↩️  Skip existing dishes: ${config.skipExisting}`);
  
  // Get existing dishes from Supabase to avoid duplicates
  const { data: existingDishes } = await supabase
    .from('dishes')
    .select('id');
  const existingDishIds = new Set(existingDishes?.map(d => d.id) || []);
  console.log(`📊 Found ${existingDishIds.size} existing dishes in database`);
  
  // Parse data from production SQL
  const users = parseUsersFromSql();
  const locations = parseRestaurantLocationsFromSql();
  const allDishes = parseDishesFromSql();
  const dishImages = parseDishImagesFromSql();
  
  // Filter dishes to migrate
  let dishesToMigrate = allDishes;
  if (config.skipExisting) {
    dishesToMigrate = allDishes.filter(dish => !existingDishIds.has(dish.id));
    console.log(`📊 After filtering existing: ${dishesToMigrate.length} dishes to migrate`);
  }
  
  // Apply safety limit
  if (dishesToMigrate.length > config.maxDishes) {
    dishesToMigrate = dishesToMigrate.slice(0, config.maxDishes);
    console.log(`⚠️  Processing only first ${config.maxDishes} dishes for safety`);
  }
  
  console.log(`\n📋 Migration scope:`);
  console.log(`• ${dishesToMigrate.length} dishes to migrate`);
  console.log(`• ${dishesToMigrate.filter(d => d.dish_image_filepath && d.dish_image_filepath !== '').length} dishes with direct image paths`);
  
  // Filter dish_images for dishes we're migrating
  const relevantDishImages = dishImages.filter(img => 
    dishesToMigrate.some(dish => dish.id === img.dish_id)
  );
  console.log(`• ${relevantDishImages.length} additional dish_images records`);
  
  if (config.dryRun) {
    console.log('\n[DRY RUN] Migration would proceed with:');
    console.log('1. Migrate required users and restaurants');
    console.log('2. Migrate dishes to Supabase');
    console.log('3. Find and upload images to Vercel Blob');
    console.log('4. Create dish_images records in Supabase');
    console.log('5. Set canonical images');
    return;
  }
  
  // Step 0: Ensure we have default user and restaurant for foreign key fallbacks
  console.log('\n0️⃣ Ensuring default user and restaurant exist...');
  
  // Create default user if it doesn't exist
  try {
    await supabase
      .from('users')
      .upsert({
        id: 1,
        name: 'system',
        realname: 'System User',
        email: 'system@dishola.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id', ignoreDuplicates: false });
    console.log('✅ Default user ensured');
  } catch (error) {
    console.log('⚠️  Default user might already exist:', error.message);
  }

  // Create default restaurant if it doesn't exist
  try {
    await supabase
      .from('restaurants')
      .upsert({
        id: 1,
        name: 'Default Restaurant',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id', ignoreDuplicates: false });
    console.log('✅ Default restaurant ensured');
  } catch (error) {
    console.log('⚠️  Default restaurant might already exist:', error.message);
  }

  // Step 1: Migrate required users (only ones we need) with ROBUST error handling
  console.log('\n1️⃣ Migrating required users with robust error handling...');
  const requiredUserIds = [...new Set([
    ...dishesToMigrate.map(d => d.user_id),
    ...locations.map(l => l.user_id)
  ])];
  const requiredUsers = users.filter(u => requiredUserIds.includes(u.id));
  console.log(`Need to migrate ${requiredUsers.length} users`);
  
  let usersMigrated = 0;
  let usersSkipped = 0;
  for (const user of requiredUsers) {
    try {
      const userData = {
        id: user.id,
        name: user.username || `user_${user.id}`, // Handle missing usernames
        realname: `${user.first_name} ${user.last_name}`.trim() || user.username || `User ${user.id}`,
        email: user.email || `user_${user.id}@placeholder.com`,
        created_at: safeTimestamp(user.created),
        updated_at: safeTimestamp(user.modified)
      };
      
      // Use UPSERT with ON CONFLICT DO UPDATE to handle duplicates gracefully
      const { error } = await supabase
        .from('users')
        .upsert(userData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.log(`⚠️  Skipped user ${user.id}: ${error.message}`);
        usersSkipped++;
      } else {
        usersMigrated++;
        if (usersMigrated % 100 === 0) {
          console.log(`  Migrated ${usersMigrated}/${requiredUsers.length} users...`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error with user ${user.id}: ${error.message}`);
      usersSkipped++;
    }
  }
  console.log(`✅ Users migrated: ${usersMigrated}, skipped: ${usersSkipped}`);
  
  // Step 2: Migrate required restaurants with ROBUST error handling
  console.log('\n2️⃣ Migrating required restaurants with robust error handling...');
  const requiredLocationIds = [...new Set(dishesToMigrate.map(d => d.location_id))];
  const requiredLocations = locations.filter(l => requiredLocationIds.includes(l.id));
  console.log(`Need to migrate ${requiredLocations.length} restaurants`);
  
  let restaurantsMigrated = 0;
  let restaurantsSkipped = 0;
  for (const location of requiredLocations) {
    try {
      const restaurantData = {
        id: location.id,
        name: location.name || `Restaurant ${location.id}`,
        address_line1: location.address || '',
        phone: location.phone || '',
        url: location.website || '',
        created_at: safeTimestamp(location.created),
        updated_at: safeTimestamp(location.modified)
      };
      
      const { error } = await supabase
        .from('restaurants')
        .upsert(restaurantData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.log(`⚠️  Skipped restaurant ${location.id}: ${error.message}`);
        restaurantsSkipped++;
      } else {
        restaurantsMigrated++;
        if (restaurantsMigrated % 100 === 0) {
          console.log(`  Migrated ${restaurantsMigrated}/${requiredLocations.length} restaurants...`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error with restaurant ${location.id}: ${error.message}`);
      restaurantsSkipped++;
    }
  }
  console.log(`✅ Restaurants migrated: ${restaurantsMigrated}, skipped: ${restaurantsSkipped}`);
  
  // Step 3: Migrate dishes with ROBUST error handling
  console.log('\n3️⃣ Migrating dishes with robust error handling...');
  let dishesMigrated = 0;
  let dishesSkipped = 0;
  for (const dish of dishesToMigrate) {
    try {
      const dishData = {
        id: dish.id,
        user_id: dish.user_id || 1, // Default to user 1 if missing
        name: dish.name || `Dish ${dish.id}`,
        restaurant_id: dish.location_id || 1, // Default to restaurant 1 if missing
        disabled: dish.disabled === 1,
        vote_avg: dish.vote_avg || 0,
        vote_count: dish.vote_count || 0,
        last_review_date: dish.last_review_date && dish.last_review_date !== '0000-00-00 00:00:00' ? safeTimestamp(dish.last_review_date) : null,
        review_count: dish.review_count || 0,
        dish_image_filepath: dish.dish_image_filepath || '',
        dish_image_created: dish.dish_image_created && dish.dish_image_created !== '0000-00-00 00:00:00' ? safeTimestamp(dish.dish_image_created) : null,
        created_at: safeTimestamp(dish.created),
        updated_at: safeTimestamp(dish.modified)
      };
      
      const { error } = await supabase
        .from('dishes')
        .upsert(dishData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.log(`⚠️  Skipped dish ${dish.id}: ${error.message}`);
        dishesSkipped++;
      } else {
        dishesMigrated++;
        if (dishesMigrated % 500 === 0) {
          console.log(`  Migrated ${dishesMigrated}/${dishesToMigrate.length} dishes...`);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error with dish ${dish.id}: ${error.message}`);
      dishesSkipped++;
    }
  }
  console.log(`✅ Dishes migrated: ${dishesMigrated}, skipped: ${dishesSkipped}`);
  
  // Step 4: Process images (with combined approach to avoid duplicates)
  console.log('\n4️⃣ Processing dish images...');
  
  // Collect all image sources and deduplicate
  const imageJobs = new Map(); // filename -> {dishId, source, ...}
  
  // Add images from dish_image_filepath
  for (const dish of dishesToMigrate) {
    if (dish.dish_image_filepath && dish.dish_image_filepath !== '') {
      const filename = dish.dish_image_filepath.split('/').pop();
      if (!imageJobs.has(filename)) {
        imageJobs.set(filename, {
          dishId: dish.id,
          filename: filename,
          source: 'filepath',
          path: dish.dish_image_filepath,
          created: dish.dish_image_created
        });
      }
    }
  }
  
  // Add images from dish_images table (but avoid duplicates)
  for (const dishImage of relevantDishImages) {
    const filename = dishImage.description;
    if (filename && !imageJobs.has(filename)) {
      imageJobs.set(filename, {
        dishId: dishImage.dish_id,
        filename: filename,
        source: 'dish_images',
        created: dishImage.created
      });
    }
  }
  
  console.log(`Found ${imageJobs.size} unique images to process`);
  
  // Apply image safety limit
  const imageJobsArray = Array.from(imageJobs.values());
  const imagesToProcess = imageJobsArray.slice(0, config.maxImages);
  if (imagesToProcess.length < imageJobsArray.length) {
    console.log(`⚠️  Processing only first ${config.maxImages} images for safety`);
  }
  
  const imagesByDish = {};
  let imagesProcessed = 0;
  let imagesSkipped = 0;
  let imageErrors = 0;
  
  for (const imageJob of imagesToProcess) {
    try {
      console.log(`\n📷 Processing image ${imagesProcessed + imagesSkipped + imageErrors + 1}/${imagesToProcess.length}`);
      console.log(`   Dish ID: ${imageJob.dishId}, File: ${imageJob.filename}, Source: ${imageJob.source}`);
      
      // Find the image file
      const filePath = findImageFile(imageJob.filename);
      if (!filePath) {
        console.log(`⚠️  Image file not found: ${imageJob.filename}`);
        imagesSkipped++;
        continue;
      }
      
      console.log(`📂 Found image at: ${filePath}`);
      
      // Upload to Vercel Blob
      const blobUrl = await uploadToBlob(filePath, imageJob.filename);
      
      // Insert into Supabase
      const imageRecord = await insertImageRecord(imageJob.dishId, blobUrl, imageJob.filename, filePath, imageJob.source);
      
      // Track for canonical image setting
      if (!imagesByDish[imageJob.dishId]) {
        imagesByDish[imageJob.dishId] = [];
      }
      imagesByDish[imageJob.dishId].push(imageRecord);
      
      imagesProcessed++;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error(`❌ Error processing image ${imageJob.filename}:`, error.message);
      imageErrors++;
    }
  }
  
  // Step 5: Set canonical images
  console.log('\n5️⃣ Setting canonical images...');
  let canonicalSet = 0;
  for (const [dishId, images] of Object.entries(imagesByDish)) {
    if (images.length > 0) {
      try {
        await updateCanonicalImage(parseInt(dishId), images[0].id);
        canonicalSet++;
      } catch (error) {
        console.log(`⚠️  Could not set canonical image for dish ${dishId}: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎉 Robust migration completed!');
  console.log(`✅ Users migrated: ${usersMigrated}`);
  console.log(`✅ Restaurants migrated: ${restaurantsMigrated}`);
  console.log(`✅ Dishes migrated: ${dishesMigrated}`);
  console.log(`✅ Images processed: ${imagesProcessed}`);
  console.log(`⚠️  Images skipped: ${imagesSkipped}`);
  console.log(`❌ Image errors: ${imageErrors}`);
  console.log(`📊 Dishes with images: ${Object.keys(imagesByDish).length}`);
  console.log(`🖼️  Canonical images set: ${canonicalSet}`);
}

// Run the migration
main().catch(console.error);