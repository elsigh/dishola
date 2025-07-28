#!/usr/bin/env node

/**
 * Script to populate images for taste dictionary items
 * Usage: node scripts/populate-taste-images.js
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://dishola.com'
  : 'http://localhost:3001'

async function populateImages() {
  console.log('Starting to populate taste dictionary images...')
  
  let totalProcessed = 0
  let totalSuccessful = 0
  let attempts = 0
  const maxAttempts = 50 // Prevent infinite loops

  try {
    while (attempts < maxAttempts) {
      attempts++
      console.log(`\n--- Batch ${attempts} ---`)
      
      // Call the API to process a batch
      const response = await fetch(`${API_BASE_URL}/api/tastes/populate-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error(`API request failed: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        break
      }

      const result = await response.json()
      console.log(`API Response: ${result.message}`)
      
      totalProcessed += result.total || 0
      totalSuccessful += result.processed || 0

      // Show detailed results
      if (result.results) {
        const successful = result.results.filter(r => r.success)
        const failed = result.results.filter(r => !r.success)
        
        if (successful.length > 0) {
          console.log(`✅ Successfully processed ${successful.length} items:`)
          successful.forEach(item => {
            console.log(`  - ${item.name} (${item.imageSource})`)
          })
        }
        
        if (failed.length > 0) {
          console.log(`❌ Failed to process ${failed.length} items:`)
          failed.forEach(item => {
            console.log(`  - ${item.name}: ${item.error}`)
          })
        }
      }

      // If no items were processed, we're done
      if (result.processed === 0) {
        console.log('\n🎉 All items have been processed!')
        break
      }

      // Wait between batches to be nice to the APIs
      console.log('Waiting 2 seconds before next batch...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log(`\n📊 Final Summary:`)
    console.log(`- Total batches processed: ${attempts}`)
    console.log(`- Total items processed: ${totalProcessed}`)
    console.log(`- Total successful: ${totalSuccessful}`)
    console.log(`- Success rate: ${totalProcessed > 0 ? Math.round((totalSuccessful / totalProcessed) * 100) : 0}%`)

  } catch (error) {
    console.error('Failed to populate taste images:', error)
    process.exit(1)
  }
}

// Run the script
populateImages().then(() => {
  console.log('\nScript completed!')
  process.exit(0)
}).catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})