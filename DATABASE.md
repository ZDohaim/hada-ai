# Database Architecture Documentation

This document details the advanced database architecture powering Hadai.ai's bilingual search system.

## 📊 Database Schema

### Core Tables

#### `products`
Primary product catalog with bilingual search capabilities.

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_sar NUMERIC NOT NULL,
  image_url TEXT,
  product_url TEXT,
  tags TEXT[],
  store_id UUID REFERENCES stores(id),
  category_id UUID REFERENCES categories(id),
  
  -- Bilingual search columns
  name_en_tsvector TSVECTOR,
  name_ar_tsvector TSVECTOR,
  description_en_tsvector TSVECTOR,
  description_ar_tsvector TSVECTOR,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `stores`
Store information for the three major Saudi e-commerce platforms.

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'FLOWARD', 'JARIR', 'NICEONE'
  name TEXT NOT NULL,
  description TEXT,
  specialization TEXT[], -- Store specializations
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `categories` 
16-category classification system for intelligent product routing.

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'makeup', 'books', 'gifts', etc.
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔍 Advanced Search System

### Bilingual Indexing

The system uses PostgreSQL's full-text search capabilities with separate indexes for English and Arabic:

```sql
-- Performance indexes for bilingual search
CREATE INDEX idx_products_name_en_gin ON products USING GIN (name_en_tsvector);
CREATE INDEX idx_products_name_ar_gin ON products USING GIN (name_ar_tsvector);
CREATE INDEX idx_products_description_en_gin ON products USING GIN (description_en_tsvector);
CREATE INDEX idx_products_description_ar_gin ON products USING GIN (description_ar_tsvector);

-- Trigram similarity index for fuzzy matching
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- Composite indexes for filtering
CREATE INDEX idx_products_category_name ON products (category_id, name);
CREATE INDEX idx_products_category_price ON products (category_id, price_sar);
CREATE INDEX idx_products_store_category_price ON products (store_id, category_id, price_sar);
```

### tsvector Auto-Population

Automatic tsvector column population via triggers:

```sql
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

CREATE TRIGGER products_tsvector_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_product_tsvectors();
```

## 🎯 Search Functions

### Primary Search Function

**`search_gifts_plan(plan JSONB)`** - Searches products for a single GPT-generated plan.

#### Input Schema
```json
{
  "category": "makeup",
  "store": "NICEONE",
  "query_en": "lipstick matte long-lasting",
  "query_ar": "أحمر شفاه مقاوم للماء",
  "facets": {
    "budget_band": "Mid",
    "min_price": 100,
    "max_price": 500,
    "relationship_tier": "casual",
    "occasion_tier": "casual"
  },
  "rationale": "Perfect for everyday makeup needs",
  "confidence": 0.85
}
```

#### Advanced Scoring Algorithm

The function uses a sophisticated multi-factor scoring system:

1. **Exact Category Match (3.0 points)**: Highest priority for category alignment
2. **Store Match Bonus (2.0 points)**: Preference for specified store
3. **Bilingual Text Search (up to 4.0 points)**: 
   - Name relevance: English (4.0), Arabic (4.0)
   - Description relevance: English (2.0), Arabic (2.0)
   - Fuzzy similarity: up to 3.0 points
4. **Price Fit Bonus (1.5 points)**: Products within budget range
5. **Tag Overlap (1.0 point)**: Matching product tags
6. **Store-Category Synergy (1.0 point)**: 
   - FLOWARD + (gifts, premium, perfume, fashion)
   - JARIR + (books, electronics, devices, office, gaming)
   - NICEONE + (makeup, care, nails, lenses, home_scents, fitness)

### Batch Search Function

**`search_gifts_plans(plans JSONB[])`** - Efficiently searches multiple plans in a single call.

Returns up to 5 products per plan with plan indexing for result grouping.

## 🏪 Store-Category Matrix

### FLOWARD (Premium/Luxury)
- **Primary Categories**: gifts, premium, perfume, fashion
- **Budget Focus**: 300+ SAR
- **Specialization**: Flowers, jewelry, luxury bundles
- **Search Keywords**: premium, luxury, elegant, bouquet, roses, arrangement, exclusive

### JARIR (Tech/Educational)
- **Primary Categories**: books, electronics, devices, office, gaming
- **Budget Focus**: 100-500 SAR
- **Specialization**: Technology, books, office supplies
- **Search Keywords**: bestseller, trending, latest, professional, advanced

### NICEONE (Beauty/Personal Care)
- **Primary Categories**: makeup, care, nails, lenses, home_scents, fitness
- **Budget Focus**: 50-200 SAR
- **Specialization**: Beauty, cosmetics, personal care
- **Search Keywords**: affordable, popular, trendy, long-lasting, everyday

## 🎨 16-Category System

| Category | Code | Store Preference | Description |
|----------|------|------------------|-------------|
| Gifts | `gifts` | FLOWARD | General gift items, flowers |
| Makeup | `makeup` | NICEONE | Cosmetics, beauty products |
| Perfume | `perfume` | FLOWARD/NICEONE | Fragrances, scents |
| Books | `books` | JARIR | Literature, educational |
| Electronics | `electronics` | JARIR | Consumer electronics |
| Devices | `devices` | JARIR | Tech gadgets, phones |
| Care | `care` | NICEONE | Skincare, health |
| Premium | `premium` | FLOWARD | Luxury items |
| Nails | `nails` | NICEONE | Nail care, accessories |
| Lenses | `lenses` | NICEONE | Contact lenses |
| Fashion | `fashion` | FLOWARD | Clothing, accessories |
| Fitness | `fitness` | NICEONE | Sports, wellness |
| Gaming | `gaming` | JARIR | Video games, accessories |
| Home Scents | `home_scents` | NICEONE | Air fresheners, candles |
| Home Decor | `home_decor` | ALL | Home decoration |
| Office | `office` | JARIR | Office supplies |
| Food & Drink | `food_drink` | ALL | Food items, beverages |

## 🔧 Performance Optimizations

### Query Optimization
- **Limit 30 per plan**: Prevents excessive result sets
- **Early filtering**: Category and store filters applied first
- **Index utilization**: All queries designed to use GIN and composite indexes
- **tsvector pre-computation**: Search vectors calculated on insert/update

### Caching Strategy
- **Function result caching**: Not implemented at SQL level (handled by application)
- **Connection pooling**: Managed by Supabase
- **Query plan caching**: PostgreSQL automatic optimization

### Database Monitoring
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE tablename = 'products';

-- Monitor search performance
EXPLAIN ANALYZE SELECT * FROM search_gifts_plan('{"category": "makeup", "store": "NICEONE"}');
```

## 🚀 Setup Instructions

### 1. Create Tables
Run the migration files in order:
```sql
-- Basic search setup
\i backend/sql/02_search_function.sql

-- Advanced bilingual functions  
\i backend/sql/03_advanced_search_functions.sql
```

### 2. Populate Data
After importing product data, update search vectors:
```sql
SELECT update_product_tsvectors();
```

### 3. Verify Indexes
Ensure all indexes are created:
```sql
\di products*
```

### 4. Test Functions
Verify search functionality:
```sql
SELECT COUNT(*) FROM search_gifts_plan('{"category": "makeup", "query_en": "lipstick"}');
```

## 🔍 Troubleshooting

### Common Issues

1. **Slow Search Performance**
   ```sql
   -- Check if indexes exist
   SELECT indexname FROM pg_indexes WHERE tablename = 'products';
   
   -- Rebuild if needed
   REINDEX TABLE products;
   ```

2. **No Search Results**
   ```sql
   -- Verify tsvector population
   SELECT COUNT(*) FROM products WHERE name_en_tsvector IS NOT NULL;
   
   -- Repopulate if needed
   SELECT update_product_tsvectors();
   ```

3. **Category Mapping Issues**
   ```sql
   -- Check category codes
   SELECT code, name FROM categories ORDER BY code;
   ```

### Performance Monitoring
```sql
-- Monitor function execution time
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%search_gifts_plan%';

-- Check table statistics
SELECT * FROM pg_stat_user_tables WHERE relname = 'products';
```

## 📊 Analytics Queries

### Search Analytics
```sql
-- Most searched categories
SELECT c.name, COUNT(*) as searches
FROM search_logs sl
JOIN categories c ON c.code = sl.category
GROUP BY c.name
ORDER BY searches DESC;

-- Store popularity
SELECT s.name, AVG(rating) as avg_rating
FROM products p
JOIN stores s ON s.id = p.store_id  
GROUP BY s.name;
```

### Performance Metrics
```sql
-- Average products per category
SELECT c.name, COUNT(p.id) as product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.name
ORDER BY product_count DESC;

-- Price distribution by store
SELECT s.name, 
       MIN(p.price_sar) as min_price,
       AVG(p.price_sar) as avg_price,
       MAX(p.price_sar) as max_price
FROM products p
JOIN stores s ON s.id = p.store_id
GROUP BY s.name;
```

This database architecture provides the foundation for Hadai.ai's intelligent, culturally-aware, and performant gift recommendation system.