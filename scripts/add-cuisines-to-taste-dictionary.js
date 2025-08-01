#!/usr/bin/env node

/**
 * Script to add all cuisines from the constants file to the taste_dictionary table.
 *
 * Usage: node add-cuisines-to-taste-dictionary.js [--dry-run]
 *
 * Options:
 *   --dry-run       Don't actually update the database, just show what would be done
 *
 * Setup:
 * 1. Create a .env file in the scripts directory with the following variables:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 *
 * 2. Install dependencies:
 *    cd scripts
 *    npm install
 *
 * 3. Run the script:
 *    node add-cuisines-to-taste-dictionary.js --dry-run  # Test run without making changes
 *    node add-cuisines-to-taste-dictionary.js            # Actually update the database
 */

const { createClient } = require("@supabase/supabase-js")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// List of cuisines from constants.ts
const CUISINES = [
  "American",
  "Italian",
  "Chinese",
  "Japanese",
  "Mexican",
  "Indian",
  "Thai",
  "French",
  "Mediterranean",
  "Korean",
  "Vietnamese",
  "Greek",
  "Spanish",
  "Lebanese",
  "Turkish",
  "Ethiopian",
  "Moroccan",
  "Brazilian",
  "Peruvian",
  "German",
  "British",
  "Russian",
  "Other"
]

/**
 * Add a cuisine to the taste_dictionary table if it doesn't already exist
 */
async function addCuisine(cuisine) {
  try {
    // Check if cuisine already exists
    const { data: existingCuisines, error: checkError } = await supabase
      .from("taste_dictionary")
      .select("id, name")
      .eq("name", cuisine)
      .eq("type", "cuisine")

    if (checkError) {
      throw checkError
    }

    if (existingCuisines && existingCuisines.length > 0) {
      console.log(`Cuisine "${cuisine}" already exists in taste_dictionary with ID ${existingCuisines[0].id}`)
      return { success: true, message: "already exists", id: existingCuisines[0].id }
    }

    // Add cuisine to taste_dictionary
    if (dryRun) {
      console.log(`[DRY RUN] Would add cuisine "${cuisine}" to taste_dictionary`)
      return { success: true, message: "would add (dry run)" }
    }

    const { data, error } = await supabase
      .from("taste_dictionary")
      .insert([
        {
          name: cuisine,
          type: "cuisine",
          image_source: "system",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      throw error
    }

    console.log(`Added cuisine "${cuisine}" to taste_dictionary with ID ${data[0].id}`)
    return { success: true, message: "added", id: data[0].id }
  } catch (error) {
    console.error(`Error adding cuisine "${cuisine}":`, error)
    return { success: false, error }
  }
}

/**
 * Main function to add all cuisines to taste_dictionary
 */
async function main() {
  try {
    console.log(`Running in ${dryRun ? "DRY RUN" : "LIVE"} mode`)
    console.log(`Adding ${CUISINES.length} cuisines to taste_dictionary...`)

    let addedCount = 0
    let existingCount = 0
    let failedCount = 0

    for (const cuisine of CUISINES) {
      const result = await addCuisine(cuisine)

      if (result.success) {
        if (result.message === "added") {
          addedCount++
        } else if (result.message === "already exists") {
          existingCount++
        }
      } else {
        failedCount++
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    console.log("\n=== Summary ===")
    console.log(`Total cuisines processed: ${CUISINES.length}`)
    console.log(`Cuisines already in database: ${existingCount}`)
    console.log(`Cuisines added: ${addedCount}`)
    console.log(`Failed additions: ${failedCount}`)

    if (dryRun) {
      console.log("\nThis was a dry run. No changes were made to the database.")
    }
  } catch (error) {
    console.error("Error in main process:", error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)
