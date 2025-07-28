import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Force fresh count without cache
const { count: actualDishCount } = await supabase
  .from('dishes')
  .select('*', { count: 'exact', head: true });

const { count: actualImageCount } = await supabase
  .from('dish_images')
  .select('*', { count: 'exact', head: true });

const { count: actualUserCount } = await supabase
  .from('users')
  .select('*', { count: 'exact', head: true });

const { count: actualRestaurantCount } = await supabase
  .from('restaurants')
  .select('*', { count: 'exact', head: true });

console.log('🔍 ACTUAL Migration Results (Force Refresh):');
console.log(`✅ Total dishes: ${actualDishCount}`);
console.log(`🖼️  Total images: ${actualImageCount}`);
console.log(`👥 Total users: ${actualUserCount}`);
console.log(`🏪 Total restaurants: ${actualRestaurantCount}`);

console.log('\n🔄 Status vs Production:');
console.log('📈 Production total: 3,616 dishes');
console.log(`📊 Migrated: ${actualDishCount} dishes (${Math.round((actualDishCount / 3616) * 100)}%)`);
console.log(`📋 Remaining: ${3616 - actualDishCount} dishes`);