// Category Mapping Service - Intelligent translation between user preferences and database categories
// This ensures accurate gift recommendations by mapping broad user categories to specific database categories

/**
 * Maps frontend user categories to specific database categories for accurate matching
 */
const FRONTEND_TO_DATABASE_MAPPING = {
  // Frontend categories from GiftFlow.js
  "Tech": ["electronics", "devices", "gaming"],
  "Fashion": ["fashion", "premium", "gifts"],
  "Home": ["home_decor", "home_scents", "premium"],
  "Books": ["books", "premium"],
  "Flowers": ["gifts", "premium"],
  "Food & Drink": ["food_drink", "premium"],
  "Fitness": ["fitness", "care"],
  "Beauty": ["makeup", "perfume", "care", "nails"],
  "Gaming": ["gaming", "electronics"],
  "Office": ["office", "books"],
  "Other": ["gifts", "premium"]
};

/**
 * Store specialization mapping - which stores are best for which categories
 */
const STORE_CATEGORY_EXPERTISE = {
  "jarir": {
    primary: ["electronics", "books", "gaming", "office", "devices"],
    secondary: ["premium"]
  },
  "niceone": {
    primary: ["makeup", "perfume", "care", "fitness", "nails", "lenses"],
    secondary: ["fashion"]
  },
  "floward": {
    primary: ["gifts", "fashion", "premium", "home_decor"],
    secondary: []
  }
};

/**
 * Category priority weights for recommendation accuracy
 * Higher numbers = higher priority for that category
 */
const CATEGORY_WEIGHTS = {
  // High-intent, specific categories
  "gaming": 1.0,
  "books": 1.0, 
  "makeup": 1.0,
  "perfume": 1.0,
  "electronics": 1.0,
  
  // Medium-intent categories  
  "fashion": 0.8,
  "fitness": 0.8,
  "office": 0.8,
  "care": 0.8,
  "home_decor": 0.8,
  
  // Broad fallback categories
  "premium": 0.6,
  "gifts": 0.5,
  "devices": 0.5
};

/**
 * Maps a user's category selection to appropriate database categories
 * @param {string} userCategory - Category selected by user in frontend
 * @param {Object} userPreferences - Additional user context (budget, relationship, etc.)
 * @returns {Array} Array of database category codes, ordered by relevance
 */
const mapUserCategoryToDatabase = (userCategory, userPreferences = {}) => {
  if (!userCategory) {
    return ["gifts", "premium"]; // Safe fallback
  }

  const normalizedCategory = userCategory.trim();
  const mappedCategories = FRONTEND_TO_DATABASE_MAPPING[normalizedCategory] || [];
  
  if (mappedCategories.length === 0) {
    // Fallback for unmapped categories
    console.warn(`⚠️ Unmapped user category: ${userCategory}. Using fallback.`);
    return ["gifts", "premium"];
  }

  // Sort by category weights for better recommendations
  const sortedCategories = mappedCategories.sort((a, b) => {
    const weightA = CATEGORY_WEIGHTS[a] || 0.5;
    const weightB = CATEGORY_WEIGHTS[b] || 0.5;
    return weightB - weightA; // Descending order
  });

  console.log(`📊 Mapped "${userCategory}" → [${sortedCategories.join(', ')}]`);
  return sortedCategories;
};

/**
 * Determines which stores should be prioritized for given categories
 * @param {Array} databaseCategories - Array of database category codes
 * @param {Object} userPreferences - User context (budget, relationship, etc.)
 * @returns {Array} Array of store codes, ordered by expertise relevance
 */
const getOptimalStoresForCategories = (databaseCategories, userPreferences = {}) => {
  const storeScores = {};
  
  // Calculate scores for each store based on category expertise
  Object.entries(STORE_CATEGORY_EXPERTISE).forEach(([store, expertise]) => {
    let score = 0;
    
    // Primary expertise gets high score
    databaseCategories.forEach(category => {
      if (expertise.primary.includes(category)) {
        score += 10;
      } else if (expertise.secondary.includes(category)) {
        score += 3;
      }
    });
    
    storeScores[store] = score;
  });

  // Special logic for budget and relationship context
  const budget = userPreferences.budget_max || 1000;
  const relationship = userPreferences.relationship?.toLowerCase();
  
  // Boost Floward for high-budget or romantic contexts
  if (budget > 300 || ['partner', 'spouse', 'girlfriend', 'boyfriend'].includes(relationship)) {
    storeScores.floward = (storeScores.floward || 0) + 5;
  }
  
  // Sort stores by score
  const sortedStores = Object.entries(storeScores)
    .sort(([,a], [,b]) => b - a)
    .map(([store]) => store)
    .filter(store => storeScores[store] > 0);

  console.log(`🏪 Store priorities: ${sortedStores.join(' > ')}`);
  return sortedStores.length > 0 ? sortedStores : ["jarir", "niceone", "floward"];
};

/**
 * Creates a comprehensive search strategy based on user preferences
 * @param {Object} userPreferences - Complete user preference object
 * @returns {Object} Search strategy with categories, stores, and weights
 */
const createSearchStrategy = (userPreferences) => {
  const userCategory = userPreferences.category;
  const databaseCategories = mapUserCategoryToDatabase(userCategory, userPreferences);
  const prioritizedStores = getOptimalStoresForCategories(databaseCategories, userPreferences);
  
  return {
    categories: databaseCategories,
    stores: prioritizedStores,
    weights: databaseCategories.map(cat => CATEGORY_WEIGHTS[cat] || 0.5),
    originalUserCategory: userCategory,
    searchContext: {
      mapped_from: userCategory,
      database_categories: databaseCategories,
      store_priorities: prioritizedStores,
      budget_range: userPreferences.budget,
      relationship: userPreferences.relationship
    }
  };
};

/**
 * Validates that a category exists in the database
 * @param {string} categoryCode - Category code to validate  
 * @returns {boolean} True if category exists
 */
const isValidDatabaseCategory = (categoryCode) => {
  const validCategories = [
    'gifts', 'perfume', 'makeup', 'care', 'health_nutrition', 'devices', 
    'premium', 'nails', 'lenses', 'home_scents', 'food_drink',
    'fashion', 'fitness', 'books', 'gaming', 'home_decor', 'electronics', 'office'
  ];
  return validCategories.includes(categoryCode);
};

/**
 * Gets all valid frontend categories for UI display
 * @returns {Array} Array of frontend category options
 */
const getValidFrontendCategories = () => {
  return Object.keys(FRONTEND_TO_DATABASE_MAPPING);
};

/**
 * Gets category suggestions based on user context
 * @param {Object} userContext - Age, gender, relationship, interests
 * @returns {Array} Suggested categories ordered by relevance
 */
const suggestCategoriesForUser = (userContext) => {
  const suggestions = [];
  
  const age = parseInt(userContext.age?.split('-')[0]) || 25;
  const gender = userContext.gender?.toLowerCase();
  const relationship = userContext.relationship?.toLowerCase();
  const interests = userContext.interests?.toLowerCase() || '';
  
  // Age-based suggestions
  if (age < 18) {
    suggestions.push("Gaming", "Books", "Tech");
  } else if (age < 35) {
    suggestions.push("Tech", "Fashion", "Gaming", "Fitness");
  } else if (age < 55) {
    suggestions.push("Home", "Books", "Fashion", "Beauty");
  } else {
    suggestions.push("Books", "Home", "Premium", "Health");
  }
  
  // Gender-based suggestions
  if (gender === 'female') {
    suggestions.unshift("Beauty", "Fashion", "Home");
  } else if (gender === 'male') {
    suggestions.unshift("Tech", "Gaming", "Fitness");
  }
  
  // Relationship-based suggestions
  if (['partner', 'spouse'].includes(relationship)) {
    suggestions.unshift("Fashion", "Flowers", "Beauty");
  }
  
  // Interest-based suggestions
  if (interests.includes('game')) suggestions.unshift("Gaming");
  if (interests.includes('book')) suggestions.unshift("Books");
  if (interests.includes('tech')) suggestions.unshift("Tech");
  if (interests.includes('fit')) suggestions.unshift("Fitness");
  
  // Remove duplicates and return top 5
  return [...new Set(suggestions)].slice(0, 5);
};

module.exports = {
  mapUserCategoryToDatabase,
  getOptimalStoresForCategories,
  createSearchStrategy,
  isValidDatabaseCategory,
  getValidFrontendCategories,
  suggestCategoriesForUser,
  FRONTEND_TO_DATABASE_MAPPING,
  STORE_CATEGORY_EXPERTISE,
  CATEGORY_WEIGHTS
};