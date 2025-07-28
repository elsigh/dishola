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
  batchSize: 500 // Process 500 dishes at a time
};

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

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

function parseDishesFromSql() {
  console.log('📖 Parsing dishes from production SQL...');
  
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
        user_id: parseInt(values[1]) || 1,
        name: dishName,
        location_id: parseInt(values[3]) || 1,
        disabled: parseInt(values[4]) || 0,
        created: values[5]?.replace(/^'|'$/g, '') || '',
        modified: values[6]?.replace(/^'|'$/g, '') || '',
        vote_avg: parseFloat(values[7]) || 0,
        vote_count: parseInt(values[8]) || 0,
        last_review_date: values[15]?.replace(/^'|'$/g, '') || '',
        review_count: parseInt(values[16]) || 0,
        dish_image_filepath: values[18]?.replace(/^'|'$/g, '') || '',
        dish_image_created: values[19]?.replace(/^'|'$/g, '') || ''
      });
    }
  }
  
  console.log(`✅ Found ${dishes.length} total dishes`);
  return dishes;
}

async function main() {
  console.log('🚀 Starting focused dish-only migration...');
  
  // Get existing dishes
  const { data: existingDishes } = await supabase
    .from('dishes')
    .select('id');
  const existingDishIds = new Set(existingDishes?.map(d => d.id) || []);
  console.log(`📊 Found ${existingDishIds.size} existing dishes in database`);
  
  const allDishes = parseDishesFromSql();
  const dishesToMigrate = allDishes.filter(dish => !existingDishIds.has(dish.id));
  
  console.log(`📊 Need to migrate ${dishesToMigrate.length} dishes`);
  
  if (dishesToMigrate.length === 0) {
    console.log('✅ All dishes already migrated!');
    return;
  }
  
  // Process in batches
  let totalMigrated = 0;
  let totalSkipped = 0;
  
  for (let i = 0; i < dishesToMigrate.length; i += config.batchSize) {
    const batch = dishesToMigrate.slice(i, i + config.batchSize);
    console.log(`\n📦 Processing batch ${Math.floor(i / config.batchSize) + 1}/${Math.ceil(dishesToMigrate.length / config.batchSize)} (${batch.length} dishes)`);
    
    let batchMigrated = 0;
    let batchSkipped = 0;
    
    for (const dish of batch) {
      try {
        const dishData = {
          id: dish.id,
          user_id: dish.user_id,
          name: dish.name,
          restaurant_id: dish.location_id,
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
          batchSkipped++;
        } else {
          batchMigrated++;
        }
      } catch (error) {
        console.log(`⚠️  Error with dish ${dish.id}: ${error.message}`);
        batchSkipped++;
      }
    }
    
    totalMigrated += batchMigrated;
    totalSkipped += batchSkipped;
    
    console.log(`✅ Batch completed: ${batchMigrated} migrated, ${batchSkipped} skipped`);
    console.log(`📊 Total progress: ${totalMigrated}/${dishesToMigrate.length} (${Math.round((totalMigrated / dishesToMigrate.length) * 100)}%)`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n🎉 Dish migration completed!');
  console.log(`✅ Total dishes migrated: ${totalMigrated}`);
  console.log(`⚠️  Total dishes skipped: ${totalSkipped}`);
}

main().catch(console.error);