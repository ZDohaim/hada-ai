const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSearchFunction() {
  console.log('🔧 Updating search function with flexible text matching...\n');
  
  try {
    // Read the updated SQL file
    const sqlContent = fs.readFileSync('./sql/03_advanced_search_functions.sql', 'utf8');
    
    console.log('📝 Executing SQL updates...');
    const { data, error } = await supabase.rpc('exec', { sql: sqlContent });
    
    if (error) {
      console.error('❌ SQL execution error:', error);
      return;
    }
    
    console.log('✅ Search function updated successfully!');
    
    // Test the updated function
    console.log('\n🧪 Testing updated search function...');
    const testPlan = {
      category: 'perfume',
      store: 'ALL',
      query_en: 'elegant perfume gift',
      query_ar: 'هدية عطر أنيق',
      facets: {
        budget_band: 'Mid',
        min_price: 200,
        max_price: 300,
        relationship_tier: 'casual',
        occasion_tier: 'casual'
      }
    };
    
    const { data: testResults, error: testError } = await supabase.rpc('search_gifts_plan', {
      plan: testPlan
    });
    
    if (testError) {
      console.error('❌ Test search error:', testError);
      return;
    }
    
    console.log(`✅ Test search completed: found ${testResults.length} results`);
    if (testResults.length > 0) {
      console.log('📦 Sample result:', {
        name: testResults[0].name,
        price: testResults[0].price,
        category: testResults[0].category,
        store: testResults[0].store,
        relevance_score: testResults[0].relevance_score
      });
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
  }
}

updateSearchFunction();