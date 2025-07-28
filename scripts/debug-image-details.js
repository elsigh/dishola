import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkImageDetails() {
  console.log('🔍 Checking all dish_images in database:');
  
  const { data: images } = await supabase
    .from('dish_images')
    .select('id, dish_id, original_filename, blob_url, description, dishes!dish_images_dish_id_fkey(name)')
    .order('dish_id, id');
  
  console.log(`Found ${images.length} total images`);
  
  const imagesByDish = {};
  images.forEach(img => {
    if (!imagesByDish[img.dish_id]) {
      imagesByDish[img.dish_id] = [];
    }
    imagesByDish[img.dish_id].push(img);
  });
  
  Object.entries(imagesByDish).forEach(([dishId, dishImages]) => {
    const dishName = dishImages[0].dishes?.name || 'Unknown';
    console.log(`\nDish ${dishId} (${dishName}): ${dishImages.length} images`);
    dishImages.forEach((img, index) => {
      console.log(`  ${index + 1}. ${img.original_filename}`);
      console.log(`     Description: ${img.description}`);
      console.log(`     Blob URL: ${img.blob_url.substring(0, 50)}...`);
    });
  });
  
  // Check which dishes have image filepaths
  console.log('\n🔍 Checking dishes with dish_image_filepath:');
  const { data: dishesWithImages } = await supabase
    .from('dishes')
    .select('id, name, dish_image_filepath')
    .not('dish_image_filepath', 'is', null)
    .neq('dish_image_filepath', '');
  
  console.log(`Found ${dishesWithImages.length} dishes with direct image filepaths:`);
  dishesWithImages.forEach(dish => {
    console.log(`  Dish ${dish.id}: ${dish.name}`);
    console.log(`    Image path: ${dish.dish_image_filepath}`);
  });
}

checkImageDetails().catch(console.error);