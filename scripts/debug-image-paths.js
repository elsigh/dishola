import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from API directory
dotenv.config({ path: join(__dirname, '../apps/api/.env.local') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const config = {
  imgstoreDir: join(__dirname, '../imgstore')
};

// Get the problematic images for dish 1
async function debugImagePaths() {
  const { data: images } = await supabase
    .from('dish_images')
    .select('original_filename')
    .eq('dish_id', 1)
    .order('id');
  
  console.log('Investigating paths for Fish Taco (dish 1) images:');
  console.log('='.repeat(60));
  
  // Find each image file and show its actual path
  for (let i = 0; i < images.length; i++) {
    const filename = images[i].original_filename;
    console.log(`\n${i + 1}. ${filename}`);
    
    const foundPath = findImageFile(filename);
    if (foundPath) {
      const relativePath = foundPath.replace(config.imgstoreDir + '/', '');
      console.log(`   Found at: ${relativePath}`);
      
      // Analyze the path structure
      const pathParts = relativePath.split('/');
      console.log(`   Path parts: [${pathParts.join(', ')}]`);
      
      if (pathParts.length >= 2) {
        const secondLevel = parseInt(pathParts[1]);
        console.log(`   Second level directory: ${pathParts[1]} (parsed as dish ID: ${secondLevel})`);
      }
    } else {
      console.log('   NOT FOUND in imgstore directory');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Analysis: The migration script assumes imgstore/X/Y/ where Y is dish ID');
  console.log('But clearly this assumption is incorrect for many images.');
}

function findImageFile(filename) {
  function walkDir(dir) {
    try {
      const items = readdirSync(dir);
      
      for (const item of items) {
        const itemPath = join(dir, item);
        const stat = statSync(itemPath);
        
        if (stat.isDirectory()) {
          const result = walkDir(itemPath);
          if (result) return result;
        } else if (item === filename) {
          return itemPath;
        }
      }
    } catch (err) {
      // Directory might not exist, continue
    }
    
    return null;
  }
  
  return walkDir(config.imgstoreDir);
}

debugImagePaths().catch(console.error);