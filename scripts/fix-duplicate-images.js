import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixDuplicateImages() {
  console.log('🔧 Fixing duplicate images...');
  
  // Get all images for dish 41
  const { data: dish41Images } = await supabase
    .from('dish_images')
    .select('id, original_filename, blob_url, created_at')
    .eq('dish_id', 41)
    .order('id');
  
  console.log(`Found ${dish41Images.length} images for dish 41:`);
  dish41Images.forEach((img, index) => {
    console.log(`  ${index + 1}. ID: ${img.id}, File: ${img.original_filename}, Created: ${img.created_at}`);
  });
  
  if (dish41Images.length === 2 && dish41Images[0].original_filename === dish41Images[1].original_filename) {
    console.log('\n⚠️  Found duplicate! Removing the newer one...');
    
    // Remove the newer duplicate (higher ID)
    const duplicateId = dish41Images[1].id;
    
    const { error } = await supabase
      .from('dish_images')
      .delete()
      .eq('id', duplicateId);
    
    if (error) {
      console.error('❌ Failed to remove duplicate:', error);
    } else {
      console.log(`✅ Removed duplicate image with ID: ${duplicateId}`);
    }
  } else {
    console.log('ℹ️  No duplicates found or different filenames');
  }
}

fixDuplicateImages().catch(console.error);