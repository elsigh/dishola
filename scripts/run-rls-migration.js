#!/usr/bin/env node

/**
 * Script to run the RLS migration for taste dictionary user creation
 * Usage: node scripts/run-rls-migration.js
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Using the connection string components
const supabaseUrl = "https://llnfznmosphwhddnvqwp.supabase.co"
const supabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbmZ6bm1vc3Bod2hkZG52cXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQ2MjA5MSwiZXhwIjoyMDUwMDM4MDkxfQ.yDxMnIyN91tfhPSh"

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function runRLSMigration() {
  console.log("Running RLS migration for taste dictionary user creation...")

  try {
    // Read the migration file
    const migrationPath = join(__dirname, "..", "db", "migrations", "20250128_allow_user_taste_creation.sql")
    const migrationSQL = readFileSync(migrationPath, "utf8")

    // Split the SQL into individual statements (rough split on semicolons)
    const statements = migrationSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"))

    console.log(`Found ${statements.length} SQL statements to execute...`)

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      console.log("Statement:", statement.substring(0, 100) + "...")

      const { error } = await supabase
        .rpc("exec_sql", {
          sql_statement: statement
        })
        .single()

      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        console.error("Full statement was:", statement)
        return false
      }

      console.log(`✓ Statement ${i + 1} executed successfully`)
    }

    console.log("🎉 RLS Migration completed successfully!")
    console.log("Users can now create taste dictionary items!")
    return true
  } catch (error) {
    console.error("Migration failed:", error)
    return false
  }
}

// Alternative approach: output the SQL for manual execution
function outputSQL() {
  try {
    const migrationPath = join(__dirname, "..", "db", "migrations", "20250128_allow_user_taste_creation.sql")
    const migrationSQL = readFileSync(migrationPath, "utf8")

    console.log("\n" + "=".repeat(80))
    console.log("RLS MIGRATION SQL (copy and paste into Supabase SQL editor):")
    console.log("=".repeat(80))
    console.log(migrationSQL)
    console.log("=".repeat(80))
  } catch (error) {
    console.error("Error reading migration file:", error)
  }
}

// Run the migration
runRLSMigration().then((success) => {
  if (!success) {
    console.log("\nMigration failed. Here's the SQL to run manually:")
    outputSQL()
  }
  process.exit(success ? 0 : 1)
})
