#!/usr/bin/env node

/**
 * Script to generate SQL for updating the check constraint on taste_dictionary table
 * to allow "cuisine" type.
 *
 * Usage: node update-taste-dictionary-sql.js
 *
 * This script simply outputs the SQL you need to run in the Supabase SQL editor.
 * No database connection is required.
 */

console.log(`
-- SQL to update the taste_dictionary check constraint to allow "cuisine" type

-- First, drop the existing constraint
ALTER TABLE taste_dictionary DROP CONSTRAINT IF EXISTS taste_dictionary_type_check;

-- Then, add a new constraint that includes "cuisine"
ALTER TABLE taste_dictionary ADD CONSTRAINT taste_dictionary_type_check 
  CHECK (type IN ('dish', 'ingredient', 'cuisine'));

-- Verify the constraint was updated
SELECT 
  tc.constraint_name, 
  cc.check_clause
FROM 
  information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE 
  tc.table_name = 'taste_dictionary'
  AND tc.constraint_type = 'CHECK';
`)

console.log("\nCopy the SQL above and run it in the Supabase SQL editor.")
console.log("After running this SQL, you should be able to add cuisines to the taste_dictionary table.")
