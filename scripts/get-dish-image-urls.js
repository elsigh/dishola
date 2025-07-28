import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from API directory
dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function getDishImageUrls(dishId) {
  // Get all images for the specified dish
  const { data: images, error } = await supabase
    .from('dish_images')
    .select('id, blob_url, original_filename, description, created_at')
    .eq('dish_id', dishId)
    .order('id');
  
  if (error) {
    console.error('Error fetching images:', error);
    return;
  }
  
  // Get dish name
  const { data: dish } = await supabase
    .from('dishes')
    .select('name')
    .eq('id', dishId)
    .single();
  
  console.log(`Images for Dish ${dishId} (${dish?.name || 'Unknown'}):`);
  console.log(`Total: ${images.length} images\n`);
  
  images.forEach((image, index) => {
    console.log(`${index + 1}. ${image.blob_url}`);
    console.log(`   Original filename: ${image.original_filename}`);
    console.log(`   Description: ${image.description}`);
    console.log(`   Created: ${image.created_at}`);
    console.log();
  });
}

// Get dish ID from command line argument or default to 1
const dishId = process.argv[2] ? parseInt(process.argv[2]) : 1;
getDishImageUrls(dishId).catch(console.error);