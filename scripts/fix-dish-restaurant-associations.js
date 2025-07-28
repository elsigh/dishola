import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  productionSqlFile: join(__dirname, '../dishola_production.sql'),
  dryRun: process.env.DRY_RUN === 'true'
};

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

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
 * Parse dishes from production SQL to get correct dish-restaurant associations
 */
function parseDishesFromProduction() {
  console.log('📖 Parsing dishes from production SQL for correct associations...');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  const insertMatch = sqlContent.match(/INSERT INTO `dishes` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find dishes INSERT statement');
    return new Map();
  }
  
  const valuesString = insertMatch[1];
  const dishLocationMap = new Map(); // dish_id -> location_id
  
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 4) {
      const dishId = parseInt(values[0]);
      const locationId = parseInt(values[3]); // location_id is 4th field
      
      dishLocationMap.set(dishId, locationId);
    }
  }
  
  console.log(`✅ Found ${dishLocationMap.size} dish-location associations`);
  return dishLocationMap;
}

/**
 * Parse restaurant_locations from production SQL
 */
function parseRestaurantLocationsFromProduction() {
  console.log('📖 Parsing restaurant_locations from production SQL...');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  const insertMatch = sqlContent.match(/INSERT INTO `restaurant_locations` VALUES\s+(.*?);/s);
  if (!insertMatch) {
    console.error('❌ Could not find restaurant_locations INSERT statement');
    return new Map();
  }
  
  const valuesString = insertMatch[1];
  const locationNameMap = new Map(); // location_id -> name
  
  const valuesRegex = /\(([^)]+)\)/g;
  let match;
  
  while ((match = valuesRegex.exec(valuesString)) !== null) {
    const valuesStr = match[1];
    const values = parseValues(valuesStr);
    
    if (values.length >= 3) {
      const locationId = parseInt(values[0]);
      const name = values[2].replace(/^'|'$/g, '');
      
      locationNameMap.set(locationId, name);
    }
  }
  
  console.log(`✅ Found ${locationNameMap.size} location names`);
  return locationNameMap;
}

/**
 * Find or create restaurant by name
 */
async function findOrCreateRestaurant(locationId, locationName) {
  if (config.dryRun) {
    console.log(`[DRY RUN] Would find/create restaurant: ID ${locationId}, Name: ${locationName}`);
    return locationId;
  }
  
  // First try to find existing restaurant by name (case insensitive)
  const { data: existingRestaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .ilike('name', locationName)
    .single();
  
  if (existingRestaurant) {
    console.log(`   Found existing restaurant: ${existingRestaurant.name} (ID: ${existingRestaurant.id})`);
    return existingRestaurant.id;
  }
  
  // Restaurant doesn't exist, create it with the original location_id
  const { data: newRestaurant, error } = await supabase
    .from('restaurants')
    .insert({
      id: locationId,
      name: locationName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error(`❌ Failed to create restaurant ${locationName}:`, error.message);
    return null;
  }
  
  console.log(`   Created new restaurant: ${newRestaurant.name} (ID: ${newRestaurant.id})`);
  return newRestaurant.id;
}

async function fixDishRestaurantAssociations() {
  console.log('🔧 Fixing dish-restaurant associations...');
  console.log(`🔄 Dry run: ${config.dryRun}`);
  
  // Get production data
  const dishLocationMap = parseDishesFromProduction();
  const locationNameMap = parseRestaurantLocationsFromProduction();
  
  // Get current dishes from Supabase
  const { data: currentDishes } = await supabase
    .from('dishes')
    .select('id, name, restaurant_id, restaurants(name)')
    .order('id');
  
  console.log(`\n📊 Found ${currentDishes.length} dishes to check`);
  
  let fixed = 0;
  let created = 0;
  let errors = 0;
  let skipped = 0;
  
  for (const dish of currentDishes) {
    try {
      console.log(`\n🔍 Checking dish ${dish.id}: "${dish.name}"`);
      console.log(`   Currently assigned to: ${dish.restaurants?.name || 'UNKNOWN'} (ID: ${dish.restaurant_id})`);
      
      // Get correct location from production data
      const correctLocationId = dishLocationMap.get(dish.id);
      if (!correctLocationId) {
        console.log(`⚠️  No location found in production data for dish ${dish.id}`);
        skipped++;
        continue;
      }
      
      const correctLocationName = locationNameMap.get(correctLocationId);
      if (!correctLocationName) {
        console.log(`⚠️  No location name found for location ID ${correctLocationId}`);
        skipped++;
        continue;
      }
      
      console.log(`   Should be at: ${correctLocationName} (Location ID: ${correctLocationId})`);
      
      // Check if it's already correctly assigned
      if (dish.restaurants?.name && dish.restaurants.name.toLowerCase() === correctLocationName.toLowerCase()) {
        console.log(`✅ Already correct!`);
        continue;
      }
      
      // Find or create the correct restaurant
      const correctRestaurantId = await findOrCreateRestaurant(correctLocationId, correctLocationName);
      if (!correctRestaurantId) {
        errors++;
        continue;
      }
      
      // Update the dish's restaurant assignment
      if (!config.dryRun) {
        const { error } = await supabase
          .from('dishes')
          .update({ restaurant_id: correctRestaurantId })
          .eq('id', dish.id);
        
        if (error) {
          console.error(`❌ Failed to update dish ${dish.id}:`, error.message);
          errors++;
          continue;
        }
      }
      
      console.log(`✅ ${config.dryRun ? '[DRY RUN] Would fix' : 'Fixed'} dish ${dish.id} → ${correctLocationName}`);
      
      if (correctRestaurantId === correctLocationId) {
        created++;
      } else {
        fixed++;
      }
      
    } catch (error) {
      console.error(`❌ Error processing dish ${dish.id}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n🎉 Association fix completed!');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`🆕 Created restaurants: ${created}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
}

fixDishRestaurantAssociations().catch(console.error);