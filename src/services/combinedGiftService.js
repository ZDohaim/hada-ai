// src/services/combinedGiftService.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001";

/**
 * Parse budget string into min/max values
 * @param {string} budgetStr - Budget string like "500 SAR" or "200-800"
 * @returns {Object} - {min, max} budget range
 */
const parseBudget = (budgetStr) => {
  if (!budgetStr) return { min: null, max: null };
  
  const str = budgetStr.toString().toLowerCase().replace(/[,\s]/g, '');
  
  if (str.includes('-') || str.includes('to')) {
    const range = str.split(/[-to]/);
    return {
      min: parseInt(range[0]) || null,
      max: parseInt(range[1]) || null
    };
  }
  
  const amount = parseInt(str.replace(/[^0-9]/g, '')) || null;
  if (amount) {
    // For single amounts, create a range (±25%)
    return {
      min: Math.floor(amount * 0.75),
      max: Math.ceil(amount * 1.25)
    };
  }
  
  return { min: null, max: null };
};

/**
 * Get gift suggestions from the new database-based API
 * @param {Object} preferences - User preferences for gift suggestions
 * @returns {Promise<Array>} - Array of gift suggestions with product data
 */
export const getEnrichedGiftSuggestions = async (preferences) => {
  try {
    console.log("Calling new database API with preferences:", preferences);
    
    const budgetRange = parseBudget(preferences.budget);
    
    // Map preferences to new API format
    const requestPayload = {
      preferences: {
        age: preferences.age,
        gender: preferences.gender,
        relationship: preferences.relationship,
        interests: preferences.interests,
        occasion: preferences.description || preferences.occasion,
        category: preferences.category
      },
      filters: {
        stores: preferences.stores || ["floward", "jarir", "niceone"],
        priceRange: budgetRange,
        categories: preferences.category ? [preferences.category] : null
      },
      limit: 20
    };

    const response = await axios.post(
      `${API_URL}/api/gifts/search`,
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      }
    );

    const giftSuggestions = response.data.gifts || [];
    console.log("Database API response:", {
      total: response.data.total,
      gifts: giftSuggestions.length,
      searchTime: response.data.search_metadata?.search_time_ms
    });

    return { 
      gifts: giftSuggestions, 
      enriched: true,
      metadata: response.data.search_metadata 
    };
  } catch (error) {
    console.error("Error in getEnrichedGiftSuggestions:", error);
    
    // If new API fails, provide helpful error message
    if (error.response?.status === 404) {
      throw new Error("Database API not yet available. Please try again later.");
    }
    
    throw new Error(
      `Failed to get gift suggestions: ${error.response?.data?.error || error.message}`
    );
  }
};
/**
 * Search for products directly on NiceOne API
 * @param {string} query - Search query
 * @param {Object} options - Additional search options
 * @returns {Promise<Array>} - Search results
 */
export const searchNiceOneProducts = async (query, options = {}) => {
  try {
    await initializeApi();
    return await searchProducts(query, options);
  } catch (error) {
    console.error("Error searching NiceOne products:", error);
    throw error;
  }
};
