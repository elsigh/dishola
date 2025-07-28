import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  console.log('🔍 Checking Supabase table schemas...\n');
  
  console.log('1️⃣ Users table structure:');
  const { data: users } = await supabase.from('users').select('*').limit(1);
  if (users && users.length > 0) {
    console.log('Sample user fields:', Object.keys(users[0]));
    console.log('Sample user data:', users[0]);
  } else {
    console.log('No users found or table does not exist');
  }
  
  console.log('\n2️⃣ Restaurant_locations table structure:');
  try {
    const { data: locations, error } = await supabase.from('restaurant_locations').select('*').limit(1);
    if (error) {
      console.log('Error:', error.message);
    } else if (locations && locations.length > 0) {
      console.log('Sample location fields:', Object.keys(locations[0]));
      console.log('Sample location data:', locations[0]);
    } else {
      console.log('No restaurant_locations found - table exists but empty');
    }
  } catch (err) {
    console.log('Table may not exist:', err.message);
  }
  
  console.log('\n3️⃣ Dishes table structure:');
  const { data: dishes } = await supabase.from('dishes').select('*').limit(1);
  if (dishes && dishes.length > 0) {
    console.log('Sample dish fields:', Object.keys(dishes[0]));
  } else {
    console.log('No dishes found');
  }
}

checkSchema().catch(console.error);