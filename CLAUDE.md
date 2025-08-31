# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React)
```bash
npm start          # Start development server (port 3000)
npm run build      # Build for production
npm test           # Run tests
```

### Backend (Node.js/Express)
```bash
cd backend && npm start    # Start production server
cd backend && npm run dev  # Start with nodemon for development (port 5001)
```

### Full Development Setup
```bash
# Install dependencies
npm install
cd backend && npm install

# Start both services (run in separate terminals)
cd backend && npm run dev  # Backend on port 5001
npm start                  # Frontend on port 3000
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 with React Router DOM, Tailwind CSS
- **Backend**: Node.js/Express with CORS
- **Database**: Supabase PostgreSQL with advanced search functions
- **Authentication**: Firebase Auth with Google Provider
- **AI Services**: OpenAI GPT-4 for gift recommendations
- **Product Data**: Populated database with NiceOne, Jarir, FLOWARD products
- **Search Engine**: Bilingual (Arabic/English) full-text search with tsvector indexes

### Core Application Flow
1. **User Authentication**: Firebase Auth with Google sign-in
2. **Gift Wizard**: Multi-step form collecting user preferences (age, relationship, budget, interests, occasion)
3. **AI Generation**: OpenAI GPT-4 generates 6-8 curated gift recommendations with bilingual search queries
4. **Database Search**: Advanced SQL functions search populated Supabase database with relevance scoring
5. **Results Display**: Frontend shows recommendations with multiple product options per suggestion
6. **Analytics Tracking**: Click tracking and user behavior analytics

### Database-Driven Product Pipeline
1. **Product Population**: Database contains 16 categories of products from FLOWARD, JARIR, NICEONE
2. **Intelligent Routing**: GPT generates store-specific queries based on budget, relationship, and occasion
3. **Bilingual Search**: English and Arabic full-text search with tsvector indexing
4. **Relevance Scoring**: Advanced scoring algorithm considering category match, store synergy, price fit, and text similarity
5. **Multi-Store Results**: Each plan returns up to 30 products with store diversity and category flexibility

### Key Files Structure

**Frontend (`src/`)**
- `App.js`: Main router with routes to all pages
- `pages/GiftFlow.js`: Primary gift recommendation wizard interface
- `services/combinedGiftService.js`: Main service orchestrating AI + product enrichment
- ~~`services/gptService.js`: OpenAI API communication~~ (Deprecated - moved to backend)
- ~~`services/niceoneService.js`: NiceOne API integration~~ (Deprecated - replaced by database)
- `services/clickTracking.js`: Analytics and user interaction tracking
- `hooks/useContacts.js`: Firebase contact management
- `firebase.js`: Firebase configuration and initialization

**Backend (`backend/`)**
- `server.js`: Express server with all API endpoints
- `services/supabaseService.js`: Database connection and search functions
- `sql/02_search_function.sql`: Basic search function setup
- `sql/03_advanced_search_functions.sql`: Advanced bilingual search functions
- Main endpoints: `/api/generate-gift`, `/api/gifts/search`, `/api/version-check`
- Legacy endpoints: `/api/niceone/search`, `/api/jarir/search`, `/api/floward/search`

### Environment Variables Required
```bash
# Backend
OPENAI_API_KEY=your_openai_key

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Legacy API Keys (for fallback)
NICEONE_MERCHANT_ID=your_niceone_id
NICEONE_RESTADMIN_ID=your_restadmin_id
NICEONE_SESSION=your_session_token
FLOWARD_ALGOLIA_SEARCH_KEY=your_algolia_key
```

### Database Architecture
- **16-Category System**: gifts, makeup, perfume, books, electronics, devices, care, premium, nails, lenses, fashion, fitness, gaming, home_scents, home_decor, office, food_drink
- **Bilingual Indexing**: English and Arabic tsvector columns with GIN indexes for fast full-text search
- **Store Coverage**: 
  - **FLOWARD**: Premium/luxury (300+ SAR) - gifts, premium, perfume, fashion categories
  - **JARIR**: Educational/professional - books, electronics, devices, office, gaming categories
  - **NICEONE**: Beauty/personal care - makeup, care, nails, lenses, home_scents, fitness categories
- **Advanced Scoring**: Relevance algorithm considering exact category match (3.0), store match (2.0), text similarity (up to 4.0), price fit (1.5), and store-category synergy (1.0)
- **Cross-Category Flexibility**: Related category matching for better result variety
- **Performance Optimization**: Cached results, 30 products per plan, 5 products per batch search

### Custom Tailwind Theme
- Brand colors: `darkBrown`, `tan`, `mediumBrown`, `softYellow`, `lightYellow`
- Culturally tailored for Saudi Arabian market

### Database Integration
- **Primary Database**: Supabase PostgreSQL for product search and recommendations
- **Authentication**: Firebase Auth with Google Provider (maintained for user management)
- **User Data**: Firebase Firestore for contacts and analytics (maintained)
- **Product Search**: Supabase with advanced SQL functions and bilingual search
- **Hosting**: Firebase hosting configuration for SPA deployment

### API Architecture
- **Frontend-Backend separation**: React SPA calls Express API
- **CORS enabled**: For cross-origin requests
- **Database-First**: Primary `/api/gifts/search` endpoint uses Supabase database
- **Legacy API Fallback**: External API endpoints maintained for backup
- **Caching Strategy**: In-memory caching for GPT responses (60 min) and products (15 min)
- **Error handling**: Comprehensive logging with fallback to GPT-only responses
- **Concurrency Control**: p-limit for managing concurrent API calls

### Advanced Search System
- **Bilingual Search**: Full-text search in both English and Arabic with cultural relevance
- **Smart Category Mapping**: Frontend categories automatically mapped to database schema
- **Conflict Resolution**: Interest-based category override (e.g., "makeup" interest overrides "Food & Drink" category)
- **Enhanced GPT Prompts**: 16-category system with bilingual query generation
- **Store-Category Synergy**: Bonus scoring for products that match store specializations
- **Query Optimization**: 3-6 specific product tokens per language, no generic terms
- **Budget-Aware Routing**: Intelligent store selection based on price bands (Low <200, Mid 200-499, High 500+)
- **Cultural Adaptation**: Saudi market preferences with appropriate relationship and occasion handling