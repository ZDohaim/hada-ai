# Environment Variables Documentation

Complete guide to configuring environment variables for Hadai.ai's database-driven architecture.

## 📋 Required Environment Variables

### Backend Environment (`.env` in `/backend/`)

#### 🤖 OpenAI Configuration (Required)
```bash
# OpenAI API for GPT-4 gift recommendations
OPENAI_API_KEY=sk-your-openai-api-key-here
```
- **Purpose**: Powers the AI gift recommendation engine
- **Usage**: GPT-4 generates bilingual search queries and gift suggestions
- **Get Key**: [OpenAI API Keys](https://platform.openai.com/api-keys)

#### 🗄️ Supabase Database (Required - Primary)
```bash
# Supabase PostgreSQL Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **Purpose**: Primary database for product search and storage
- **Usage**: Advanced bilingual search functions and product catalog
- **Get Credentials**: [Supabase Dashboard](https://app.supabase.com/) → Settings → API
- **⚠️ Important**: Use Service Role Key, not anon key for backend operations

#### 🛍️ Legacy API Keys (Optional - Fallback)
```bash
# NiceOne API (Beauty/Personal Care)
NICEONE_MERCHANT_ID=2afc3973-04a5-4913-83f8-d45b0156b5f1
NICEONE_RESTADMIN_ID=c15378d0-04f1-4d36-9af7-ab7e17da918b
NICEONE_SESSION=761c5dab2893054e7ce719bf12d6b9b5

# Floward Algolia Search (Premium/Luxury)
FLOWARD_ALGOLIA_SEARCH_KEY=a36327f4aec9eec775af628df0f659ab
```
- **Purpose**: Fallback when database search fails
- **Usage**: Direct API calls to external platforms (legacy mode)
- **Status**: Optional - system works without these via database-first approach

### Frontend Environment (`.env` in project root)

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:5001

# Supabase Configuration (for future client-side features)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Firebase Authentication (if used)
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
```

## 🔧 Environment Setup by Deployment Type

### Development Environment
```bash
# Backend /.env
OPENAI_API_KEY=sk-development-key
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key

# Frontend /.env  
REACT_APP_API_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project.supabase.co
```

### Production Environment
```bash
# Backend /.env
OPENAI_API_KEY=sk-production-key
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key

# Frontend /.env
REACT_APP_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
```

### Testing Environment
```bash
# Backend /.env.test
OPENAI_API_KEY=sk-test-key
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key

# Minimal setup for testing without external APIs
NODE_ENV=test
```

## 🚀 Platform-Specific Configuration

### Railway Deployment
```bash
# Railway environment variables
OPENAI_API_KEY=${{secrets.OPENAI_API_KEY}}
NEXT_PUBLIC_SUPABASE_URL=${{secrets.SUPABASE_URL}}
SUPABASE_SERVICE_ROLE_KEY=${{secrets.SUPABASE_SERVICE_KEY}}
PORT=5001
```

### Heroku Deployment
```bash
# Heroku Config Vars
heroku config:set OPENAI_API_KEY=sk-your-key
heroku config:set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Vercel Deployment (Frontend)
```bash
# Vercel Environment Variables
REACT_APP_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🔐 Security Best Practices

### Key Management
- ✅ **Never commit secrets** to git repositories
- ✅ **Use different keys** for dev/staging/production
- ✅ **Rotate keys regularly** (quarterly recommended)
- ✅ **Use service role keys** for backend database operations
- ✅ **Use anon keys** for frontend client operations

### Environment File Security
```bash
# Add to .gitignore
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

### Supabase Security
```bash
# Backend: Use Service Role Key (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Frontend: Use Anon Key (respects RLS)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

## 🧪 Testing Configuration

### Unit Tests
```bash
# .env.test
NODE_ENV=test
OPENAI_API_KEY=sk-test-key
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
```

### Integration Tests
```bash
# Test with real Supabase instance
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=test-service-role-key

# Mock external APIs
MOCK_EXTERNAL_APIS=true
```

## ⚠️ Troubleshooting

### Common Issues

#### 1. Supabase Connection Errors
```bash
# Check URL format
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co

# Verify service role key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. OpenAI API Errors
```bash
# Verify API key format
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890

# Check usage limits in OpenAI dashboard
```

#### 3. CORS Issues
```bash
# Ensure frontend URL matches backend configuration
REACT_APP_API_URL=http://localhost:5001  # Development
REACT_APP_API_URL=https://api.hadai.com  # Production
```

### Validation Script
```javascript
// scripts/validate-env.js
const requiredVars = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'SUPABASE_SERVICE_ROLE_KEY'
];

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

console.log('✅ All required environment variables are set');
```

## 📊 Environment Monitoring

### Health Check Endpoints
```bash
# Test database connection
curl http://localhost:5001/api/version-check

# Test OpenAI connection  
curl http://localhost:5001/api/test-openai

# Test complete pipeline
curl -X POST http://localhost:5001/api/gifts/search \
  -H "Content-Type: application/json" \
  -d '{"preferences": {"interests": "test"}}'
```

### Environment Validation
```bash
# Backend validation
cd backend && npm run validate-env

# Check Supabase connection
cd backend && npm run test-db

# Check all services
cd backend && npm run health-check
```

## 🔄 Migration from Legacy API-based System

### Phase 1: Add Database Variables
```bash
# Add to existing .env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Phase 2: Test Dual Mode
```bash
# Both database and API keys present
OPENAI_API_KEY=sk-your-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Legacy APIs for fallback
NICEONE_MERCHANT_ID=your-merchant-id
FLOWARD_ALGOLIA_SEARCH_KEY=your-algolia-key
```

### Phase 3: Database-Only Mode
```bash
# Remove legacy API keys once database is stable
# NICEONE_MERCHANT_ID=  # Commented out
# FLOWARD_ALGOLIA_SEARCH_KEY=  # Commented out
```

## 📁 Template Files

### Backend .env Template
```bash
# Copy this template to backend/.env and fill in your values

# === REQUIRED ===
OPENAI_API_KEY=sk-your-openai-api-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# === OPTIONAL (Legacy Fallback) ===
# NICEONE_MERCHANT_ID=your-niceone-merchant-id
# NICEONE_RESTADMIN_ID=your-niceone-restadmin-id  
# NICEONE_SESSION=your-niceone-session-token
# FLOWARD_ALGOLIA_SEARCH_KEY=your-algolia-search-key

# === DEVELOPMENT ===
NODE_ENV=development
PORT=5001
```

### Frontend .env Template
```bash
# Copy this template to .env and fill in your values

# === REQUIRED ===
REACT_APP_API_URL=http://localhost:5001
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# === OPTIONAL (Future Features) ===
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
```

---

🔑 **Security Reminder**: Never commit actual environment files to version control. Use this documentation to set up your local environment properly.