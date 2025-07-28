#!/usr/bin/env node

/**
 * Script to populate the taste_dictionary table with common dishes and ingredients
 * Usage: node scripts/populate-taste-dictionary.js
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Common dishes to populate
const dishes = [
  // Italian
  'Pizza Margherita', 'Spaghetti Carbonara', 'Lasagna', 'Risotto', 'Osso Buco', 'Tiramisu',
  'Bruschetta', 'Gnocchi', 'Parmigiana', 'Cannoli', 'Gelato', 'Prosciutto',
  
  // Japanese  
  'Sushi', 'Ramen', 'Tempura', 'Yakitori', 'Miso Soup', 'Sashimi', 'Udon',
  'Donburi', 'Onigiri', 'Takoyaki', 'Okonomiyaki', 'Mochi',
  
  // Mexican
  'Tacos', 'Burritos', 'Quesadillas', 'Guacamole', 'Enchiladas', 'Tamales',
  'Nachos', 'Carnitas', 'Ceviche', 'Churros', 'Pozole', 'Mole',
  
  // Indian
  'Curry', 'Biryani', 'Naan', 'Tandoori Chicken', 'Samosas', 'Dal',
  'Butter Chicken', 'Palak Paneer', 'Masala Chai', 'Tikka Masala', 'Dosa', 'Idli',
  
  // Chinese
  'Fried Rice', 'Dumplings', 'Kung Pao Chicken', 'Sweet and Sour Pork', 'Chow Mein',
  'Peking Duck', 'Dim Sum', 'Mapo Tofu', 'Hot Pot', 'Spring Rolls', 'Wonton Soup',
  
  // American
  'Hamburger', 'BBQ Ribs', 'Fried Chicken', 'Mac and Cheese', 'Apple Pie',
  'Cheesecake', 'Buffalo Wings', 'Pancakes', 'Clam Chowder', 'Lobster Roll',
  
  // French
  'Croissant', 'French Onion Soup', 'Coq au Vin', 'Ratatouille', 'Crème Brûlée',
  'Bouillabaisse', 'Quiche', 'Escargot', 'Foie Gras', 'Macarons',
  
  // Thai
  'Pad Thai', 'Tom Yum', 'Green Curry', 'Mango Sticky Rice', 'Som Tam',
  'Massaman Curry', 'Thai Basil Chicken', 'Larb', 'Khao Pad',
  
  // Mediterranean/Middle Eastern
  'Hummus', 'Falafel', 'Shawarma', 'Baklava', 'Tabbouleh', 'Kebab',
  'Moussaka', 'Dolmas', 'Baba Ganoush', 'Pita Bread',
  
  // Korean
  'Kimchi', 'Bulgogi', 'Bibimbap', 'Korean BBQ', 'Japchae', 'Tteokbokki',
  'Galbi', 'Sundubu Jjigae', 'Kimchi Fried Rice'
]

// Common ingredients to populate
const ingredients = [
  // Proteins
  'Chicken', 'Beef', 'Pork', 'Lamb', 'Fish', 'Salmon', 'Tuna', 'Shrimp', 'Crab',
  'Lobster', 'Eggs', 'Tofu', 'Tempeh', 'Beans', 'Lentils', 'Chickpeas',
  
  // Vegetables
  'Tomatoes', 'Onions', 'Garlic', 'Ginger', 'Bell Peppers', 'Carrots', 'Broccoli',
  'Spinach', 'Kale', 'Lettuce', 'Cabbage', 'Mushrooms', 'Zucchini', 'Eggplant',
  'Potatoes', 'Sweet Potatoes', 'Avocado', 'Cucumber', 'Celery', 'Asparagus',
  
  // Herbs & Spices
  'Basil', 'Oregano', 'Thyme', 'Rosemary', 'Cilantro', 'Parsley', 'Mint',
  'Black Pepper', 'Salt', 'Paprika', 'Cumin', 'Turmeric', 'Cinnamon', 'Cardamom',
  'Bay Leaves', 'Saffron', 'Vanilla', 'Nutmeg', 'Cloves', 'Garam Masala',
  
  // Dairy & Cheese
  'Mozzarella', 'Parmesan', 'Cheddar', 'Goat Cheese', 'Feta', 'Brie', 'Blue Cheese',
  'Cream', 'Butter', 'Greek Yogurt', 'Milk', 'Heavy Cream',
  
  // Grains & Starches
  'Rice', 'Quinoa', 'Pasta', 'Bread', 'Flour', 'Oats', 'Barley', 'Couscous',
  'Bulgur', 'Polenta', 'Noodles',
  
  // Oils & Condiments
  'Olive Oil', 'Sesame Oil', 'Coconut Oil', 'Soy Sauce', 'Fish Sauce', 'Vinegar',
  'Lemon', 'Lime', 'Honey', 'Maple Syrup', 'Hot Sauce', 'Mustard',
  
  // Nuts & Seeds
  'Almonds', 'Walnuts', 'Pecans', 'Cashews', 'Pine Nuts', 'Sesame Seeds',
  'Chia Seeds', 'Flax Seeds', 'Sunflower Seeds', 'Pumpkin Seeds',
  
  // Premium/Specialty
  'Truffle', 'Black Truffle', 'White Truffle', 'Caviar', 'Wagyu Beef', 'Uni',
  'Foie Gras', 'Oysters', 'Scallops', 'Duck Confit', 'Prosciutto di Parma'
]

async function populateTasteDictionary() {
  console.log('Starting to populate taste dictionary...')
  
  try {
    // Prepare dish data
    const dishData = dishes.map(name => ({
      name: name.trim(),
      type: 'dish'
    }))
    
    // Prepare ingredient data
    const ingredientData = ingredients.map(name => ({
      name: name.trim(),
      type: 'ingredient'
    }))
    
    // Combine all data
    const allData = [...dishData, ...ingredientData]
    
    console.log(`Inserting ${allData.length} items (${dishes.length} dishes, ${ingredients.length} ingredients)...`)
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 50
    let inserted = 0
    let skipped = 0
    
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = allData.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('taste_dictionary')
        .upsert(batch, { 
          onConflict: 'name',
          ignoreDuplicates: true 
        })
        .select('id, name')
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error)
        continue
      }
      
      const batchInserted = data?.length || 0
      inserted += batchInserted
      skipped += batch.length - batchInserted
      
      console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${batchInserted} inserted, ${batch.length - batchInserted} skipped`)
    }
    
    console.log(`\nCompleted! ${inserted} items inserted, ${skipped} skipped (duplicates)`)
    
    // Show some stats
    const { data: stats } = await supabase
      .from('taste_dictionary')
      .select('type')
      .then(({ data }) => {
        const dishCount = data?.filter(item => item.type === 'dish').length || 0
        const ingredientCount = data?.filter(item => item.type === 'ingredient').length || 0
        return { data: { dishCount, ingredientCount, total: data?.length || 0 } }
      })
    
    if (stats) {
      console.log(`\nDatabase now contains:`)
      console.log(`- ${stats.dishCount} dishes`)
      console.log(`- ${stats.ingredientCount} ingredients`)
      console.log(`- ${stats.total} total items`)
    }
    
  } catch (error) {
    console.error('Failed to populate taste dictionary:', error)
    process.exit(1)
  }
}

// Run the script
populateTasteDictionary().then(() => {
  console.log('Script completed successfully!')
  process.exit(0)
}).catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})