import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getNewDishUrls() {
  const { data: dishes } = await supabase
    .from('dishes')
    .select('id, name')
    .order('id');
  
  console.log(`🍽️  All ${dishes.length} migrated dishes:`);
  dishes.forEach((dish, index) => {
    console.log(`${index + 1}. http://localhost:3000/dish/${dish.id} - ${dish.name}`);
  });
}

getNewDishUrls().catch(console.error);