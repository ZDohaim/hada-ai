-- Search function for gifts based on user preferences
-- This function searches products and returns relevant gift suggestions

CREATE OR REPLACE FUNCTION search_gifts(
    p_preferences JSONB DEFAULT '{}'::JSONB,
    p_filters JSONB DEFAULT '{}'::JSONB,
    p_limit INTEGER DEFAULT 20
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
    recommendation_reason TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    search_query TEXT := '';
    store_filter TEXT[];
    category_filter TEXT[];
    price_min NUMERIC := 0;
    price_max NUMERIC := 999999;
    age_group TEXT := '';
    gender_pref TEXT := '';
BEGIN
    -- Extract search parameters from preferences
    IF p_preferences ? 'interests' AND p_preferences->>'interests' != '' THEN
        search_query := p_preferences->>'interests';
    ELSIF p_preferences ? 'occasion' AND p_preferences->>'occasion' != '' THEN
        search_query := p_preferences->>'occasion';
    END IF;
    
    -- Extract filters
    IF p_filters ? 'stores' THEN
        store_filter := ARRAY(SELECT jsonb_array_elements_text(p_filters->'stores'));
    END IF;
    
    IF p_filters ? 'categories' THEN
        category_filter := ARRAY(SELECT jsonb_array_elements_text(p_filters->'categories'));
    END IF;
    
    -- Extract price range from filters
    IF p_filters ? 'priceRange' THEN
        IF (p_filters->'priceRange') ? 'min' AND 
           (p_filters->'priceRange'->>'min') != '' AND 
           (p_filters->'priceRange'->>'min') != 'null' THEN
            price_min := (p_filters->'priceRange'->>'min')::NUMERIC;
        END IF;
        
        IF (p_filters->'priceRange') ? 'max' AND 
           (p_filters->'priceRange'->>'max') != '' AND 
           (p_filters->'priceRange'->>'max') != 'null' THEN
            price_max := (p_filters->'priceRange'->>'max')::NUMERIC;
        END IF;
    END IF;
    
    -- Extract demographic info
    IF p_preferences ? 'age' AND p_preferences->>'age' != '' THEN
        age_group := p_preferences->>'age';
    END IF;
    
    IF p_preferences ? 'gender' AND p_preferences->>'gender' != '' THEN
        gender_pref := p_preferences->>'gender';
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
        -- Simple relevance scoring based on text similarity and price range
        CASE 
            WHEN search_query != '' THEN
                GREATEST(
                    similarity(p.name, search_query) * 2,
                    similarity(COALESCE(p.description, ''), search_query),
                    CASE WHEN p.tags && string_to_array(search_query, ' ') THEN 1.5 ELSE 0 END
                )
            ELSE 0.5
        END +
        -- Bonus for being in price range
        CASE 
            WHEN p.price_sar BETWEEN price_min AND price_max THEN 0.3
            ELSE 0
        END as relevance_score,
        -- Generate recommendation reason
        CASE 
            WHEN search_query != '' AND similarity(p.name, search_query) > 0.2 THEN
                'Matches your interest in ' || search_query
            WHEN p.price_sar BETWEEN price_min AND price_max THEN
                'Within your budget range'
            ELSE
                'Popular choice from ' || s.name
        END as recommendation_reason
    FROM products p
    JOIN stores s ON p.store_id = s.id
    JOIN categories c ON p.category_id = c.id
    WHERE 
        -- Store filter
        (store_filter IS NULL OR s.code = ANY(store_filter))
        -- Category filter
        AND (category_filter IS NULL OR c.code = ANY(category_filter))
        -- Price filter
        AND p.price_sar BETWEEN price_min AND price_max
        -- Text search (if provided)
        AND (
            search_query = '' OR 
            p.name ILIKE '%' || search_query || '%' OR
            p.description ILIKE '%' || search_query || '%' OR
            p.tags && string_to_array(search_query, ' ')
        )
    ORDER BY 
        -- Primary: relevance score
        CASE 
            WHEN search_query != '' THEN
                GREATEST(
                    similarity(p.name, search_query) * 2,
                    similarity(COALESCE(p.description, ''), search_query),
                    CASE WHEN p.tags && string_to_array(search_query, ' ') THEN 1.5 ELSE 0 END
                )
            ELSE 0.5
        END +
        CASE 
            WHEN p.price_sar BETWEEN price_min AND price_max THEN 0.3
            ELSE 0
        END DESC,
        -- Secondary: price (lower is better for gifts)
        p.price_sar ASC,
        -- Tertiary: name alphabetically
        p.name ASC
    LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_gifts TO anon;
GRANT EXECUTE ON FUNCTION search_gifts TO authenticated;