-- Advanced bilingual search functions for 16-category GPT pipeline
-- Requires pg_trgm extension and tsvector columns

-- First, add tsvector columns if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en_tsvector tsvector;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_ar_tsvector tsvector;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en_tsvector tsvector;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_ar_tsvector tsvector;

-- Create function to update tsvectors (run this to populate existing data)
CREATE OR REPLACE FUNCTION update_product_tsvectors() 
RETURNS void 
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE products SET
        name_en_tsvector = to_tsvector('english', COALESCE(name, '')),
        name_ar_tsvector = to_tsvector('arabic', COALESCE(name, '')),
        description_en_tsvector = to_tsvector('english', COALESCE(description, '')),
        description_ar_tsvector = to_tsvector('arabic', COALESCE(description, ''));
    
    RAISE NOTICE 'Updated tsvectors for % products', (SELECT COUNT(*) FROM products);
END;
$$;

-- Create trigger to auto-update tsvectors on insert/update
CREATE OR REPLACE FUNCTION trigger_update_product_tsvectors()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.name_en_tsvector = to_tsvector('english', COALESCE(NEW.name, ''));
    NEW.name_ar_tsvector = to_tsvector('arabic', COALESCE(NEW.name, ''));
    NEW.description_en_tsvector = to_tsvector('english', COALESCE(NEW.description, ''));
    NEW.description_ar_tsvector = to_tsvector('arabic', COALESCE(NEW.description, ''));
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS products_tsvector_update ON products;

-- Create the trigger
CREATE TRIGGER products_tsvector_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_product_tsvectors();

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_products_name_en_gin ON products USING GIN (name_en_tsvector);
CREATE INDEX IF NOT EXISTS idx_products_name_ar_gin ON products USING GIN (name_ar_tsvector);
CREATE INDEX IF NOT EXISTS idx_products_description_en_gin ON products USING GIN (description_en_tsvector);
CREATE INDEX IF NOT EXISTS idx_products_description_ar_gin ON products USING GIN (description_ar_tsvector);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_name ON products (category_id, name);
CREATE INDEX IF NOT EXISTS idx_products_category_price ON products (category_id, price_sar);
CREATE INDEX IF NOT EXISTS idx_products_store_category_price ON products (store_id, category_id, price_sar);

-- Main function: search products for a single GPT plan
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
            
            -- 2. Store preference bonus (reduced to encourage multi-store variety)
            CASE WHEN UPPER(s.code) = planned_store THEN 0.5 ELSE 0.0 END +
            
            -- 3. Bilingual text search score
            CASE 
                WHEN query_en != '' THEN
                    GREATEST(
                        ts_rank(p.name_en_tsvector, plainto_tsquery('english', query_en)) * 4.0,
                        ts_rank(p.description_en_tsvector, plainto_tsquery('english', query_en)) * 2.0,
                        similarity(p.name, query_en) * 3.0
                    )
                ELSE 0.0
            END +
            
            CASE 
                WHEN query_ar != '' THEN
                    GREATEST(
                        ts_rank(p.name_ar_tsvector, plainto_tsquery('arabic', query_ar)) * 4.0,
                        ts_rank(p.description_ar_tsvector, plainto_tsquery('arabic', query_ar)) * 2.0
                    )
                ELSE 0.0
            END +
            
            -- 4. Price fit bonus (within planned range)
            CASE 
                WHEN p.price_sar BETWEEN min_price AND max_price THEN 1.5
                WHEN budget_band = 'Low' AND p.price_sar < 200 THEN 1.0
                WHEN budget_band = 'Mid' AND p.price_sar BETWEEN 200 AND 499 THEN 1.0  
                WHEN budget_band = 'High' AND p.price_sar >= 500 THEN 1.0
                ELSE 0.0
            END +
            
            -- 5. Tag overlap bonus
            CASE 
                WHEN p.tags && string_to_array(query_en || ' ' || query_ar, ' ') THEN 1.0
                ELSE 0.0
            END +
            
            -- 6. Store-category synergy bonus (reduced to encourage cross-store variety)
            CASE 
                WHEN UPPER(s.code) = 'FLOWARD' AND c.code IN ('gifts', 'premium', 'perfume', 'fashion') THEN 0.5
                WHEN UPPER(s.code) = 'JARIR' AND c.code IN ('books', 'electronics', 'devices', 'office', 'gaming') THEN 0.5
                WHEN UPPER(s.code) = 'NICEONE' AND c.code IN ('makeup', 'care', 'nails', 'lenses', 'home_scents', 'fitness') THEN 0.5
                ELSE 0.0
            END +
            
            -- 7. Multi-store variety bonus (new)
            CASE 
                WHEN (SELECT COUNT(DISTINCT store_id) FROM products p2 JOIN stores s2 ON p2.store_id = s2.id 
                     WHERE p2.category_id = p.category_id) > 1 THEN 1.0
                ELSE 0.0
            END
        ) as relevance_score,
        
        -- Generate recommendation reason
        CASE 
            WHEN c.code = planned_category AND UPPER(s.code) = planned_store THEN
                'Perfect match: ' || plan->>'rationale'
            WHEN c.code = planned_category THEN
                'Category match: ' || COALESCE(plan->>'rationale', 'Fits your preferences')
            WHEN UPPER(s.code) = planned_store THEN
                'Store specialty: ' || s.name || ' recommendation'
            WHEN p.price_sar BETWEEN min_price AND max_price THEN
                'Within budget: ' || budget_band || ' range (' || min_price || '-' || max_price || ' SAR)'
            ELSE
                'Alternative option from ' || s.name
        END as recommendation_reason,
        
        planned_category as plan_category,
        planned_store as plan_store
        
    FROM products p
    JOIN stores s ON p.store_id = s.id
    JOIN categories c ON p.category_id = c.id
    WHERE 
        -- Enhanced cross-category flexibility for maximum variety
        (c.code = planned_category OR (
            -- Expanded cross-category relationships for better results
            planned_category = 'premium' AND c.code IN ('perfume', 'fashion', 'gifts', 'care', 'makeup') OR
            planned_category = 'gifts' AND c.code IN ('premium', 'perfume', 'home_decor', 'fashion', 'care') OR
            planned_category = 'devices' AND c.code IN ('electronics', 'gaming', 'office') OR
            planned_category = 'electronics' AND c.code IN ('devices', 'gaming', 'office') OR
            planned_category = 'care' AND c.code IN ('makeup', 'fitness', 'premium', 'nails') OR
            planned_category = 'makeup' AND c.code IN ('care', 'nails', 'premium', 'perfume') OR
            planned_category = 'books' AND c.code IN ('office', 'electronics') OR
            planned_category = 'gaming' AND c.code IN ('electronics', 'devices', 'office') OR
            planned_category = 'fashion' AND c.code IN ('premium', 'gifts', 'perfume') OR
            planned_category = 'fitness' AND c.code IN ('care', 'fashion', 'devices') OR
            planned_category = 'home_decor' AND c.code IN ('gifts', 'premium', 'home_scents') OR
            planned_category = 'home_scents' AND c.code IN ('home_decor', 'care', 'premium') OR
            planned_category = 'perfume' AND c.code IN ('premium', 'gifts', 'makeup', 'care') OR
            planned_category = 'nails' AND c.code IN ('makeup', 'care', 'fashion') OR
            planned_category = 'lenses' AND c.code IN ('care', 'makeup', 'devices') OR
            planned_category = 'office' AND c.code IN ('books', 'electronics', 'devices', 'gaming') OR
            planned_category = 'food_drink' AND c.code IN ('gifts', 'premium', 'care')
        ))
        
        -- Multi-store search: search across ALL stores for maximum variety
        AND (true) -- Always include all stores
        
        -- Text search filter (if queries provided)
        AND (
            query_en = '' OR query_ar = '' OR
            p.name_en_tsvector @@ plainto_tsquery('english', query_en) OR
            p.name_ar_tsvector @@ plainto_tsquery('arabic', query_ar) OR
            p.description_en_tsvector @@ plainto_tsquery('english', query_en) OR  
            p.description_ar_tsvector @@ plainto_tsquery('arabic', query_ar) OR
            p.name ILIKE '%' || query_en || '%' OR
            p.tags && string_to_array(query_en || ' ' || query_ar, ' ')
        )
    ORDER BY 
        -- Primary: relevance score with multi-store support (higher is better)
        (
            CASE WHEN c.code = planned_category THEN 3.0 ELSE 0.0 END +
            CASE WHEN UPPER(s.code) = planned_store THEN 0.5 ELSE 0.0 END +
            CASE WHEN query_en != '' THEN GREATEST(ts_rank(p.name_en_tsvector, plainto_tsquery('english', query_en)) * 4.0, similarity(p.name, query_en) * 3.0) ELSE 0.0 END +
            CASE WHEN query_ar != '' THEN ts_rank(p.name_ar_tsvector, plainto_tsquery('arabic', query_ar)) * 4.0 ELSE 0.0 END +
            CASE WHEN p.price_sar BETWEEN min_price AND max_price THEN 1.5 ELSE 0.0 END +
            -- Store diversity bonus in sorting
            CASE WHEN (SELECT COUNT(DISTINCT store_id) FROM products p3 
                     WHERE p3.category_id = p.category_id) > 1 THEN 1.0 ELSE 0.0 END
        ) DESC,
        
        -- Secondary: price (prefer mid-range for gifts)  
        ABS(p.price_sar - ((min_price + max_price) / 2)) ASC,
        
        -- Tertiary: name alphabetically for consistency
        p.name ASC
    LIMIT 100; -- Return top 100 matches per plan for better variety
END;
$$;

-- Batch function: search products for multiple GPT plans
CREATE OR REPLACE FUNCTION search_gifts_plans(
    plans JSONB[]
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
    plan_index INTEGER,
    plan_category TEXT,
    plan_store TEXT,
    plan_confidence NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
    plan JSONB;
    plan_idx INTEGER := 0;
BEGIN
    -- Loop through each plan and search
    FOREACH plan IN ARRAY plans LOOP
        plan_idx := plan_idx + 1;
        
        RETURN QUERY
        SELECT 
            sp.id,
            sp.name,
            sp.description,
            sp.price,
            sp.store,
            sp.category,
            sp.image_url,
            sp.product_url,
            sp.tags,
            sp.relevance_score,
            sp.recommendation_reason,
            plan_idx as plan_index,
            sp.plan_category,
            sp.plan_store,
            COALESCE((plan->>'confidence')::NUMERIC, 0.8) as plan_confidence
        FROM search_gifts_plan(plan) sp
        ORDER BY sp.relevance_score DESC
        LIMIT 20; -- Top 20 products per plan for better variety
    END LOOP;
    
    RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_gifts_plan TO anon;
GRANT EXECUTE ON FUNCTION search_gifts_plan TO authenticated;
GRANT EXECUTE ON FUNCTION search_gifts_plans TO anon;  
GRANT EXECUTE ON FUNCTION search_gifts_plans TO authenticated;
GRANT EXECUTE ON FUNCTION update_product_tsvectors TO anon;
GRANT EXECUTE ON FUNCTION update_product_tsvectors TO authenticated;

-- Update existing product tsvectors
SELECT update_product_tsvectors();