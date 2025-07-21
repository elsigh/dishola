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

async function checkMigrationResults() {
  // Count total images
  const { count: totalImages } = await supabase
    .from('dish_images')
    .select('*', { count: 'exact', head: true });
  
  // Count dishes with images
  const { data: dishesWithImages } = await supabase
    .from('dishes')
    .select('id, name, canonical_image_id')
    .not('canonical_image_id', 'is', null);
  
  // Get image counts per dish
  const { data: imageCounts, error: imageError } = await supabase
    .from('dish_images')
    .select('dish_id, dishes!dish_images_dish_id_fkey(name)')
    .order('dish_id');
  
  if (imageError) {
    console.error('Error fetching image counts:', imageError);
    return;
  }
  
  const countsByDish = {};
  if (imageCounts) {
    imageCounts.forEach(img => {
      const dishId = img.dish_id;
      const dishName = img.dishes?.name || 'Unknown';
      if (!countsByDish[dishId]) {
        countsByDish[dishId] = { name: dishName, count: 0 };
      }
      countsByDish[dishId].count++;
    });
  }
  
  console.log('🎉 Migration Results Summary:');
  console.log(`📊 Total images migrated: ${totalImages}`);
  console.log(`📊 Dishes with images: ${dishesWithImages.length}`);
  console.log(`📊 Dishes with canonical images: ${dishesWithImages.length}`);
  
  console.log('\n📋 Images per dish:');
  Object.entries(countsByDish)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([dishId, info]) => {
      console.log(`   ${info.name} (ID: ${dishId}): ${info.count} images`);
    });
}

checkMigrationResults().catch(console.error);