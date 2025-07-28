import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: restaurants } = await supabase
  .from('restaurants')
  .select('id, name')
  .in('id', [37, 39])
  .order('id');

console.log('Current restaurants for IDs 37 and 39:');
restaurants.forEach(r => console.log(`  ID ${r.id}: ${r.name}`));

// Also check dishes 71 and 74
const { data: dishes } = await supabase
  .from('dishes')
  .select('id, name, restaurant_id, restaurants(name)')
  .in('id', [71, 74]);

console.log('\nDishes 71 and 74 current associations:');
dishes.forEach(d => console.log(`  Dish ${d.id}: "${d.name}" → ${d.restaurants?.name} (ID: ${d.restaurant_id})`));