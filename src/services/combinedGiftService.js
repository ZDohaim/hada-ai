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
 * Get gift suggestions from GPT and enrich them with product data from NiceOne API
 * @param {Object} preferences - User preferences for gift suggestions
 * @returns {Promise<Array>} - Array of gift suggestions with product data
 */
export const getEnrichedGiftSuggestions = async (preferences) => {
  try {
    const gptResponse = await generateGiftSuggestions(preferences);
    const giftSuggestions = gptResponse.gifts || [];

    console.log("GPT gift suggestions:", giftSuggestions);

    await initializeApi();

    const enrichedGifts = await Promise.all(
      giftSuggestions.map(async (gift) => {
        try {
          // now searchProducts will send ?q=Perfume&search=floral
          const { products } = await searchProducts(
            gift.category,
            gift.modifier ? { search: gift.modifier } : {}
          );
          const top = products[0] || null;
          const alts = products.slice(1, 4);
          return { ...gift, product: top, alternatives: alts };
        } catch (error) {
          console.error(`Failed to enrich gift "${gift.category}":`, error);
          return { ...gift, product: null, alternatives: [] };
        }
      })
    );
    return { gifts: enrichedGifts, enriched: true };
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
