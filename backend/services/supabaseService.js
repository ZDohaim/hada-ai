const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function searchGifts(reqBody) {
  const { data, error } = await supabase.rpc('search_gifts', {
    p_preferences: reqBody.preferences,
    p_filters: reqBody.filters || {},
    p_limit: reqBody.limit || 20
  });
  
  if (error) throw error;
  
  return {
    gifts: data.map(x => ({
      id: x.id,
      name: x.name,
      description: x.description,
      price: Number(x.price),
      store: x.store,
      category: x.category,
      image_url: x.image_url,
      product_url: x.product_url,
      tags: x.tags || [],
      relevance_score: Number(x.relevance_score),
      recommendation_reason: x.recommendation_reason
    })),
    total: data.length,
    search_metadata: {
      query_processed: [
        reqBody?.preferences?.interests, 
        reqBody?.preferences?.occasion, 
        reqBody?.preferences?.relationship, 
        reqBody?.preferences?.budget
      ].filter(Boolean).join(' '),
      stores_searched: (reqBody?.filters?.stores || ['floward','jarir','niceone']).map(String),
      search_time_ms: 0
    }
  };
}

module.exports = {
  searchGifts
};