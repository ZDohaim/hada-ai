# BACKEND.md

This file provides comprehensive documentation for the Hada AI Backend - a Node.js/Express server that powers the gift recommendation system for Saudi Arabian e-commerce.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env

# Start development server
npm run dev    # Uses nodemon for auto-reload
npm start      # Production mode
```

## Architecture Overview

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js with CORS
- **Database**: Supabase (PostgreSQL) - **NEW ARCHITECTURE**
- **Legacy Database**: Firebase Firestore (being phased out)
- **AI Services**: OpenAI GPT-4 for gift recommendations
- **External APIs**: NiceOne, Jarir, Floward (Saudi e-commerce platforms)
- **Caching**: In-memory Map-based caching with TTL
- **Concurrency**: p-limit for API throttling

### Service Architecture

```
├── server.js              # Main Express server & legacy endpoints
├── services/
│   └── supabaseService.js  # New Supabase integration
├── routes/                 # Future: Express route modules
└── .env                    # Environment configuration
```

## Database Schema (Supabase)

### Core Tables

#### `stores`
Maps each product to its vendor/platform.
```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,  -- e.g. "floward", "jarir", "niceone"
    name TEXT NOT NULL,         -- human readable name
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `categories` 
Normalize category tags across vendors.
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,  -- e.g. "gifts", "perfume", "devices"
    name TEXT NOT NULL,         -- human readable name
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `products`
Canonical row for each product in the unified gift catalog.
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price_sar NUMERIC NOT NULL,
    image_url TEXT,
    product_url TEXT,
    tags TEXT[],                -- optional keywords like ['roses','luxury','anniversary']
    store_id UUID NOT NULL REFERENCES stores(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    raw JSONB,                  -- original vendor payload for debugging/fallback
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Performance Indexes

```sql
-- Trigram similarity search on name
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- Trigram similarity search on description  
CREATE INDEX idx_products_description_trgm ON products USING GIN (description gin_trgm_ops);

-- GIN index on tags array
CREATE INDEX idx_products_tags_gin ON products USING GIN (tags);

-- Optional: Full-text search vector
CREATE INDEX idx_products_tsv ON products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Performance indexes for common queries
CREATE INDEX idx_products_store_category ON products (store_id, category_id);
CREATE INDEX idx_products_price ON products (price_sar);
```

### RPC Functions

#### `search_gifts(p_preferences JSONB, p_filters JSONB, p_limit INTEGER)`
Advanced search function that:
- Filters products by text similarity, price range, store, and category
- Scores results by relevance using trigram similarity
- Applies optional Floward premium bonus for luxury searches
- Returns formatted results matching API expectations

**Input Format:**
```json
{
  "preferences": {
    "interests": "luxury watches premium",
    "occasion": "anniversary",
    "relationship": "spouse", 
    "budget": "500-1000"
  },
  "filters": {
    "stores": ["floward", "jarir"],
    "categories": ["gifts", "devices"],
    "priceRange": {"min": 500, "max": 1000}
  },
  "limit": 20
}
```

**Output Format:**
```json
{
  "gifts": [
    {
      "id": "uuid",
      "name": "Product Name",
      "description": "Product description",
      "price": 750.00,
      "store": "floward",
      "category": "gifts",
      "image_url": "https://...",
      "product_url": "https://...",
      "tags": ["luxury", "premium"],
      "relevance_score": 0.95,
      "recommendation_reason": "Perfect luxury gift for anniversary"
    }
  ],
  "total": 15,
  "search_metadata": {
    "query_processed": "luxury watches premium anniversary spouse",
    "stores_searched": ["floward", "jarir"],
    "search_time_ms": 45
  }
}
```

## API Endpoints

### New Supabase-Powered Endpoints

#### `POST /api/gifts/search`
**Purpose**: Search the unified gift catalog using Supabase
**Handler**: `services/supabaseService.js`
**Status**: ✅ Active (replaces placeholder)

```javascript
// Request
{
  "preferences": {
    "interests": "string",
    "occasion": "string", 
    "relationship": "string",
    "budget": "string"
  },
  "filters": {
    "stores": ["floward", "jarir", "niceone"],
    "categories": ["gifts", "perfume"],
    "priceRange": {"min": 100, "max": 500}
  },
  "limit": 20
}

// Response
{
  "gifts": [...],
  "total": 15,
  "search_metadata": {...}
}
```

### Legacy OpenAI + External API Endpoints

#### `POST /api/generate-gift`
**Purpose**: Generate gift recommendations using OpenAI + external API enrichment
**Status**: 🔄 Legacy (still active, may be replaced)

Complex endpoint that:
1. Normalizes user preferences into signals (budget bands, relationship tiers, etc.)
2. Calls OpenAI GPT-4 to generate 6-8 gift suggestions with store routing
3. Enriches each suggestion by calling external APIs (NiceOne, Jarir, Floward)
4. Returns structured recommendations with products

**Key Features:**
- Intelligent store routing based on budget/occasion/relationship
- Caching for both GPT responses and product searches
- Fallback mechanisms and error handling
- Cultural context for Saudi market

#### External API Proxies

- `GET /api/niceone/search` - NiceOne product search proxy
- `GET /api/jarir/search` - Jarir product search proxy  
- `POST /api/floward/search` - Floward Algolia search proxy
- `GET /api/niceone/test` - NiceOne API health check
- `GET /api/jarir/test` - Jarir API health check

#### Utility Endpoints

- `GET /health` - Basic health check
- `GET /api/version-check` - API version and endpoint listing
- `GET /api/test-openai` - OpenAI API connectivity test

## External API Integrations

### NiceOne API
- **Base URL**: `https://api.niceonesa.com`
- **Timeout**: 10 seconds
- **Authentication**: Headers with merchant ID, session, and REST admin ID
- **Rate Limiting**: Throttled via p-limit (max 3 concurrent)
- **Caching**: 15-minute TTL

### Jarir API (Klevu Search)
- **Base URL**: `https://mecs.klevu.com/cloud-search/n-search/search`
- **Timeout**: 30 seconds
- **Authentication**: None (public search API)
- **Special Logic**: Filters for "Trending Now" and "Best Sellers" tags
- **Caching**: 15-minute TTL

### Floward API (Algolia)
- **Base URL**: Algolia search endpoints
- **Timeout**: 15 seconds
- **Authentication**: Algolia API key (search-only)
- **Features**: Advanced filtering, faceted search, luxury keyword boosting
- **Caching**: 15-minute TTL

## Environment Variables

```bash
# Server Configuration
PORT=5001

# AI Services
OPENAI_API_KEY=sk-proj-...

# Supabase (NEW)
NEXT_PUBLIC_SUPABASE_URL=https://trjoxjplafcfpqjdavhs.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
DATABASE_URL=postgresql://postgres:...

# NiceOne API
NICEONE_MERCHANT_ID=2afc3973-04a5-4913-83f8-d45b0156b5f1
NICEONE_RESTADMIN_ID=c15378d0-04f1-4d36-9af7-ab7e17da918b
NICEONE_SESSION=761c5dab2893054e7ce719bf12d6b9b5

# Floward API (Optional)
FLOWARD_ALGOLIA_SEARCH_KEY=a36327f4aec9eec775af628df0f659ab
```

## Migration Notes

### From Firebase to Supabase
The backend is in transition from Firebase Firestore to Supabase PostgreSQL:

**Current State:**
- ✅ Supabase service layer implemented
- ✅ `/api/gifts/search` endpoint using Supabase
- 🔄 Legacy endpoints still using external APIs
- 🔄 Product ingestion pipeline needed

**Migration Path:**
1. **Phase 1** (Complete): Set up Supabase schema and search endpoint
2. **Phase 2** (In Progress): Build product ingestion from external APIs
3. **Phase 3** (Future): Migrate user data and analytics from Firebase
4. **Phase 4** (Future): Deprecate legacy endpoints

## Development Guidelines

### Code Organization
- Keep business logic in service files (`/services/`)
- Use middleware for common functionality (CORS, JSON parsing)
- Implement comprehensive error handling and logging
- Cache expensive operations with appropriate TTLs

### Testing Strategy
- Use endpoint testing for API validation
- Mock external API calls for unit tests
- Test error handling and edge cases
- Validate data normalization functions

### Performance Considerations
- Implement request throttling for external APIs (p-limit)
- Use appropriate caching strategies (15min for products, 60min for GPT)
- Monitor and optimize database query performance
- Consider implementing request queuing for high load

### Saudi Market Considerations
- Cultural appropriateness in gift suggestions
- SAR pricing normalization
- Arabic/English text handling
- Local e-commerce platform integration
- Occasion and relationship context sensitivity

## Troubleshooting

### Common Issues

**OpenAI API Errors:**
```bash
# Test OpenAI connectivity
curl -X GET http://localhost:5001/api/test-openai
```

**External API Failures:**
```bash
# Test individual APIs
curl -X GET "http://localhost:5001/api/niceone/test"
curl -X GET "http://localhost:5001/api/jarir/test"
```

**Supabase Connection Issues:**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Performance Monitoring
- Monitor cache hit rates in logs
- Track API response times
- Watch for external API rate limits
- Monitor Supabase query performance

### Deployment Considerations
- Ensure all environment variables are set
- Configure proper CORS origins for production
- Set appropriate timeout values for production load
- Monitor error rates and implement alerting