const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchGiftsWithPlans(gptPlans) {
  // Convert GPT plans to JSONB array format for Supabase with flexible text search
  const plansArray = gptPlans.map(plan => {
    // Extract single keyword from complex queries for better matching
    const extractKeyword = (query) => {
      if (!query) return '';
      // Extract the main product type from queries like "skincare set popular" -> "skincare"
      const keywords = query.toLowerCase().split(' ');
      const productKeywords = ['skincare', 'makeup', 'perfume', 'nail', 'book', 'watch', 'jewelry', 'fragrance', 'candle', 'home'];
      const mainKeyword = keywords.find(word => productKeywords.some(pk => word.includes(pk))) || keywords[0] || '';
      return mainKeyword;
    };

    return {
      category: plan.category,
      store: plan.store === 'ALL' ? 'ALL' : (plan.store || 'ALL'),
      // Use simplified keywords for better matching, or empty string for category-only search
      query_en: extractKeyword(plan.query_en) || '',
      query_ar: '', // Disable Arabic search for now to simplify matching
      facets: plan.facets || {},
      rationale: plan.rationale || plan.modifier || '',
      confidence: plan.confidence || 0.8
    };
  });

  console.log('🚀 Calling search_gifts_plans with:', JSON.stringify(plansArray, null, 2));
  
  // Try the single plan function first to debug
  if (plansArray.length === 1) {
    console.log('🧪 Testing single plan function first...');
    const { data: singleData, error: singleError } = await supabase.rpc('search_gifts_plan', {
      plan: plansArray[0]
    });
    
    if (singleError) {
      console.error('❌ Single plan function also failed:', singleError);
    } else {
      console.log('✅ Single plan function worked! Got', singleData?.length || 0, 'results');
    }
  }
  
  const { data, error } = await supabase.rpc('search_gifts_plans', {
    plans: plansArray
  });
  
  if (error) {
    console.error('Supabase search_gifts_plans error:', error);
    throw error;
  }
  
  // Group results by plan_index
  const groupedResults = {};
  data.forEach(item => {
    const planIndex = item.plan_index;
    if (!groupedResults[planIndex]) {
      groupedResults[planIndex] = [];
    }
    groupedResults[planIndex].push({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      store: item.store,
      category: item.category,
      image_url: item.image_url,
      product_url: item.product_url,
      tags: item.tags || [],
      relevance_score: Number(item.relevance_score),
      recommendation_reason: item.recommendation_reason
    });
  });

  // Combine GPT plans with their database results
  const enrichedGifts = gptPlans.map((plan, index) => ({
    ...plan,
    products: groupedResults[index + 1] || [], // plan_index is 1-based
    product: groupedResults[index + 1]?.[0] || null,
    enrichmentSuccess: (groupedResults[index + 1] || []).length > 0,
    searchQuery: plan.query_en || plan.search_context,
    recommendation_id: `plan_${index + 1}`,
    source: plan.store?.toLowerCase()
  }));

  return {
    gifts: enrichedGifts,
    total: enrichedGifts.length,
    search_metadata: {
      plans_processed: gptPlans.length,
      total_products_found: data.length,
      avg_products_per_plan: data.length / gptPlans.length,
      categories_covered: [...new Set(gptPlans.map(p => p.category))],
      stores_covered: [...new Set(gptPlans.map(p => p.store))],
      search_time_ms: 0
    }
  };
}

// Legacy function for backward compatibility
async function searchGifts(reqBody) {
  console.log('🔍 Legacy searchGifts called with:', JSON.stringify(reqBody, null, 2));
  
  try {
    // Extract and validate data from legacy request
    const preferences = reqBody.preferences || {};
    const filters = reqBody.filters || {};
    
    // Normalize category (map frontend format to database format)
    let category = preferences.category || 'gifts';
    
    // Create mapping from frontend categories to database categories
    const categoryMapping = {
      'Food & Drink': 'food_drink',
      'food & drink': 'food_drink', 
      'Home Scents': 'home_scents',
      'home scents': 'home_scents',
      'Home Decor': 'home_decor', 
      'home decor': 'home_decor',
      'Flowers': 'gifts',  // Flowers map to gifts
      'flowers': 'gifts',
      'Books': 'books',    // Books should stay as books (lowercase)
      'books': 'books',
      'Electronics': 'electronics',
      'electronics': 'electronics',
      'Makeup': 'makeup',
      'makeup': 'makeup',
      'Beauty': 'makeup',  // Beauty maps to makeup
      'beauty': 'makeup',
      'Perfume': 'perfume', 
      'perfume': 'perfume',
      'Care': 'care',
      'care': 'care',
      'Premium': 'premium',
      'premium': 'premium',
      'Nails': 'nails',
      'nails': 'nails',
      'Lenses': 'lenses',
      'lenses': 'lenses',
      'Fashion': 'fashion',
      'fashion': 'fashion',
      'Fitness': 'fitness',
      'fitness': 'fitness',
      'Gaming': 'gaming',
      'gaming': 'gaming',
      'Office': 'office',
      'office': 'office',
      'Devices': 'devices',
      'devices': 'devices',
      'Gifts': 'gifts',
      'gifts': 'gifts'
    };
    
    // Map frontend category to database category
    if (categoryMapping[category]) {
      category = categoryMapping[category];
      console.log(`📍 Category mapped: "${preferences.category}" → "${category}"`);
    } else {
      console.log(`⚠️ Unknown category "${category}", defaulting to "gifts"`);
      category = 'gifts';
    }
    
    // Parse budget from filters
    let minPrice = 0;
    let maxPrice = 999999;
    let budgetBand = 'Mid';
    
    if (filters.priceRange) {
      minPrice = filters.priceRange.min || 0;
      maxPrice = filters.priceRange.max || 999999;
      
      // Determine budget band
      const avgPrice = (minPrice + maxPrice) / 2;
      if (avgPrice < 200) budgetBand = 'Low';
      else if (avgPrice >= 500) budgetBand = 'High';
      else budgetBand = 'Mid';
    }
    
    // Clean and validate query strings
    const interests = preferences.interests ? String(preferences.interests).trim() : '';
    const occasion = preferences.occasion ? String(preferences.occasion).trim() : '';
    
    // Smart query selection - prioritize interests over conflicting category/occasion
    let queryEn = '';
    if (interests && interests.length > 0) {
      queryEn = interests;
      console.log(`🎯 Using interests as query: "${interests}"`);
    } else if (occasion && occasion.length > 0) {
      queryEn = occasion;  
      console.log(`📝 Using occasion as query: "${occasion}"`);
    } else {
      queryEn = category;
      console.log(`📂 Using category as query: "${category}"`);
    }
    
    // Handle conflicting signals - if interests contradict category, adjust category
    if (interests) {
      const interestToCategory = {
        'makeup': 'makeup',
        'beauty': 'makeup', 
        'cosmetics': 'makeup',
        'perfume': 'perfume',
        'fragrance': 'perfume',
        'books': 'books',
        'reading': 'books',
        'food': 'food_drink',
        'cooking': 'food_drink',
        'electronics': 'electronics',
        'tech': 'electronics',
        'gaming': 'gaming',
        'fitness': 'fitness',
        'workout': 'fitness'
      };
      
      const interestCategory = interestToCategory[interests.toLowerCase()];
      if (interestCategory && interestCategory !== category) {
        console.log(`🔄 Conflict resolved: Category "${category}" → "${interestCategory}" based on interests "${interests}"`);
        category = interestCategory;
      }
    }
    
    // Create a properly formatted plan with multi-store support
    const simplePlan = [{
      category: category,
      store: 'ALL', // Search across all stores for maximum variety
      query_en: queryEn,
      query_ar: '', // Empty string, not null
      facets: {
        budget_band: budgetBand,
        min_price: minPrice,
        max_price: maxPrice,
        relationship_tier: 'casual',
        occasion_tier: 'casual'
      },
      rationale: 'Legacy search compatibility layer with multi-store support',
      confidence: 0.7
    }];

    console.log('📦 Created plan for database:', JSON.stringify(simplePlan, null, 2));

    const result = await searchGiftsWithPlans(simplePlan);
    
    console.log('✅ Database search completed:', {
      plansProcessed: result.search_metadata?.plans_processed,
      totalProducts: result.search_metadata?.total_products_found
    });
    
    return {
      gifts: result.gifts[0]?.products || [],
      total: result.gifts[0]?.products?.length || 0,
      search_metadata: result.search_metadata
    };
    
  } catch (error) {
    console.error('❌ Legacy searchGifts error:', error);
    console.error('❌ Request body was:', JSON.stringify(reqBody, null, 2));
    throw new Error(`Legacy search failed: ${error.message}`);
  }
}

module.exports = {
  searchGifts,
  searchGiftsWithPlans
};