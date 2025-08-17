-- Foundation data for Hada AI Backend
-- Run this in Supabase SQL Editor to populate stores and categories

-- Create stores table if it doesn't exist
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table if it doesn't exist  
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_sar NUMERIC NOT NULL,
    image_url TEXT,
    product_url TEXT,
    tags TEXT[],
    store_id UUID NOT NULL REFERENCES stores(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    raw JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert stores data
INSERT INTO stores (code, name) VALUES 
    ('floward', 'Floward'),
    ('jarir', 'Jarir Bookstore'), 
    ('niceone', 'NiceOne')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert categories data based on existing normalization logic
INSERT INTO categories (code, name) VALUES
    ('gifts', 'Gifts'),
    ('perfume', 'Perfume & Fragrances'),
    ('makeup', 'Makeup & Beauty'),
    ('care', 'Personal Care'),
    ('health-nutrition', 'Health & Nutrition'),
    ('devices', 'Electronics & Devices'),
    ('premium', 'Premium Products'),
    ('nails', 'Nail Care'),
    ('lenses', 'Contact Lenses'),
    ('home-scents', 'Home Scents'),
    ('food-drink', 'Food & Beverages'),
    ('books', 'Books & Education'),
    ('office', 'Office Supplies'),
    ('gaming', 'Gaming'),
    ('tech', 'Technology'),
    ('jewelry', 'Jewelry & Accessories'),
    ('flowers', 'Fresh Flowers'),
    ('luxury', 'Luxury Items')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON products USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_tags_gin ON products USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON products (store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price_sar);

-- Enable trigram extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify data insertion
SELECT 'Stores inserted:' as info, count(*) as count FROM stores
UNION ALL
SELECT 'Categories inserted:', count(*) FROM categories;