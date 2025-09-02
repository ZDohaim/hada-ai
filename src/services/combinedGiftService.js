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
 * Get intelligent gift suggestions using GPT + database enrichment
 * @param {Object} preferences - User preferences for gift suggestions
 * @returns {Promise<Array>} - Array of AI-generated gift suggestions with product data
 */
export const getEnrichedGiftSuggestions = async (preferences) => {
  try {
    console.log("Calling GPT-powered API with preferences:", preferences);
    
    // Map preferences to GPT API format
    const requestPayload = {
      category: preferences.category,
      budget: preferences.budget,
      budget_min: preferences.budget_min,
      budget_max: preferences.budget_max,
      age: preferences.age,
      gender: preferences.gender,
      relationship: preferences.relationship,
      interests: preferences.interests,
      recipientName: preferences.recipientName,
      description: preferences.description || `Looking for a gift for a ${preferences.gender} ${preferences.age} years old ${preferences.relationship}. 
                   They are interested in ${preferences.category}. 
                   Budget is ${preferences.budget}.
                   Additional information: ${preferences.interests || 'No additional preferences'}`,
      enrichWithProducts: true
    };

    console.log("Sending to GPT endpoint:", requestPayload);

    const response = await axios.post(
      `${API_URL}/api/generate-gift`,
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout for GPT processing
      }
    );

    const giftSuggestions = response.data.gifts || [];
    console.log("GPT API response:", {
      total: giftSuggestions.length,
      gifts: giftSuggestions.length,
      metadata: response.data.search_metadata
    });

    return { 
      gifts: giftSuggestions, 
      enriched: true,
      metadata: response.data.search_metadata 
    };
  } catch (error) {
    console.error("Error in GPT getEnrichedGiftSuggestions:", error);
    
    // Fallback to direct database search if GPT fails
    if (error.response?.status >= 500 || error.code === 'ECONNABORTED') {
      console.log("GPT failed, falling back to direct database search...");
      return await fallbackDatabaseSearch(preferences);
    }
    
    // If GPT API fails, provide helpful error message
    if (error.response?.status === 401) {
      throw new Error("AI service temporarily unavailable. Please try again later.");
    }
    
    throw new Error(
      `Failed to get AI gift suggestions: ${error.response?.data?.error || error.message}`
    );
  }
};

/**
 * Fallback database search when GPT is unavailable
 * @param {Object} preferences - User preferences
 * @returns {Promise<Object>} - Direct database search results
 */
const fallbackDatabaseSearch = async (preferences) => {
  try {
    console.log("Using fallback database search for:", preferences);
    
    const budgetRange = parseBudget(preferences.budget);
    
    const fallbackPayload = {
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
      fallbackPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const giftSuggestions = response.data.gifts || [];
    
    // Transform database results to look like GPT results for consistency
    const transformedGifts = giftSuggestions.map((product, index) => ({
      ...product,
      rationale: `Found in ${preferences.category || 'recommended'} category within your budget`,
      confidence: 0.7,
      recommendation_id: `fallback_${index}`,
      source: product.store,
      fallback: true // Flag to indicate this was a fallback result
    }));

    console.log("Fallback database search completed:", {
      total: transformedGifts.length,
      fallback: true
    });

    return {
      gifts: transformedGifts,
      enriched: true,
      metadata: {
        ...response.data.search_metadata,
        fallback_mode: true,
        note: "AI recommendations unavailable, showing direct database results"
      }
    };
  } catch (fallbackError) {
    console.error("Fallback database search also failed:", fallbackError);
    throw new Error("Both AI and database search are temporarily unavailable. Please try again later.");
  }
};
