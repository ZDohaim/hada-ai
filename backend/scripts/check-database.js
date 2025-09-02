const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabase() {
  console.log('🔍 Database Product Distribution Check\n');
  
  try {
    // Check total products
    const { data: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total Products: ${totalCount || 0}\n`);
    
    // Check products by category
    const { data: categoryData } = await supabase
      .from('products')
      .select(`
        categories:categories(code, name),
        price_sar
      `);
    
    if (categoryData) {
      const categoryCounts = {};
      const categoryPrices = {};
      
      categoryData.forEach(product => {
        const categoryCode = product.categories?.code || 'unknown';
        const categoryName = product.categories?.name || 'Unknown';
        const price = Number(product.price_sar) || 0;
        
        if (!categoryCounts[categoryCode]) {
          categoryCounts[categoryCode] = { count: 0, name: categoryName, prices: [] };
        }
        categoryCounts[categoryCode].count++;
        categoryCounts[categoryCode].prices.push(price);
      });
      
      console.log('📁 Products by Category:');
      Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .forEach(([code, data]) => {
          const minPrice = Math.min(...data.prices);
          const maxPrice = Math.max(...data.prices);
          const avgPrice = Math.round(data.prices.reduce((a, b) => a + b, 0) / data.prices.length);
          console.log(`   ${code}: ${data.count} products (${minPrice}-${maxPrice} SAR, avg: ${avgPrice})`);
        });
    }
    
    // Check products by store
    console.log('\n🏪 Products by Store:');
    const { data: storeData } = await supabase
      .from('products')
      .select(`
        stores:stores(code, name),
        price_sar
      `);
    
    if (storeData) {
      const storeCounts = {};
      
      storeData.forEach(product => {
        const storeCode = product.stores?.code || 'unknown';
        const storeName = product.stores?.name || 'Unknown';
        
        if (!storeCounts[storeCode]) {
          storeCounts[storeCode] = { count: 0, name: storeName };
        }
        storeCounts[storeCode].count++;
      });
      
      Object.entries(storeCounts)
        .sort(([,a], [,b]) => b.count - a.count)
        .forEach(([code, data]) => {
          console.log(`   ${code}: ${data.count} products`);
        });
    }
    
    // Check if tsvector columns are populated
    console.log('\n🔍 Search Index Status:');
    const { data: tsvectorCheck } = await supabase
      .from('products')
      .select('name_en_tsvector, name_ar_tsvector, description_en_tsvector, description_ar_tsvector')
      .limit(5);
    
    if (tsvectorCheck && tsvectorCheck.length > 0) {
      const sample = tsvectorCheck[0];
      console.log('   name_en_tsvector:', sample.name_en_tsvector ? 'populated ✅' : 'empty ❌');
      console.log('   name_ar_tsvector:', sample.name_ar_tsvector ? 'populated ✅' : 'empty ❌');
      console.log('   description_en_tsvector:', sample.description_en_tsvector ? 'populated ✅' : 'empty ❌');
      console.log('   description_ar_tsvector:', sample.description_ar_tsvector ? 'populated ✅' : 'empty ❌');
    }
    
  } catch (error) {
    console.error('❌ Database check error:', error.message);
  }
}

checkDatabase();