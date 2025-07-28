import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanupIncorrectImages() {
  console.log('🧹 Starting cleanup of incorrectly migrated images...');
  
  // Get all dish_images
  const { data: images } = await supabase
    .from('dish_images')
    .select('id, dish_id, original_filename');
  
  console.log(`Found ${images.length} total images to review`);
  
  // The only correct image based on production SQL is: 645aa598684a8ffe6f10db886ddcf67d.jpg for dish 41
  const correctImage = '645aa598684a8ffe6f10db886ddcf67d.jpg';
  
  const imagesToDelete = images.filter(img => img.original_filename !== correctImage);
  
  console.log(`Images to delete: ${imagesToDelete.length}`);
  console.log(`Correct image to keep: 1 (${correctImage} for dish 41)`);
  
  if (process.env.DRY_RUN === 'true') {
    console.log('[DRY RUN] Would delete the following images:');
    imagesToDelete.forEach(img => {
      console.log(`  - ID ${img.id}: ${img.original_filename} (dish ${img.dish_id})`);
    });
    return;
  }
  
  // Delete incorrect images
  let deleted = 0;
  for (const image of imagesToDelete) {
    const { error } = await supabase
      .from('dish_images')
      .delete()
      .eq('id', image.id);
    
    if (error) {
      console.error(`❌ Failed to delete image ${image.id}:`, error);
    } else {
      deleted++;
      if (deleted % 10 === 0) {
        console.log(`Deleted ${deleted}/${imagesToDelete.length} images...`);
      }
    }
  }
  
  // Reset canonical images for affected dishes (except dish 41)
  console.log('🔄 Resetting canonical images...');
  const { error: resetError } = await supabase
    .from('dishes')
    .update({ canonical_image_id: null })
    .neq('id', 41);
  
  if (resetError) {
    console.error('❌ Failed to reset canonical images:', resetError);
  } else {
    console.log('✅ Reset canonical images for all dishes except 41');
  }
  
  console.log(`\n🎉 Cleanup completed!`);
  console.log(`✅ Deleted: ${deleted} incorrect images`);
  console.log(`✅ Kept: 1 correct image (${correctImage})`);
}

cleanupIncorrectImages().catch(console.error);