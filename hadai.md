## 🔧 Key Files & Their Purpose

### Frontend

- `src/pages/GiftFlow.js` - Main gift recommendation interface
- `src/services/combinedGiftService.js` - API integration layer
- `src/services/gptService.js` - OpenAI communication
- `src/services/niceoneService.js` - NiceOne API wrapper
- `src/utils/reminderUtils.js` - Gift reminder functionality

### Backend

- `backend/server.js` - Main server with all API endpoints
- `backend/package.json` - Dependencies and scripts

## �� Core Features

### 1. Intelligent Gift Suggestions

- Uses OpenAI GPT-4 for contextual gift recommendations
- Generates 6-8 diverse curated recommendations from different sources
- Each recommendation has specific search context for optimal product matching
- Considers age, relationship, budget, and interests
- Culturally tailored for Saudi Arabian audience

### 2. Multi-Store Product Search

- Searches across 3 major Saudi e-commerce platforms (Jarir, NiceOne, Floward)
- Automatic store routing based on product category
- Each recommendation uses optimized search context for better product matching
- Improved image handling with source-specific optimization (especially for Jarir)
- Enhanced error handling and fallback mechanisms
- No alternative labeling - all recommendations are distinct curated suggestions

### 3. User Experience

- Multi-step wizard interface
- Real-time product enrichment
- Click tracking for analytics
- Contact management for gift history

### 4. Analytics & Tracking

- Product click tracking
- User behavior analytics
- Performance metrics
- Store-specific analytics

## 🚀 Getting Started

### Prerequisites

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install

# Environment variables needed:
OPENAI_API_KEY=your_openai_key
NICEONE_MERCHANT_ID=your_niceone_id
NICEONE_RESTADMIN_ID=your_restadmin_id
NICEONE_SESSION=your_session_token
```

### Running the Application

```bash
# Start backend server
cd backend && npm start

# Start frontend (in another terminal)
npm start
```

## �� API Endpoints

### Main Endpoints

- `POST /api/generate-gift` - Generate gift suggestions with product enrichment
- `GET /api/niceone/search` - Search NiceOne products
- `POST /api/floward/search` - Search Floward (Algolia) with recipient/occasion/category filters
- `GET /api/version-check` - System status check

### Store-Specific Endpoints

- `GET /api/niceone/test` - Test NiceOne connection
- `GET /api/niceone/check-connection` - Connection health check

- `POST /api/floward/search` - Body params:
  ```json
  {
    "query": "premium roses luxury bouquet",
    "recipient": ["Wife", "Mother"],
    "occasion": ["Anniversary", "Valentine's Day"],
    "category": ["flowers"],
    "brand": [],
    "color": ["red"],
    "minPrice": 300,
    "maxPrice": 1500,
    "mustBeInStock": true,
    "allowPreorder": true,
    "hitsPerPage": 50,
    "page": 0
  }
  ```

## 📈 Analytics & Tracking

### Click Tracking

- Tracks which products users click on
- Stores analytics by store (Jarir, NiceOne, Mahaly)
- Links clicks to user accounts when available

### Performance Metrics

- API response times
- Success/failure rates per store
- User engagement metrics

## 🆕 Recent Improvements (Latest Update - Search Accuracy Enhancement)

### Enhanced Search Precision & Product Variety

- **Refined GPT Prompts**: Completely redesigned AI prompts to prevent irrelevant suggestions (e.g., birthday items when not appropriate)
- **Context-Aware Filtering**: Added intelligent occasion detection to avoid irrelevant product categories
- **Multiple Product Options**: Now returns 3 product options per recommendation for better choice variety
- **Enhanced Search Terms**: More specific and targeted search contexts for better product matching
- **Improved Store Routing**: Optimized category-to-store mapping for more accurate product placement
  - Explicit prioritization to include FLOWARD when budget ≥ 300 SAR, romantic/formal occasions, or close relationships
- **Advanced Fallback System**: Category-specific fallback terms that maintain relevance instead of generic searches

### Technical Search Improvements

- **Precision Targeting**: Search contexts now use 3-5 specific keywords instead of generic terms
- **Quality Indicators**: Integrated premium/luxury modifiers for better product quality matching
- **Cultural Relevance**: Enhanced Saudi market preferences and cultural appropriateness
- **Multi-Product Display**: Frontend now supports tabbed interface for browsing multiple product options
- **Enhanced Error Handling**: Better fallback mechanisms with category-specific terms
- **Improved Logging**: Comprehensive logging for debugging and performance monitoring

### User Experience Enhancements

- **Product Tabs**: Users can now browse multiple options within each recommendation
- **Option Indicators**: Clear visual indicators showing number of available product choices
- **Price Comparison**: Easy comparison between different product options within same category
- **Better Visual Feedback**: Enhanced product loading and error state handling
- **Smarter Recommendations**: AI now focuses ONLY on user-specified criteria, eliminating irrelevant suggestions

## 🔄 Future Enhancements

### Planned Features

1. **Trend Integration**: Real-time social media trend analysis
2. **Personalization**: User preference learning over time
3. **Recommendation Engine**: Collaborative filtering
4. **Mobile App**: React Native version
5. **Advanced Analytics**: Machine learning insights

### Technical Improvements

1. **Caching**: Redis for API responses and trend data
2. **Rate Limiting**: Better API call management
3. **Error Handling**: More robust fallback mechanisms
4. **Testing**: Comprehensive test suite

## 🐛 Troubleshooting

### Common Issues

1. **API Failures**: Check environment variables and API keys
2. **No Results**: Verify store selection logic and fallback queries
3. **Slow Performance**: Check API response times and caching

### Debug Mode

```javascript
// Enable detailed logging in backend/server.js
console.log("Debug mode enabled");
```

## 📝 Notes for Future Development

### Architecture Decisions

- **Store Routing**: Category-based routing ensures products appear in appropriate stores
- **Fallback Strategy**: Multiple fallback queries when primary search fails
- **Error Handling**: Graceful degradation when APIs are unavailable

### Performance Considerations

- **API Timeouts**: 30-second timeouts for external APIs
- **Retry Logic**: Exponential backoff for failed requests
- **Response Caching**: Consider implementing Redis for frequently requested data

### Security Notes

- API keys stored in environment variables
- CORS enabled for frontend-backend communication
- No sensitive data stored in client-side code
