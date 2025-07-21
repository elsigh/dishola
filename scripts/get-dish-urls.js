import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from API directory
dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getDishUrls() {
  // Get dishes with image counts
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name, canonical_image_id')
    .not('canonical_image_id', 'is', null)
    .order('id');
  
  // Get image counts per dish
  const { data: imageCounts } = await supabase
    .from('dish_images')
    .select('dish_id')
    .order('dish_id');
  
  // Count images per dish
  const countsByDish = {};
  if (imageCounts) {
    imageCounts.forEach(img => {
      const dishId = img.dish_id;
      countsByDish[dishId] = (countsByDish[dishId] || 0) + 1;
    });
  }
  
  // Create dish list with counts
  const dishesWithCounts = dishes.map(dish => ({
    id: dish.id,
    name: dish.name,
    imageCount: countsByDish[dish.id] || 0
  }));
  
  // Sort by image count descending
  dishesWithCounts.sort((a, b) => b.imageCount - a.imageCount);
  
  // Output URLs
  console.log('Dish URLs ordered by number of images (descending):');
  dishesWithCounts.forEach((dish, index) => {
    console.log(`${index + 1}. http://localhost:3000/dish/${dish.id} - ${dish.imageCount} images`);
  });
}

getDishUrls().catch(console.error);