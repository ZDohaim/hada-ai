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
cd backend && npm run dev  # Start with nodemon for development
```

### Full Development Setup
```bash
# Install dependencies
npm install
cd backend && npm install

# Start both services (run in separate terminals)
cd backend && npm run dev  # Backend on port 5000
npm start                  # Frontend on port 3000
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 with React Router DOM, Tailwind CSS
- **Backend**: Node.js/Express with CORS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with Google Provider
- **AI Services**: OpenAI GPT-4 for gift recommendations
- **External APIs**: NiceOne, Jarir, Mahaly (Saudi e-commerce platforms)

### Core Application Flow
1. **User Authentication**: Firebase Auth with Google sign-in
2. **Gift Wizard**: Multi-step form collecting user preferences (age, relationship, budget, interests, occasion)
3. **AI Generation**: OpenAI GPT-4 generates 6-8 curated gift recommendations with search contexts
4. **Product Enrichment**: Backend searches Saudi e-commerce platforms (Jarir, NiceOne, Mahaly) for actual products
5. **Results Display**: Frontend shows recommendations with multiple product options per suggestion
6. **Analytics Tracking**: Click tracking and user behavior analytics

### Key Files Structure

**Frontend (`src/`)**
- `App.js`: Main router with routes to all pages
- `pages/GiftFlow.js`: Primary gift recommendation wizard interface
- `services/combinedGiftService.js`: Main service orchestrating AI + product enrichment
- `services/gptService.js`: OpenAI API communication
- `services/niceoneService.js`: NiceOne API integration
- `services/clickTracking.js`: Analytics and user interaction tracking
- `hooks/useContacts.js`: Firebase contact management
- `firebase.js`: Firebase configuration and initialization

**Backend (`backend/`)**
- `server.js`: Express server with all API endpoints
- Main endpoints: `/api/generate-gift`, `/api/niceone/search`, `/api/version-check`

### Environment Variables Required
```bash
# Backend
OPENAI_API_KEY=your_openai_key
NICEONE_MERCHANT_ID=your_niceone_id
NICEONE_RESTADMIN_ID=your_restadmin_id
NICEONE_SESSION=your_session_token
```

### Store Integration Logic
- **Intelligent routing**: Budget, occasion, and relationship-aware store selection
- **Store positioning**: 
  - **Floward**: Premium/luxury (300+ SAR) - flowers, jewelry, luxury bundles for formal occasions
  - **Jarir**: Practical/mid-range (100-500 SAR) - books, tech, electronics for educational/professional needs  
  - **NiceOne**: Budget-friendly (50-200 SAR) - makeup, beauty products for casual gifting
- **Decision matrix**: AI considers budget thresholds, occasion formality, relationship importance, and cultural context
- **Search optimization**: Store-specific quality indicators (luxury/premium for Floward, bestseller/trending for Jarir, affordable/popular for NiceOne)
- **Fallback mechanisms**: Multiple fallback queries when primary searches fail
- **Multi-option display**: 3 product options per recommendation for user choice

### Custom Tailwind Theme
- Brand colors: `darkBrown`, `tan`, `mediumBrown`, `softYellow`, `lightYellow`
- Culturally tailored for Saudi Arabian market

### Firebase Integration
- **Authentication**: Google Auth provider
- **Database**: Firestore for user data, contacts, and analytics
- **Hosting**: Firebase hosting configuration for SPA deployment

### API Architecture
- **Frontend-Backend separation**: React SPA calls Express API
- **CORS enabled**: For cross-origin requests
- **Timeout handling**: 10s for NiceOne, 30s for Jarir APIs
- **Error handling**: Comprehensive logging and graceful degradation
- **Request interceptors**: Detailed error logging for external APIs

### Recent Search Accuracy Improvements
- Context-aware filtering prevents irrelevant suggestions
- Enhanced search terms with 3-5 specific keywords per recommendation
- Category-specific fallback terms maintain relevance
- Cultural appropriateness for Saudi market preferences