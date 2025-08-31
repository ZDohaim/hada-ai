# Hadai.ai - Intelligent Gift Recommendation System

> AI-powered gift recommendations for the Saudi Arabian market with advanced database-driven search capabilities.

## 🎯 Overview

Hadai.ai is a sophisticated gift recommendation platform that combines OpenAI GPT-4 intelligence with a populated Supabase database containing products from major Saudi e-commerce platforms (FLOWARD, JARIR, NICEONE). The system provides culturally-tailored, bilingual gift suggestions with advanced search capabilities.

## 🚀 Key Features

### 🤖 AI-Powered Recommendations
- OpenAI GPT-4 generates 6-8 curated gift suggestions
- Budget, relationship, and occasion-aware intelligence
- Cultural adaptation for Saudi Arabian market
- Bilingual query generation (English + Arabic)

### 🗄️ Advanced Database System
- **16-Category Product Classification**: gifts, makeup, perfume, books, electronics, devices, care, premium, nails, lenses, fashion, fitness, gaming, home_scents, home_decor, office, food_drink
- **Bilingual Full-Text Search**: English and Arabic tsvector indexing with GIN performance optimization
- **Multi-Store Coverage**: Products from FLOWARD (premium/luxury), JARIR (tech/books), NICEONE (beauty/personal care)
- **Sophisticated Relevance Scoring**: Category match, store synergy, price fit, and text similarity algorithms

### 🔍 Smart Search Engine
- Up to **30 products per recommendation** (vs previous API limitations)
- Cross-category flexibility for better variety
- Advanced SQL functions with PostgreSQL optimization
- Real-time conflict resolution (interests override categories)
- Store-specific quality indicators and routing

## 🛠️ Tech Stack

- **Frontend**: React 19, Tailwind CSS, React Router DOM
- **Backend**: Node.js/Express with CORS
- **Database**: Supabase PostgreSQL with advanced search functions
- **AI**: OpenAI GPT-4 for recommendation generation
- **Authentication**: Firebase Auth with Google Provider
- **Caching**: In-memory caching with TTL (GPT: 60min, Products: 15min)
- **Search**: Bilingual full-text search with tsvector indexes

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Supabase account and project
- OpenAI API key
- Firebase project (for authentication)

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd hada-ai

# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install
```

### 2. Environment Variables
Create `.env` files in both root and backend directories:

**Backend `.env`:**
```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Supabase Database (Primary)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Legacy API Keys (Fallback - Optional)
NICEONE_MERCHANT_ID=your_niceone_merchant_id
NICEONE_RESTADMIN_ID=your_niceone_restadmin_id
NICEONE_SESSION=your_niceone_session
FLOWARD_ALGOLIA_SEARCH_KEY=your_algolia_search_key
```

**Frontend `.env`:**
```bash
REACT_APP_API_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### 3. Database Setup
Run the SQL migration files in your Supabase SQL editor:

```bash
# 1. Create basic search function
backend/sql/02_search_function.sql

# 2. Create advanced bilingual search functions
backend/sql/03_advanced_search_functions.sql

# 3. Populate tsvector columns (run after data import)
SELECT update_product_tsvectors();
```

### 4. Start Development Servers
```bash
# Terminal 1 - Backend (port 5001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3000) 
npm start
```

## 📊 Database Schema

### Core Tables
- **`products`**: Main product catalog with bilingual search columns
- **`stores`**: Store information (FLOWARD, JARIR, NICEONE)
- **`categories`**: 16-category classification system

### Search Optimization
- **GIN Indexes**: On tsvector columns for fast full-text search
- **Trigram Indexes**: For similarity matching and fuzzy search
- **Composite Indexes**: On category_id, store_id, price_sar for filtering

### Key Functions
- **`search_gifts_plan(plan JSONB)`**: Search products for a single GPT plan
- **`search_gifts_plans(plans JSONB[])`**: Batch search for multiple plans
- **`update_product_tsvectors()`**: Populate bilingual search indexes

## 🌐 API Endpoints

### Primary Endpoints
- `POST /api/generate-gift` - Complete gift recommendation pipeline
- `POST /api/gifts/search` - Direct database product search
- `GET /api/version-check` - System health check

### Database Search API
```bash
curl -X POST http://localhost:5001/api/gifts/search \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "interests": "makeup",
      "category": "makeup",
      "budget": "200-500"
    },
    "filters": {
      "stores": ["niceone", "jarir", "floward"],
      "priceRange": {"min": 200, "max": 500}
    }
  }'
```

## 🎯 Usage Examples

### Basic Gift Search
```javascript
const response = await fetch('/api/generate-gift', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    age: '25',
    gender: 'female', 
    relationship: 'friend',
    interests: 'makeup',
    budget: '300 SAR',
    enrichWithProducts: true
  })
});
```

### Direct Database Search
```javascript
const response = await fetch('/api/gifts/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    preferences: { interests: 'gaming', category: 'electronics' },
    filters: { priceRange: { min: 500, max: 1500 } }
  })
});
```

## 🔧 Development

### Project Structure
```
hada-ai/
├── src/                          # React frontend
│   ├── pages/GiftFlow.js        # Main gift wizard interface
│   ├── services/               
│   │   └── combinedGiftService.js # API integration
│   └── components/              # React components
├── backend/                     # Node.js server
│   ├── server.js               # Express server with all endpoints
│   ├── services/
│   │   └── supabaseService.js  # Database operations
│   ├── sql/                    # Database migration files
│   │   ├── 02_search_function.sql
│   │   └── 03_advanced_search_functions.sql
│   └── scripts/                # Database setup scripts
├── CLAUDE.md                   # Development documentation
└── hadai.md                    # Feature documentation
```

### Key Development Commands
```bash
# Frontend
npm start              # Development server
npm run build          # Production build
npm test              # Run tests

# Backend  
npm run dev           # Development with nodemon
npm start             # Production server
```

## 📈 Performance Features

- **Sub-second Search**: Optimized PostgreSQL queries with proper indexing
- **Intelligent Caching**: 60-minute GPT cache, 15-minute product cache
- **Batch Processing**: Efficient multi-plan search in single database call
- **Relevance Scoring**: Advanced multi-factor scoring algorithm
- **Connection Pooling**: Supabase handles database connections automatically

## 🐛 Troubleshooting

### Common Issues
1. **Database Connection**: Verify Supabase URL and service role key
2. **No Search Results**: Check category mapping and database population
3. **Slow Performance**: Ensure database indexes are created
4. **GPT API Errors**: Verify OpenAI API key and usage limits

### Debug Mode
Enable detailed logging in `backend/server.js` by setting:
```javascript
console.log("Debug mode enabled");
```

## 🚀 Deployment

The application supports deployment on:
- **Frontend**: Firebase Hosting, Vercel, Netlify
- **Backend**: Railway, Heroku, DigitalOcean
- **Database**: Supabase (hosted PostgreSQL)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

---

**Built with ❤️ for the Saudi Arabian market**