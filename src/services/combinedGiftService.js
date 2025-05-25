// src/services/combinedGiftService.js
import { generateGiftSuggestions } from "./gptService";
import { searchProducts, initializeApi } from "./niceoneService";

/**
 * Format a search query for better product matching
 * @param {string} query - Original query
 * @returns {string} - Formatted query
 */
const formatSearchQuery = (query) => {
  let formatted = query
    .replace(/with|for|featuring|including|that|which|and/gi, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = formatted.split(" ");
  if (words.length > 4) formatted = words.slice(0, 4).join(" ");
  return formatted;
};

/**
 * Get gift suggestions from GPT and enrich them with product data from appropriate APIs
 * @param {Object} preferences - User preferences for gift suggestions
 * @returns {Promise<Array>} - Array of gift suggestions with product data
 */
export const getEnrichedGiftSuggestions = async (preferences) => {
  try {
    // The backend now handles both GPT generation AND enrichment with the correct APIs
    // So we just need to call generateGiftSuggestions with enrichWithProducts: true
    const enrichedPreferences = {
      ...preferences,
      enrichWithProducts: true,
    };

    const gptResponse = await generateGiftSuggestions(enrichedPreferences);
    const giftSuggestions = gptResponse.gifts || [];

    console.log("Enriched gift suggestions from backend:", giftSuggestions);

    return { gifts: giftSuggestions, enriched: true };
  } catch (error) {
    console.error("Error in getEnrichedGiftSuggestions:", error);
    throw new Error(
      `Failed to get enriched gift suggestions: ${error.message}`
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
