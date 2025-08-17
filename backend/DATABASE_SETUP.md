# Database Setup Guide

Complete guide for setting up and populating the Hada AI Supabase database.

## Quick Start

```bash
# 1. Set up foundation data
npm run setup-db

# 2. Run the SQL script in Supabase SQL Editor
# (Copy/paste from backend/sql/01_foundation_data.sql)

# 3. Populate with all products
npm run ingest-all

# 4. Or test with a single store first
npm run dry-run niceone
```

## Step-by-Step Setup

### 1. Prerequisites
- Supabase project created and configured
- Environment variables set in `.env`:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  NICEONE_MERCHANT_ID=your-niceone-id
  NICEONE_RESTADMIN_ID=your-restadmin-id
  NICEONE_SESSION=your-session-token
  ```

### 2. Database Schema Setup
Run the foundation SQL script in Supabase SQL Editor:
```sql
-- Copy and paste from: backend/sql/01_foundation_data.sql
```

This creates:
- `stores` table with 3 stores (floward, jarir, niceone)
- `categories` table with 18 gift categories  
- `products` table with proper constraints and indexes
- Performance indexes for search optimization

### 3. Product Data Population

#### Option A: Full Population (Recommended)
```bash
npm run ingest-all
```
Ingests products from all stores using curated search terms.

#### Option B: Single Store Testing
```bash
npm run dry-run niceone    # Preview without database changes
npm run populate-db ingest niceone    # Actually ingest
npm run populate-db ingest jarir
npm run populate-db ingest floward
```

#### Option C: Targeted Categories
```bash
npm run populate-db ingest-all --categories makeup,perfume,gifts
npm run populate-db ingest niceone --categories makeup,care --limit 100
```

### 4. Verification

Check your Supabase dashboard:
```sql
-- Verify data was inserted
SELECT 
  s.name as store,
  c.name as category,
  COUNT(*) as product_count,
  AVG(price_sar) as avg_price
FROM products p
JOIN stores s ON p.store_id = s.id  
JOIN categories c ON p.category_id = c.id
GROUP BY s.name, c.name
ORDER BY s.name, product_count DESC;
```

## Search Terms Used

The ingestion uses these curated search terms for each store:

### NiceOne (Beauty & Personal Care)
- **Makeup**: makeup, cosmetics, lipstick, foundation, eyeshadow, mascara
- **Perfume**: perfume, fragrance, cologne, scent, eau de parfum
- **Care**: skincare, moisturizer, cleanser, serum, face care, body care
- **Health & Nutrition**: vitamins, supplements, health, nutrition, wellness
- **Nails**: nail polish, nail care, manicure, nail art
- **Lenses**: contact lenses, colored lenses, daily lenses

### Jarir (Tech & Education)
- **Books**: books, bestsellers, arabic books, english books, educational books
- **Devices**: laptop, tablet, smartphone, electronics, gaming, tech gadgets
- **Office**: office supplies, stationery, notebooks, pens, desk accessories
- **Gaming**: gaming, playstation, xbox, nintendo, gaming accessories
- **Tech**: technology, gadgets, computers, accessories, mobile accessories

### Floward (Luxury & Gifts)
- **Gifts**: roses, bouquet, luxury flowers, premium arrangement, anniversary flowers
- **Luxury**: luxury gifts, premium bundles, elegant presents, exclusive items
- **Jewelry**: jewelry, premium accessories, luxury watches, elegant jewelry
- **Premium**: premium, luxury, exclusive, elegant, sophisticated

## CLI Commands Reference

```bash
# Basic commands
npm run populate-db help                    # Show help
npm run setup-db                           # Initial setup guide
npm run ingest-all                         # Populate all stores

# Single store ingestion  
npm run populate-db ingest niceone         # Ingest NiceOne products
npm run populate-db ingest jarir           # Ingest Jarir products
npm run populate-db ingest floward         # Ingest Floward products

# Testing and validation
npm run dry-run niceone                    # Preview NiceOne ingestion
npm run populate-db validate niceone       # Validate data quality
npm run populate-db report                 # Generate quality report

# Advanced options
npm run populate-db ingest niceone --limit 100 --categories makeup,perfume
npm run populate-db ingest-all --categories gifts,luxury
```

## Data Processing Pipeline

1. **API Fetching**: Uses existing server.js API integrations
2. **Normalization**: Converts API responses to unified product schema
3. **Validation**: Checks required fields, price ranges, URL validity
4. **Deduplication**: Removes duplicates within batch and against database
5. **Database Insertion**: Bulk inserts valid, unique products

## Expected Results

After full ingestion, expect approximately:
- **NiceOne**: 500-1000 beauty/care products
- **Jarir**: 300-800 tech/education products  
- **Floward**: 200-500 luxury/gift products
- **Total**: 1000-2300 products across 18 categories

## Troubleshooting

### Common Issues

**Environment Variables Missing**
```bash
❌ Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY
```
Check your `.env` file has all required variables.

**API Rate Limits**
```bash
❌ Error ingesting niceone/makeup/"lipstick": Request failed with status code 429
```
The script includes rate limiting (1 second delays). For heavy usage, increase delays.

**Database Connection Issues**
```bash
❌ Error: Store not found: niceone
```
Ensure you've run the foundation SQL script in Supabase first.

**Low Success Rates**
```bash
✅ NICEONE complete: 45 products inserted
   Success rate: 23%
```
Check API authentication credentials and search term relevance.

### Performance Optimization

**Increase Batch Sizes**
```bash
npm run populate-db ingest niceone --limit 100   # More products per search
```

**Target High-Value Categories**
```bash
npm run populate-db ingest-all --categories gifts,luxury,devices
```

**Parallel Processing** (Future Enhancement)
Current implementation processes sequentially to respect API limits.

## Database Maintenance

### Regular Updates
```bash
# Weekly product refresh
npm run populate-db ingest-all --limit 30

# Price updates
npm run populate-db validate all
```

### Data Cleanup
```sql
-- Remove products with invalid prices
DELETE FROM products WHERE price_sar <= 0 OR price_sar > 50000;

-- Remove products without images
DELETE FROM products WHERE image_url IS NULL OR image_url = '';

-- Update outdated products (older than 30 days)
DELETE FROM products WHERE created_at < NOW() - INTERVAL '30 days';
```

### Monitoring Queries
```sql
-- Products per store
SELECT s.name, COUNT(*) as count 
FROM products p 
JOIN stores s ON p.store_id = s.id 
GROUP BY s.name;

-- Price distribution
SELECT 
  CASE 
    WHEN price_sar < 50 THEN 'Under 50 SAR'
    WHEN price_sar < 200 THEN '50-200 SAR'  
    WHEN price_sar < 500 THEN '200-500 SAR'
    ELSE 'Over 500 SAR'
  END as price_range,
  COUNT(*) as count
FROM products 
GROUP BY price_range 
ORDER BY MIN(price_sar);

-- Recent additions
SELECT s.name as store, COUNT(*) as new_products
FROM products p
JOIN stores s ON p.store_id = s.id  
WHERE p.created_at > NOW() - INTERVAL '7 days'
GROUP BY s.name;
```