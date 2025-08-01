#!/usr/bin/env node

/**
 * Script to update the check constraint on taste_dictionary table to allow "cuisine" type.
 *
 * Usage: node update-taste-dictionary-type-constraint.js [--dry-run]
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
 *    node update-taste-dictionary-type-constraint.js --dry-run  # Test run without making changes
 *    node update-taste-dictionary-type-constraint.js            # Actually update the database
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

/**
 * Main function to update the taste_dictionary check constraint
 */
async function main() {
  try {
    console.log(`Running in ${dryRun ? "DRY RUN" : "LIVE"} mode`)

    // SQL to update the check constraint
    const sql = `
      -- First, drop the existing constraint
      ALTER TABLE taste_dictionary DROP CONSTRAINT IF EXISTS taste_dictionary_type_check;
      
      -- Then, add a new constraint that includes "cuisine"
      ALTER TABLE taste_dictionary ADD CONSTRAINT taste_dictionary_type_check 
        CHECK (type IN ('dish', 'ingredient', 'cuisine'));
    `

    console.log("SQL to execute:")
    console.log(sql)

    if (dryRun) {
      console.log("\nThis was a dry run. No changes were made to the database.")
      return
    }

    // Execute the SQL
    const { error } = await supabase.rpc("exec_sql", { sql })

    if (error) {
      if (error.message.includes("function exec_sql(sql) does not exist")) {
        console.error("\nError: The exec_sql function doesn't exist in your database.")
        console.log("\nAlternative approach: You need to run this SQL directly in the Supabase SQL editor:")
        console.log(sql)
        process.exit(1)
      } else {
        throw error
      }
    }

    console.log("\nSuccessfully updated the taste_dictionary_type_check constraint!")
    console.log("The taste_dictionary table now accepts 'cuisine' as a valid type.")
  } catch (error) {
    console.error("Error updating constraint:", error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)
