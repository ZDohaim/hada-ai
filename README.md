# Hada AI Gift Recommendation System

A smart gift recommendation system that uses AI to suggest personalized gifts and integrates with NiceOne API for product search.

## Features

- AI-powered gift suggestions based on recipient preferences
- Integration with NiceOne product API
- User preference-based filtering
- Personalized recommendations

## Architecture

The application consists of:

1. **Frontend**: React-based UI for collecting user preferences and displaying gift suggestions
2. **Backend**: Express.js server that handles:
   - OpenAI API integration for gift idea generation
   - NiceOne API proxy for product search
   - Authentication and user management

## API Integrations

### OpenAI API

- Used for generating personalized gift suggestions based on user inputs
- Handles natural language processing of preferences

### NiceOne API

- Product search and retrieval
- Accessed via backend proxy to handle authentication and CORS issues
- Enriches AI suggestions with real product data

## Setup and Installation

### Prerequisites

- Node.js v16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file with the following variables:
   ```
   PORT=5001
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Start the server: `npm run dev`

### Frontend Setup

1. Navigate to the root directory
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Usage Flow

1. User enters recipient preferences (age, gender, interests, etc.)
2. Application sends request to backend
3. Backend uses OpenAI to generate gift ideas
4. Backend enriches those ideas with product data from NiceOne API
5. Frontend displays the enriched gift suggestions to the user

## Troubleshooting

### API Connection Issues

- Check that the OpenAI API key is valid and has sufficient credits
- Ensure the backend server is running on port 5001
- Check browser console for detailed error messages

### NiceOne API Issues

- The backend proxies requests to NiceOne API to handle authentication
- Check server logs for detailed error information from the NiceOne API
