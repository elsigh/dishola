import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dish } = await supabase
  .from('dishes')
  .select('id, name, restaurant_id, restaurants(name)')
  .eq('id', 86)
  .single();

console.log(`Dish 86: "${dish.name}" → ${dish.restaurants?.name} (ID: ${dish.restaurant_id})`);