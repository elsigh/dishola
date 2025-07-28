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

/**
 * Manually fix the known problematic dish-restaurant associations
 * Based on user feedback from conversation
 */
async function manualFixAssociations() {
  console.log('🔧 Manually fixing dish-restaurant associations...');
  console.log(`🔄 Dry run: ${config.dryRun}`);
  
  // Correct mappings based on user feedback
  const correctMappings = [
    {
      dishId: 71,
      dishName: 'Tai Nam #6',
      correctRestaurantName: 'Pho 79',
      correctLocationId: 37,
      cuisine: 'Vietnamese'
    },
    {
      dishId: 74, 
      dishName: 'Steam Bun',
      correctRestaurantName: 'Tam Deli & Cafe',
      correctLocationId: 39,
      cuisine: 'Asian'
    },
    {
      dishId: 86,
      dishName: 'Enchiladas de Mole Rojo', 
      correctRestaurantName: 'El Chile Cafe Y Cantina',
      correctLocationId: 24,
      cuisine: 'Mexican'
    }
  ];

  let fixed = 0;
  let created = 0;
  let errors = 0;

  for (const mapping of correctMappings) {
    try {
      console.log(`\n🔍 Processing dish ${mapping.dishId}: "${mapping.dishName}"`);
      console.log(`   Should be at: ${mapping.correctRestaurantName} (${mapping.cuisine} food)`);
      
      // Find or create the correct restaurant
      let restaurantId = mapping.correctLocationId;
      
      // Check if restaurant already exists with this name
      const { data: existingRestaurant } = await supabase
        .from('restaurants')
        .select('id, name')
        .ilike('name', mapping.correctRestaurantName)
        .single();
      
      if (existingRestaurant) {
        console.log(`   Found existing restaurant: ${existingRestaurant.name} (ID: ${existingRestaurant.id})`);
        restaurantId = existingRestaurant.id;
      } else {
        // Create the restaurant with the original location_id
        if (!config.dryRun) {
          const { data: newRestaurant, error: createError } = await supabase
            .from('restaurants')
            .insert({
              id: mapping.correctLocationId,
              name: mapping.correctRestaurantName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (createError) {
            console.error(`❌ Failed to create restaurant ${mapping.correctRestaurantName}:`, createError.message);
            errors++;
            continue;
          }
          
          console.log(`   Created new restaurant: ${newRestaurant.name} (ID: ${newRestaurant.id})`);
          restaurantId = newRestaurant.id;
          created++;
        } else {
          console.log(`[DRY RUN] Would create restaurant: ${mapping.correctRestaurantName} (ID: ${mapping.correctLocationId})`);
        }
      }
      
      // Update the dish's restaurant assignment
      if (!config.dryRun) {
        const { error: updateError } = await supabase
          .from('dishes')
          .update({ restaurant_id: restaurantId })
          .eq('id', mapping.dishId);
        
        if (updateError) {
          console.error(`❌ Failed to update dish ${mapping.dishId}:`, updateError.message);
          errors++;
          continue;
        }
      }
      
      console.log(`✅ ${config.dryRun ? '[DRY RUN] Would fix' : 'Fixed'} dish ${mapping.dishId} → ${mapping.correctRestaurantName}`);
      fixed++;
      
    } catch (error) {
      console.error(`❌ Error processing dish ${mapping.dishId}:`, error.message);
      errors++;
    }
  }
  
  console.log('\n🎉 Manual association fix completed!');
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`🆕 Created restaurants: ${created}`);
  console.log(`❌ Errors: ${errors}`);
}

manualFixAssociations().catch(console.error);