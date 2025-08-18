#!/usr/bin/env node

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Alternative category codes that might work with the constraint
const alternativeCategories = [
  { code: 'education', name: 'Books & Education' }, // instead of 'books'
  { code: 'nutrition', name: 'Health & Nutrition' }, // instead of 'health-nutrition'
  { code: 'food', name: 'Food & Beverages' }, // instead of 'food-drink'
  { code: 'supplies', name: 'Office Supplies' }, // instead of 'office'
  { code: 'games', name: 'Gaming' }, // instead of 'gaming'
  { code: 'technology', name: 'Technology' }, // instead of 'tech'
  { code: 'accessories', name: 'Jewelry & Accessories' }, // instead of 'jewelry'
  { code: 'floral', name: 'Fresh Flowers' }, // instead of 'flowers'
  { code: 'upscale', name: 'Luxury Items' } // instead of 'luxury'
];

async function setupAlternativeCategories() {
  console.log('Setting up alternative category codes...');
  
  for (const category of alternativeCategories) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([category])
        .select();
      
      if (error) {
        if (error.code === '23505') {
          console.log(`✓ Category '${category.code}' already exists`);
        } else {
          console.error(`❌ Error inserting '${category.code}':`, error.message);
        }
      } else {
        console.log(`✅ Added category '${category.code}': ${category.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed to process '${category.code}':`, err.message);
    }
  }
  
  // Final verification
  const { data: finalCategories, error } = await supabase
    .from('categories')
    .select('code, name')
    .order('code');
    
  if (error) {
    console.error('❌ Failed to verify categories:', error.message);
  } else {
    console.log(`\n✅ Total categories in database: ${finalCategories.length}`);
    finalCategories.forEach(cat => {
      console.log(`  - ${cat.code}: ${cat.name}`);
    });
  }
}

setupAlternativeCategories().catch(console.error);