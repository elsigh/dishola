#!/usr/bin/env node

/**
 * Script to run the taste preferences migration
 * Usage: node scripts/run-migration.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Using the connection string components
const supabaseUrl = 'https://llnfznmosphwhddnvqwp.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsbmZ6bm1vc3Bod2hkZG52cXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQ2MjA5MSwiZXhwIjoyMDUwMDM4MDkxfQ.yDxMnIyN91tfhPSh' // This is likely the service role key based on the password in the connection string

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
})

async function runMigration() {
  console.log('Running taste preferences migration...')
  
  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'db', 'migrations', '20250128_add_taste_preferences.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements (rough split on semicolons)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute...`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { 
        sql_statement: statement 
      }).single()
      
      if (error) {
        console.error(`Error executing statement ${i + 1}:`, error)
        console.error('Statement was:', statement.substring(0, 200) + '...')
        
        // Try direct query for simpler statements
        if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX')) {
          console.log('Trying direct query execution...')
          const { error: directError } = await supabase
            .from('information_schema.tables') // dummy query to test connection
            .select('table_name')
            .limit(1)
          
          if (directError) {
            console.error('Connection test failed:', directError)
          } else {
            console.log('Connection is working, but RPC failed. You may need to run this migration directly in Supabase SQL editor.')
          }
        }
        return false
      }
      
      console.log(`✓ Statement ${i + 1} executed successfully`)
    }
    
    console.log('🎉 Migration completed successfully!')
    return true
    
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}

// Alternative approach: output the SQL for manual execution
function outputSQL() {
  try {
    const migrationPath = join(__dirname, '..', 'db', 'migrations', '20250128_add_taste_preferences.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('\n' + '='.repeat(80))
    console.log('MIGRATION SQL (copy and paste into Supabase SQL editor):')
    console.log('='.repeat(80))
    console.log(migrationSQL)
    console.log('='.repeat(80))
    
  } catch (error) {
    console.error('Error reading migration file:', error)
  }
}

// Run the migration
runMigration().then(success => {
  if (!success) {
    console.log('\nFalling back to outputting SQL for manual execution...')
    outputSQL()
  }
}).catch(error => {
  console.error('Script failed:', error)
  console.log('\nOutputting SQL for manual execution...')
  outputSQL()
})