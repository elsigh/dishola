import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Get total counts
const { data: dishes } = await supabase.from('dishes').select('id');
const { data: images } = await supabase.from('dish_images').select('id');  
const { data: users } = await supabase.from('users').select('id');
const { data: restaurants } = await supabase.from('restaurants').select('id');

const dishCount = dishes?.length || 0;
const imageCount = images?.length || 0;
const userCount = users?.length || 0;
const restaurantCount = restaurants?.length || 0;

console.log('📊 Migration Results Summary:');
console.log(`✅ Total dishes: ${dishCount}`);
console.log(`🖼️  Total images: ${imageCount}`);
console.log(`👥 Total users: ${userCount}`);
console.log(`🏪 Total restaurants: ${restaurantCount}`);

// Get dishes with images count
const { data: dishesWithImages } = await supabase
  .from('dishes')
  .select('id')
  .not('canonical_image_id', 'is', null);

console.log(`📷 Dishes with canonical images: ${dishesWithImages?.length || 0}`);

// Check remaining to migrate
console.log('\n🔄 Status vs Production:');
console.log('📈 Production total: 3,616 dishes');
console.log(`📊 Migrated: ${dishCount} dishes (${Math.round((dishCount / 3616) * 100)}%)`);
console.log(`📋 Remaining: ${3616 - dishCount} dishes`);