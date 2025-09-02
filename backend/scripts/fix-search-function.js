const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSearchFunction() {
  console.log('🔧 Updating search function for flexible text matching...\n');
  
  try {
    // Create the updated search function with flexible text matching
    const updateFunctionSQL = `
-- Updated search function with flexible text matching
CREATE OR REPLACE FUNCTION search_gifts_plan(
    plan JSONB
) RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    price NUMERIC,
    store TEXT,
    category TEXT,
    image_url TEXT,
    product_url TEXT,
    tags TEXT[],
    relevance_score NUMERIC,
    recommendation_reason TEXT,
    plan_category TEXT,
    plan_store TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    planned_category TEXT;
    planned_store TEXT;
    query_en TEXT := '';
    query_ar TEXT := '';
    min_price NUMERIC := 0;
    max_price NUMERIC := 999999;
    budget_band TEXT;
BEGIN
    -- Extract plan parameters
    planned_category := plan->>'category';
    planned_store := UPPER(plan->>'store');
    query_en := COALESCE(plan->>'query_en', '');
    query_ar := COALESCE(plan->>'query_ar', '');
    
    -- Extract price range from facets
    IF plan ? 'facets' THEN
        min_price := COALESCE((plan->'facets'->>'min_price')::NUMERIC, 0);
        max_price := COALESCE((plan->'facets'->>'max_price')::NUMERIC, 999999);
        budget_band := plan->'facets'->>'budget_band';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        COALESCE(p.description, '') as description,
        p.price_sar as price,
        s.code as store,
        c.code as category,
        p.image_url,
        p.product_url,
        COALESCE(p.tags, ARRAY[]::TEXT[]) as tags,
        
        -- Advanced relevance scoring
        (
            -- 1. Exact category match (highest priority)
            CASE WHEN c.code = planned_category THEN 3.0 ELSE 0.0 END +
            
            -- 2. Store preference bonus
            CASE WHEN UPPER(s.code) = planned_store THEN 0.5 ELSE 0.0 END +
            
            -- 3. Text search bonus (if matched)
            CASE 
                WHEN query_en != '' AND (
                    p.name ILIKE '%' || split_part(query_en, ' ', 1) || '%' OR
                    p.name ILIKE '%' || split_part(query_en, ' ', 2) || '%' OR
                    p.description ILIKE '%' || split_part(query_en, ' ', 1) || '%'
                ) THEN 1.0
                ELSE 0.0
            END +
            
            -- 4. Price fit bonus
            CASE 
                WHEN p.price_sar BETWEEN min_price AND max_price THEN 1.5
                ELSE 0.0
            END +
            
            -- 5. Store-category synergy bonus
            CASE 
                WHEN UPPER(s.code) = 'FLOWARD' AND c.code IN ('gifts', 'premium', 'perfume', 'fashion') THEN 0.5
                WHEN UPPER(s.code) = 'JARIR' AND c.code IN ('books', 'electronics', 'devices', 'office', 'gaming') THEN 0.5
                WHEN UPPER(s.code) = 'NICEONE' AND c.code IN ('makeup', 'care', 'nails', 'lenses', 'home_scents', 'fitness') THEN 0.5
                ELSE 0.0
            END
        ) as relevance_score,
        
        -- Generate recommendation reason
        CASE 
            WHEN c.code = planned_category THEN
                'Perfect match: ' || COALESCE(plan->>'rationale', 'Fits your preferences')
            WHEN p.price_sar BETWEEN min_price AND max_price THEN
                'Within budget: ' || min_price || '-' || max_price || ' SAR'
            ELSE
                'Alternative option from ' || s.name
        END as recommendation_reason,
        
        planned_category as plan_category,
        planned_store as plan_store
        
    FROM products p
    JOIN stores s ON p.store_id = s.id
    JOIN categories c ON p.category_id = c.id
    WHERE 
        -- Enhanced cross-category flexibility
        (c.code = planned_category OR (
            planned_category = 'premium' AND c.code IN ('perfume', 'fashion', 'gifts', 'care', 'makeup') OR
            planned_category = 'gifts' AND c.code IN ('premium', 'perfume', 'home_decor', 'fashion', 'care') OR
            planned_category = 'care' AND c.code IN ('makeup', 'fitness', 'premium', 'nails') OR
            planned_category = 'makeup' AND c.code IN ('care', 'nails', 'premium', 'perfume') OR
            planned_category = 'perfume' AND c.code IN ('premium', 'gifts', 'makeup', 'care') OR
            planned_category = 'fashion' AND c.code IN ('premium', 'gifts', 'perfume')
        ))
        
        -- Price range filter
        AND p.price_sar BETWEEN min_price AND max_price
        
        -- FLEXIBLE TEXT SEARCH: If text query provided, try to match, but don't exclude category matches
        AND (
            -- If no text queries, include all category matches
            (query_en = '' AND query_ar = '') OR
            -- If text queries provided, try flexible matching
            p.name ILIKE '%' || split_part(query_en, ' ', 1) || '%' OR
            p.name ILIKE '%' || split_part(query_en, ' ', 2) || '%' OR  
            p.description ILIKE '%' || split_part(query_en, ' ', 1) || '%' OR
            p.description ILIKE '%' || split_part(query_en, ' ', 2) || '%' OR
            -- Fallback: if no text match but category matches, still include
            c.code = planned_category
        )
    ORDER BY 
        -- Relevance score (higher is better)
        (
            CASE WHEN c.code = planned_category THEN 3.0 ELSE 0.0 END +
            CASE WHEN p.price_sar BETWEEN min_price AND max_price THEN 1.5 ELSE 0.0 END +
            CASE WHEN query_en != '' AND p.name ILIKE '%' || split_part(query_en, ' ', 1) || '%' THEN 1.0 ELSE 0.0 END
        ) DESC,
        p.price_sar ASC,
        p.name ASC
    LIMIT 20;
END;
$$;
`;

    console.log('📝 Executing function update...');
    
    const { error } = await supabase.rpc('exec', { sql: updateFunctionSQL });
    
    if (error) {
      console.error('❌ SQL execution error:', error);
      console.log('Trying alternative method...');
      
      // Try executing raw SQL
      const { data, error: rawError } = await supabase
        .from('information_schema.routines') 
        .select('*')
        .limit(1);
        
      console.log('Database connection test:', rawError ? 'Failed' : 'Success');
      return;
    }
    
    console.log('✅ Function updated successfully!');
    
    // Test the updated function
    console.log('\n🧪 Testing updated function...');
    
    const testPlan = {
      category: 'perfume',
      store: 'ALL',
      query_en: 'elegant perfume gift',
      query_ar: 'هدية عطر أنيق',
      facets: {
        min_price: 200,
        max_price: 300
      }
    };
    
    const { data: results, error: testError } = await supabase.rpc('search_gifts_plan', {
      plan: testPlan
    });
    
    if (testError) {
      console.error('❌ Test error:', testError);
      return;
    }
    
    console.log(`✅ Test completed: found ${results?.length || 0} results`);
    
    if (results && results.length > 0) {
      console.log('📦 Sample results:');
      results.slice(0, 3).forEach((item, i) => {
        console.log(`${i+1}. ${item.name} - ${item.price} SAR (score: ${item.relevance_score})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
  }
}

fixSearchFunction();