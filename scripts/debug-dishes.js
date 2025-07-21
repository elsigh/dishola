import { readFileSync } from 'fs';
import { join } from 'path';

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
      dish_id: parseInt(values[1])
    });
  }
}

// Count images for dishes 1-54
const existingDishIds = new Set([1, 2, 3, 9, 15, 16, 17, 21, 38, 39, 40, 41, 42, 43, 44, 45, 50, 51, 52, 53, 54]);
const validImages = dishImages.filter(img => existingDishIds.has(img.dish_id));
const dishCounts = {};

validImages.forEach(img => {
  dishCounts[img.dish_id] = (dishCounts[img.dish_id] || 0) + 1;
});

console.log('Images per existing dish:');
Object.entries(dishCounts).sort((a, b) => parseInt(a[0]) - parseInt(b[0])).forEach(([dishId, count]) => {
  console.log(`  Dish ${dishId}: ${count} images`);
});
console.log(`Total images for existing dishes: ${validImages.length}`);