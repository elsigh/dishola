import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDataIntegrity() {
  console.log('🔍 Checking dish-restaurant data integrity...\n');
  
  // Get all restaurants
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name')
    .order('id');
  
  console.log(`Current restaurants in database (${restaurants.length} total):`);
  restaurants.forEach(r => console.log(`  ID ${r.id}: ${r.name}`));
  
  // Get dishes with restaurant info, focusing on the problematic ones
  const problematicDishes = [71, 74, 86];
  
  for (const dishId of problematicDishes) {
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, name, restaurant_id, restaurants(name)')
      .eq('id', dishId);
    
    if (dishes && dishes.length > 0) {
      const dish = dishes[0];
      console.log(`\n🚨 PROBLEMATIC DISH ${dish.id}:`);
      console.log(`   Dish Name: ${dish.name}`);
      console.log(`   Restaurant ID: ${dish.restaurant_id}`);
      console.log(`   Restaurant Name: ${dish.restaurants?.name || 'NOT FOUND'}`);
    }
  }
  
  // Check if we have the right number of restaurants vs dishes
  const { data: allDishes } = await supabase
    .from('dishes')
    .select('restaurant_id')
    .order('restaurant_id');
  
  const uniqueRestaurantIds = [...new Set(allDishes.map(d => d.restaurant_id))];
  const existingRestaurantIds = new Set(restaurants.map(r => r.id));
  
  console.log(`\n📊 Summary:`);
  console.log(`• Total dishes: ${allDishes.length}`);
  console.log(`• Dishes reference ${uniqueRestaurantIds.length} unique restaurant IDs`);
  console.log(`• Only ${restaurants.length} restaurants actually exist`);
  console.log(`• Missing restaurant IDs: ${uniqueRestaurantIds.filter(id => !existingRestaurantIds.has(id)).length}`);
}

checkDataIntegrity().catch(console.error);