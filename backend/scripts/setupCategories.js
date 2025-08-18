#!/usr/bin/env node

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const categories = [
  { code: 'books', name: 'Books & Education' },
  { code: 'makeup', name: 'Makeup & Beauty' },
  { code: 'care', name: 'Personal Care' },
  { code: 'health-nutrition', name: 'Health & Nutrition' },
  { code: 'premium', name: 'Premium Products' },
  { code: 'nails', name: 'Nail Care' },
  { code: 'lenses', name: 'Contact Lenses' },
  { code: 'food-drink', name: 'Food & Beverages' },
  { code: 'office', name: 'Office Supplies' },
  { code: 'gaming', name: 'Gaming' },
  { code: 'tech', name: 'Technology' },
  { code: 'jewelry', name: 'Jewelry & Accessories' },
  { code: 'flowers', name: 'Fresh Flowers' },
  { code: 'luxury', name: 'Luxury Items' }
];

async function setupCategories() {
  console.log('Setting up missing categories...');
  
  for (const category of categories) {
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
  
  // Verify final count
  const { data: finalCategories, error } = await supabase
    .from('categories')
    .select('code, name');
    
  if (error) {
    console.error('❌ Failed to verify categories:', error.message);
  } else {
    console.log(`\n✅ Total categories in database: ${finalCategories.length}`);
    console.log('Categories:', finalCategories.map(c => c.code).join(', '));
  }
}

setupCategories().catch(console.error);