import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const config = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  dryRun: process.env.DRY_RUN === 'true'
};

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

async function fixRestaurantNames() {
  console.log('🔧 Fixing restaurant names and associations...');
  console.log(`🔄 Dry run: ${config.dryRun}`);
  
  try {
    // Step 1: Update restaurant ID 37 to be "Pho 79" (Vietnamese)
    console.log('\n1️⃣ Updating restaurant ID 37 to "Pho 79"...');
    if (!config.dryRun) {
      const { error: updateError37 } = await supabase
        .from('restaurants')
        .update({ name: 'Pho 79' })
        .eq('id', 37);
      
      if (updateError37) {
        console.error('❌ Failed to update restaurant 37:', updateError37.message);
      } else {
        console.log('✅ Updated restaurant 37 to "Pho 79"');
      }
    } else {
      console.log('[DRY RUN] Would update restaurant 37 to "Pho 79"');
    }
    
    // Step 2: Update restaurant ID 39 to be "Tam Deli & Cafe" (Asian)
    console.log('\n2️⃣ Updating restaurant ID 39 to "Tam Deli & Cafe"...');
    if (!config.dryRun) {
      const { error: updateError39 } = await supabase
        .from('restaurants')
        .update({ name: 'Tam Deli & Cafe' })
        .eq('id', 39);
      
      if (updateError39) {
        console.error('❌ Failed to update restaurant 39:', updateError39.message);
      } else {
        console.log('✅ Updated restaurant 39 to "Tam Deli & Cafe"');
      }
    } else {
      console.log('[DRY RUN] Would update restaurant 39 to "Tam Deli & Cafe"');
    }
    
    // Step 3: Create "El Chile Cafe Y Cantina" with ID 24 for dish 86
    console.log('\n3️⃣ Creating/updating restaurant ID 24 to "El Chile Cafe Y Cantina"...');
    if (!config.dryRun) {
      // Try to update first, then insert if it doesn't exist
      const { error: updateError24 } = await supabase
        .from('restaurants')
        .update({ name: 'El Chile Cafe Y Cantina' })
        .eq('id', 24);
      
      if (updateError24) {
        // If update failed, try to insert
        const { error: insertError24 } = await supabase
          .from('restaurants')
          .insert({
            id: 24,
            name: 'El Chile Cafe Y Cantina',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (insertError24) {
          console.error('❌ Failed to create restaurant 24:', insertError24.message);
        } else {
          console.log('✅ Created restaurant 24 "El Chile Cafe Y Cantina"');
        }
      } else {
        console.log('✅ Updated restaurant 24 to "El Chile Cafe Y Cantina"');
      }
    } else {
      console.log('[DRY RUN] Would create/update restaurant 24 to "El Chile Cafe Y Cantina"');
    }
    
    // Step 4: Update dish 86 to point to restaurant 24
    console.log('\n4️⃣ Updating dish 86 to point to restaurant 24...');
    if (!config.dryRun) {
      const { error: updateDishError } = await supabase
        .from('dishes')
        .update({ restaurant_id: 24 })
        .eq('id', 86);
      
      if (updateDishError) {
        console.error('❌ Failed to update dish 86:', updateDishError.message);
      } else {
        console.log('✅ Updated dish 86 to point to restaurant 24');
      }
    } else {
      console.log('[DRY RUN] Would update dish 86 to point to restaurant 24');
    }
    
    console.log('\n🎉 Restaurant name fixes completed!');
    
    // Show final state
    if (!config.dryRun) {
      const { data: finalDishes } = await supabase
        .from('dishes')
        .select('id, name, restaurant_id, restaurants(name)')
        .in('id', [71, 74, 86])
        .order('id');
      
      console.log('\n📊 Final associations:');
      finalDishes.forEach(d => {
        console.log(`  Dish ${d.id}: "${d.name}" → ${d.restaurants?.name || 'UNKNOWN'} (ID: ${d.restaurant_id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

fixRestaurantNames().catch(console.error);