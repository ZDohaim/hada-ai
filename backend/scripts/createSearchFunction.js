require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSearchFunction() {
  try {
    console.log('🔧 Creating advanced bilingual search functions in Supabase...');
    
    // Read the advanced SQL file
    const sqlPath = path.join(__dirname, '../sql/03_advanced_search_functions.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('✅ Database connected. Please manually run the advanced SQL in Supabase SQL Editor:');
    console.log('\n📋 IMPORTANT: Copy this ENTIRE SQL and paste it in your Supabase SQL Editor:');
    console.log('This will:');
    console.log('- Add tsvector columns for bilingual search');  
    console.log('- Create performance indexes');
    console.log('- Create search_gifts_plan() and search_gifts_plans() functions');
    console.log('- Update existing products with tsvectors');
    console.log('\n' + '='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80) + '\n');
    
    // Test connection
    const { data: testData, error: testError } = await supabase.from('products').select('count').limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    
    console.log('🔗 Database connection successful!');
    console.log('\nAfter running the SQL, the new functions will be:');
    console.log('- search_gifts_plan(plan JSONB) - for single GPT plan');
    console.log('- search_gifts_plans(plans JSONB[]) - for batch GPT plans');
    console.log('\nThese functions provide:');
    console.log('✓ Bilingual English + Arabic search');
    console.log('✓ Category-aware scoring (16 categories)');
    console.log('✓ Store-category synergy bonuses');
    console.log('✓ Price range matching');
    console.log('✓ Advanced relevance scoring');
    
  } catch (err) {
    console.error('❌ Error:', err);
    
    // Always show the SQL to copy manually
    try {
      const sqlPath = path.join(__dirname, '../sql/03_advanced_search_functions.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      console.log('\n📋 Please manually run this SQL in Supabase SQL Editor:');
      console.log('='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
    } catch (readError) {
      console.error('Could not read SQL file:', readError);
    }
  }
}

createSearchFunction();