import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  productionSqlFile: join(__dirname, '../dishola_production.sql')
};

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

function debugProductionMappings() {
  console.log('🔍 Debugging production SQL mappings...\n');
  
  const sqlContent = readFileSync(config.productionSqlFile, 'utf8');
  
  // Get sample dish records to understand structure
  console.log('📖 Analyzing dishes table structure...');
  const dishInsertMatch = sqlContent.match(/INSERT INTO `dishes` VALUES\s+(.*?);/s);
  if (dishInsertMatch) {
    const valuesString = dishInsertMatch[1];
    const valuesRegex = /\(([^)]+)\)/g;
    let match;
    let count = 0;
    
    while ((match = valuesRegex.exec(valuesString)) !== null && count < 5) {
      const valuesStr = match[1];
      const values = parseValues(valuesStr);
      
      console.log(`Sample dish record ${count + 1}:`);
      console.log(`  Field count: ${values.length}`);
      console.log(`  ID: ${values[0]}`);
      console.log(`  User ID: ${values[1]}`);
      console.log(`  Name: ${values[2]?.replace(/^'|'$/g, '')}`);
      console.log(`  Location ID: ${values[3]}`);
      console.log(`  First 10 fields: ${values.slice(0, 10).join(', ')}`);
      console.log('');
      count++;
    }
  }
  
  // Get sample restaurant_locations records
  console.log('📖 Analyzing restaurant_locations table structure...');
  const locationInsertMatch = sqlContent.match(/INSERT INTO `restaurant_locations` VALUES\s+(.*?);/s);
  if (locationInsertMatch) {
    const valuesString = locationInsertMatch[1];
    const valuesRegex = /\(([^)]+)\)/g;
    let match;
    let count = 0;
    
    console.log('Sample restaurant_location records:');
    while ((match = valuesRegex.exec(valuesString)) !== null && count < 10) {
      const valuesStr = match[1];
      const values = parseValues(valuesStr);
      
      const locationId = parseInt(values[0]);
      const name = values[2]?.replace(/^'|'$/g, '');
      
      console.log(`  Location ID ${locationId}: ${name}`);
      count++;
    }
  }
  
  // Check for our problematic dishes specifically
  console.log('\n🔍 Looking for specific problematic dishes...');
  const problematicDishes = [71, 74, 86];
  
  for (const dishId of problematicDishes) {
    console.log(`\nSearching for dish ${dishId}:`);
    
    // Find dish record
    const dishMatch = sqlContent.match(new RegExp(`\\(${dishId},([^)]+)\\)`, 'g'));
    if (dishMatch) {
      const fullRecord = dishMatch[0];
      const values = parseValues(fullRecord.slice(1, -1)); // Remove parentheses
      
      console.log(`  Found: ${values[2]?.replace(/^'|'$/g, '')} (location_id: ${values[3]})`);
      
      // Now find that location
      const locationId = parseInt(values[3]);
      const locationMatch = sqlContent.match(new RegExp(`\\(${locationId},[^,]+,'([^']+)'`, 'g'));
      if (locationMatch) {
        console.log(`  Location: ${locationMatch[0].match(/'([^']+)'/)[1]}`);
      } else {
        console.log(`  Location ${locationId} not found in restaurant_locations`);
      }
    } else {
      console.log(`  Dish ${dishId} not found`);
    }
  }
  
  // Check what location IDs are actually in the range we care about
  console.log('\n📊 Location ID distribution analysis...');
  const locationIds = new Map(); // location_id -> count
  const dishLocationPairs = new Map(); // dish_id -> location_id
  
  if (dishInsertMatch) {
    const valuesString = dishInsertMatch[1];
    const valuesRegex = /\(([^)]+)\)/g;
    let match;
    
    while ((match = valuesRegex.exec(valuesString)) !== null) {
      const valuesStr = match[1];
      const values = parseValues(valuesStr);
      
      if (values.length >= 4) {
        const dishId = parseInt(values[0]);
        const locationId = parseInt(values[3]);
        
        dishLocationPairs.set(dishId, locationId);
        locationIds.set(locationId, (locationIds.get(locationId) || 0) + 1);
      }
    }
  }
  
  console.log(`Total dish-location pairs: ${dishLocationPairs.size}`);
  console.log(`Unique location IDs: ${locationIds.size}`);
  
  // Show location ID range
  const sortedLocationIds = Array.from(locationIds.keys()).sort((a, b) => a - b);
  console.log(`Location ID range: ${sortedLocationIds[0]} to ${sortedLocationIds[sortedLocationIds.length - 1]}`);
  
  // Show our specific dish mappings
  console.log('\nOur problematic dishes in production:');
  for (const dishId of problematicDishes) {
    const locationId = dishLocationPairs.get(dishId);
    console.log(`  Dish ${dishId} → Location ${locationId}`);
  }
}

debugProductionMappings();