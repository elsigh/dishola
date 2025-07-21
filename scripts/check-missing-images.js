import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Parse the dish_images from production SQL
const sqlContent = readFileSync('../dishola_production.sql', 'utf8');
const insertMatch = sqlContent.match(/INSERT INTO `dish_images` VALUES\s+(.*?);/s);
const valuesString = insertMatch[1];
const dishImages = [];

const valuesRegex = /\(([^)]+)\)/g;
let match;

while ((match = valuesRegex.exec(valuesString)) !== null) {
  const valuesStr = match[1];
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
      dish_id: parseInt(values[1]),
      description: values[4].replace(/^'|'$/g, '')
    });
  }
}

// Filter for existing dishes
const existingDishIds = new Set([1, 2, 3, 9, 15, 16, 17, 21, 38, 39, 40, 41, 42, 43, 44, 45, 50, 51, 52, 53, 54]);
const validImages = dishImages.filter(img => existingDishIds.has(img.dish_id));

console.log('Images for existing dishes:');
validImages.forEach(img => {
  console.log(`  Dish ${img.dish_id}: ${img.description}`);
});

// Check which files exist
function findImageFile(filename) {
  const imgstoreDir = '../imgstore';
  
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

console.log('\nChecking which files exist:');
validImages.forEach(img => {
  const found = findImageFile(img.description);
  console.log(`  ${img.description}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});