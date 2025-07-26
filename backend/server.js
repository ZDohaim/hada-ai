require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (err) {
  console.error("OpenAI init error:", err);
}

const niceoneApi = axios.create({
  baseURL: "https://api.niceonesa.com",
  timeout: 10000,
});

niceoneApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("NiceOne API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      params: error.config?.params,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

const jarirApi = axios.create({
  baseURL: "https://mecs.klevu.com/cloud-search/n-search/search",
  timeout: 30000, // Increased to 30 seconds
});

jarirApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Jarir API Error:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      params: error.config?.params,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

const getNiceOneHeaders = () => ({
  accept: "*/*",
  "accept-language": "en,en-US;q=0.9,ar;q=0.8",
  origin: "https://niceonesa.com",
  platform: "web",
  referer: "https://niceonesa.com/",
  "sec-ch-ua":
    '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  versionnumber: "5.0.11",
  "web-layout": "laptop",
  "x-oc-currency": "SAR",
  "x-oc-merchant-id":
    process.env.NICEONE_MERCHANT_ID || "2afc3973-04a5-4913-83f8-d45b0156b5f1",
  "x-oc-merchant-language": "en",
  "x-oc-restadmin-id":
    process.env.NICEONE_RESTADMIN_ID || "c15378d0-04f1-4d36-9af7-ab7e17da918b",
  "x-oc-session":
    process.env.NICEONE_SESSION || "761c5dab2893054e7ce719bf12d6b9b5",
  cookie: `PHPSESSID=${process.env.NICEONE_SESSION}; language=en-gb; currency=SAR`,
});

const getJarirHeaders = () => ({
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  origin: "https://www.jarir.com",
  priority: "u=1, i",
  referer: "https://www.jarir.com/",
  "sec-ch-ua":
    '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
});

const pruneEmpty = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== "" && v != null) out[k] = v;
  }
  return out;
};

const extractProducts = (res) => {
  return (
    res.data.products ||
    res.data.data?.products ||
    res.data.data?.components?.flatMap((c) => c.products || []) ||
    []
  );
};

// --- PATCH: Update Jarir search for popularity and trending ---
const searchJarir = async (query, retries = 2) => {
  // Use popularity sort (sort-priority) instead of default relevance
  const params = {
    autoComplete: true,
    typeOfSuggestions: "cms|category",
    noOfResults: 12,
    noOfResultsAC: 5,
    enablePartialSearch: false,
    sortOrder: "priority", // Use popularity sort
    showOutOfStockProducts: true,
    paginationStartsFrom: 0,
    visibility: "search",
    resultForZero: 0,
    enableFilters: true,
    fetchMinMaxPrice: true,
    noOfResultsZero: 5,
    klevu_multiSelectFilters: true,
    responseType: "json",
    ticket: "klevu-16370647733274933",
    sv: "2.3.18",
    term: query,
    klevu_filterLimit: 50,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `→ Jarir API attempt ${attempt + 1} for: "${query}" (popularity sort)`
      );

      const res = await jarirApi.get("", {
        params,
        headers: getJarirHeaders(),
      });

      const results = res.data.result || [];
      // Filter for 'Trending Now' or 'Best Sellers' tags if available
      const popularTags = ["Trending Now", "Best Sellers"];
      let filteredResults = results.filter((item) => {
        if (!item.producttag_data) return false;
        return item.producttag_data.some((tag) =>
          popularTags.includes(tag.label)
        );
      });
      if (filteredResults.length === 0) {
        // Fallback: return all products if no trending/best sellers found
        filteredResults = results;
      }
      console.log(
        `✓ Jarir API: ${filteredResults.length} results for "${query}"`
      );

      return filteredResults.map((item) => ({
        title: item.name || item.itemName || "Unknown Product",
        price: item.price || item.salePrice || null,
        image: item.image || item.imageUrl || null,
        link: item.url || item.productUrl || null,
        brand: item.brand || item.brandName || null,
        id: item.id || item.itemId || null,
        sku: item.sku || null,
        tags: item.producttag_data || [],
        priority: item.priority || null,
      }));
    } catch (err) {
      console.error(
        `✗ Jarir API attempt ${attempt + 1} failed for "${query}":`,
        err.message
      );

      if (attempt === retries) {
        console.error(`✗ All Jarir API attempts failed for "${query}"`);
        return [];
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return [];
};

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/version-check", (req, res) => {
  res.json({
    version: "Updated with Jarir/NiceOne only",
    timestamp: new Date().toISOString(),
    endpoints: ["/api/jarir/search", "/api/niceone/search"],
  });
});

app.get("/api/niceone/search", async (req, res) => {
  try {
    const { q, sort, page, limit, search } = req.query;
    if (!q) return res.status(400).json({ error: "q required" });

    const catParams = pruneEmpty({
      route: "rest/product_admin/products",
      seo_url: q,
      sort: sort || "most_popular",
      page: page || 1,
      limit: limit || 12,
      first: false,
      ...(search ? { search } : {}),
    });
    console.log("→ category search params:", catParams);
    let r = await niceoneApi.get("/", {
      params: catParams,
      headers: getNiceOneHeaders(),
    });
    let products = extractProducts(r);

    if (search && products.length === 0) {
      const ftParams = pruneEmpty({
        route: "rest/product_admin/products",
        search: q,
        sort: sort || "most_popular",
        page: page || 1,
        limit: limit || 12,
        first: false,
      });
      console.log("← falling back to free-text params:", ftParams);
      r = await niceoneApi.get("/", {
        params: ftParams,
        headers: getNiceOneHeaders(),
      });
      products = extractProducts(r);
    }

    return res.json({ products });
  } catch (err) {
    console.error("NiceOne search error:", err.response?.data || err.message);
    return res
      .status(500)
      .json({ error: "NiceOne proxy failed", details: err.response?.data });
  }
});

app.get("/api/niceone/test", async (req, res) => {
  try {
    const params = pruneEmpty({
      route: "rest/product_admin/products",
      seo_url: "Makeup",
      sort: "most_popular",
      page: 1,
      limit: 5,
      first: false,
    });
    const r = await niceoneApi.get("/", {
      params,
      headers: getNiceOneHeaders(),
    });
    const products = extractProducts(r);
    res.json({ success: true, sampleCount: products.length });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: err.response?.data || err.message });
  }
});

app.get("/api/niceone/check-connection", async (req, res) => {
  try {
    console.log("Testing NiceOne API connection...");
    const response = await niceoneApi.get("/", {
      params: { route: "common/home" },
      headers: getNiceOneHeaders(),
    });
    res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (err) {
    console.error("NiceOne connection test failed:", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    res.status(500).json({
      success: false,
      error: err.message,
      details: err.response?.data || "No additional details",
    });
  }
});

app.get("/api/jarir/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ error: "q required" });

    console.log("→ Jarir search for:", q);
    const products = await searchJarir(q);
    const limitedProducts = limit
      ? products.slice(0, parseInt(limit))
      : products;

    return res.json({ products: limitedProducts });
  } catch (err) {
    console.error("Jarir search error:", err.message);
    return res
      .status(500)
      .json({ error: "Jarir search failed", details: err.message });
  }
});

app.get("/api/jarir/test", async (req, res) => {
  try {
    const products = await searchJarir("laptop");
    res.json({ success: true, sampleCount: products.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/test-openai", async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({
        success: false,
        message:
          "OpenAI API not initialized. Check your API key configuration.",
      });
    }

    // Simple test to check if OpenAI API is working
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say 'OpenAI test successful'" }],
    });

    return res.json({
      success: true,
      message: "OpenAI API is working correctly",
      sample: response.choices[0].message.content,
    });
  } catch (err) {
    console.error("OpenAI connection test failed:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to connect to OpenAI API",
      error: err.message,
    });
  }
});

app.post("/api/generate-gift", async (req, res) => {
  console.log(
    "GENERATE-GIFT ENDPOINT HIT - Updated version with enhanced search accuracy"
  );
  try {
    if (!openai) throw new Error("OpenAI not initialized");
    const prefs = req.body;

    // Log the received preferences
    console.log("Received preferences:", prefs);

    // Build context-aware prompt that avoids irrelevant occasions
    let occasionContext = "";
    if (
      prefs.description &&
      prefs.description.toLowerCase().includes("birthday")
    ) {
      occasionContext = "\nOccasion: Birthday celebration";
    } else if (
      prefs.description &&
      prefs.description.toLowerCase().includes("anniversary")
    ) {
      occasionContext = "\nOccasion: Anniversary";
    } else if (
      prefs.description &&
      (prefs.description.toLowerCase().includes("wedding") ||
        prefs.description.toLowerCase().includes("marriage"))
    ) {
      occasionContext = "\nOccasion: Wedding";
    } else {
      occasionContext =
        "\nOccasion: General gift giving (NOT birthday-specific unless explicitly mentioned)";
    }

    let userPrompt =
      "Please generate premium gift suggestions based on these specific criteria:";

    if (prefs.age) userPrompt += `\n- Recipient's age: ${prefs.age}`;
    if (prefs.gender) userPrompt += `\n- Gender: ${prefs.gender}`;
    if (prefs.relationship)
      userPrompt += `\n- Relationship to recipient: ${prefs.relationship}`;
    if (prefs.category)
      userPrompt += `\n- Preferred category: ${prefs.category}`;
    if (prefs.budget) userPrompt += `\n- Budget range: ${prefs.budget} SAR`;
    if (prefs.interests)
      userPrompt += `\n- Personal interests/preferences: ${prefs.interests}`;

    userPrompt += occasionContext;

    if (prefs.description) {
      userPrompt += `\n\nAdditional context: ${prefs.description}`;
    }

    userPrompt +=
      "\n\nIMPORTANT: Focus ONLY on the specified preferences. Do NOT include birthday-related items unless the occasion is explicitly mentioned as a birthday. Generate diverse, high-quality recommendations that match the exact criteria provided.";

    const sys = {
      role: "system",
      content: `
      You are Hadai.ai, a precision gift recommendation specialist for Saudi Arabian customers who creates EXACTLY what users request.

      **CRITICAL RULES:**
      1. NEVER suggest birthday-specific items (cakes, candles, party supplies) unless explicitly requested for a birthday
      2. Focus ONLY on the user's specified preferences and criteria
      3. Generate 6-8 diverse recommendations using DIFFERENT categories when appropriate
      4. Create SPECIFIC, targeted search terms that will find exact products
      5. ONLY recommend products that are popular or trending in their respective stores:
         - For JARIR: Only suggest products that are marked as 'Trending Now' or 'Best Sellers'. If no such product is found, do NOT suggest a generic fallback—try a different category or say 'No suitable product found'.
         - For NICEONE: Prefer products that are popular, trending, or best sellers if possible.

      **FIXED CATEGORIES** (use only these):
      Makeup, Perfume, Care, Health & Nutrition, Devices, Premium, Nails, Gifts, Lenses, Home Scents, Food & Drink

      **STORE ROUTING RULES** (STRICTLY follow):
      - JARIR: Electronics, devices, gaming, computers, smart gadgets, phones, tablets, tech accessories
      - NICEONE: Makeup, beauty tools, nail products, skincare, cosmetics, contact lenses, fragrances

      **SEARCH CONTEXT REQUIREMENTS:**
      - Use 3-5 specific keywords that target the exact product type
      - Include brand preferences if mentioned
      - Avoid generic terms - be PRECISE
      - Include quality indicators (premium, luxury, high-quality)
      - Consider Saudi preferences and cultural relevance

      **EXAMPLE OUTPUTS:**
      For tech-interested person: "wireless bluetooth gaming headphones premium" not just "headphones"
      For beauty lover: "luxury matte lipstick palette set" not just "makeup"

      Return in this EXACT JSON format:
      {
        "gifts": [
          { 
            "category": "Devices", 
            "store": "JARIR", 
            "search_context": "wireless bluetooth gaming headphones rgb lighting", 
            "modifier": "gaming headset" 
          },
          { 
            "category": "Makeup", 
            "store": "NICEONE", 
            "search_context": "luxury matte lipstick palette long-lasting", 
            "modifier": "lipstick collection" 
          }
        ]
      }

      **QUALITY ASSURANCE:**
      - Each recommendation must be distinctly different
      - Vary price points within the specified budget
      - Ensure cultural appropriateness for Saudi market
      - Match the user's exact relationship and age criteria
      - NO generic suggestions - everything must be specific, targeted, and popular/trending
      `,
    };

    const usr = {
      role: "user",
      content: userPrompt,
    };

    console.log("Sending enhanced prompt to OpenAI:", {
      system: sys.content.substring(0, 200) + "...",
      user: userPrompt,
    });

    console.log("Making OpenAI API call with GPT-4o-mini...");

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [sys, usr],
      temperature: 0.7, // Slightly reduce randomness for more consistent results
      max_tokens: 2000, // Ensure sufficient space for detailed responses
    });

    const responseContent = chat.choices[0].message.content;
    console.log("RAW OpenAI response:", responseContent);

    // Parse the JSON response with enhanced error handling
    let gifts;
    try {
      console.log("🔍 Attempting to parse JSON...");
      const jsonResponse = JSON.parse(responseContent);
      gifts = jsonResponse.gifts || [];
      console.log("✅ Successfully parsed JSON. Gifts count:", gifts.length);
      console.log("Parsed gifts:", JSON.stringify(gifts, null, 2));
    } catch (parseErr) {
      console.error("❌ Error parsing OpenAI response:", parseErr);
      console.log("🔍 Attempting to extract JSON from response");

      // Enhanced JSON extraction
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log(
          "🔍 Found JSON match:",
          jsonMatch[0].substring(0, 200) + "..."
        );
        try {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          gifts = jsonResponse.gifts || [];
          console.log(
            "✅ Successfully extracted and parsed JSON. Gifts count:",
            gifts.length
          );
        } catch (extractErr) {
          console.error("❌ Error extracting JSON:", extractErr);
          throw new Error(
            "Could not parse gift suggestions from OpenAI response"
          );
        }
      } else {
        console.error("❌ No JSON found in response");
        throw new Error("Could not extract JSON from OpenAI response");
      }
    }

    // Validate gift suggestions
    if (!gifts || gifts.length === 0) {
      throw new Error("No gift suggestions generated");
    }

    if (!prefs.enrichWithProducts) return res.json({ gifts });

    // Enhanced product enrichment with multiple products per recommendation
    const enriched = await Promise.all(
      gifts.map(async (g, index) => {
        const store = g.store ? g.store.toLowerCase() : "unknown";
        const query = g.search_context || g.modifier || g.category;

        console.log(
          `🔍 Processing gift ${index}: store="${store}", query="${query}"`
        );

        try {
          if (store === "niceone") {
            const params = {
              route: "rest/product_admin/products",
              search: query,
              sort: "most_popular",
              page: 1,
              limit: 8, // Increased from 5 to show more options
              first: false,
            };

            const response = await niceoneApi.get("/", {
              params: pruneEmpty(params),
              headers: getNiceOneHeaders(),
            });

            const products = extractProducts(response);
            console.log(
              `🛍️ NiceOne found ${products.length} products for "${query}"`
            );

            return {
              ...g,
              products: products.slice(0, 3), // Return top 3 products
              product: products[0] || null, // Keep primary product for backward compatibility
              source: "niceone",
              searchQuery: query,
              recommendation_id: `niceone_${index}`,
            };
          } else if (store === "jarir") {
            let jarirQuery = query;
            let fallbackQuery = null;
            if (g.category) {
              const cat = g.category.toLowerCase();
              if (cat === "books") {
                // Use full title, fallback to first 3 words
                jarirQuery = query;
                fallbackQuery = jarirQuery.split(" ").slice(0, 3).join(" ");
                console.log(
                  `🔍 [Books] Jarir query: "${jarirQuery}", fallback: "${fallbackQuery}"`
                );
              } else if (cat === "devices" || cat === "electronics") {
                // Use full context, fallback to first 3 words
                jarirQuery = query;
                fallbackQuery = jarirQuery.split(" ").slice(0, 3).join(" ");
                console.log(
                  `🔍 [Electronics] Jarir query: "${jarirQuery}", fallback: "${fallbackQuery}"`
                );
              } else if (cat === "games") {
                // Use full context, fallback to 'game' + main keyword
                jarirQuery = query;
                const mainKeyword = jarirQuery.split(" ")[0];
                fallbackQuery = `game ${mainKeyword}`;
                console.log(
                  `🔍 [Games] Jarir query: "${jarirQuery}", fallback: "${fallbackQuery}"`
                );
              } else if (cat === "office supply" || cat === "office supplies") {
                // Use full context, fallback to category + main keyword
                jarirQuery = query;
                const mainKeyword = jarirQuery.split(" ")[0];
                fallbackQuery = `office ${mainKeyword}`;
                console.log(
                  `🔍 [Office Supply] Jarir query: "${jarirQuery}", fallback: "${fallbackQuery}"`
                );
              } else {
                // Default: use full context, fallback to first 2 words
                jarirQuery = query;
                fallbackQuery = jarirQuery.split(" ").slice(0, 2).join(" ");
                console.log(
                  `🔍 [Default] Jarir query: "${jarirQuery}", fallback: "${fallbackQuery}"`
                );
              }
            }
            console.log(`🔍 Calling Jarir API for query: "${jarirQuery}"`);
            let products = await searchJarir(jarirQuery);
            // Fallback if no results and fallbackQuery exists
            if (products.length === 0 && fallbackQuery) {
              console.log(`🔍 Fallback Jarir query: "${fallbackQuery}"`);
              const fallbackProducts = await searchJarir(fallbackQuery);
              if (fallbackProducts.length > 0) {
                return {
                  ...g,
                  products: fallbackProducts.slice(0, 3),
                  product: fallbackProducts[0] || null,
                  source: "jarir",
                  searchQuery: fallbackQuery,
                  recommendation_id: `jarir_${index}_fallback`,
                };
              }
            }
            return {
              ...g,
              products: products.slice(0, 3),
              product: products[0] || null,
              source: "jarir",
              searchQuery: jarirQuery,
              recommendation_id: `jarir_${index}`,
            };
          } else {
            console.log(
              `🔍 Unknown store "${store}", falling back to Jarir for query: "${query}"`
            );
            // Fallback to Jarir for unknown stores
            const products = await searchJarir(query);
            return {
              ...g,
              products: products.slice(0, 3),
              product: products[0] || null,
              source: "jarir",
              searchQuery: query,
              recommendation_id: `fallback_${index}`,
              fallback: true,
            };
          }
        } catch (err) {
          console.error(
            `❌ Error enriching gift (${store}) ${query}:`,
            err.message
          );
          return {
            ...g,
            products: [],
            product: null,
            source: store,
            searchQuery: query,
            recommendation_id: `error_${index}`,
            enrichmentError: true,
          };
        }
      })
    );

    // Log enrichment results
    const successCount = enriched.filter(
      (g) => g.product || (g.products && g.products.length > 0)
    ).length;
    console.log(
      `📊 Enrichment Results: ${successCount}/${enriched.length} recommendations have products`
    );

    res.json({ gifts: enriched });
  } catch (err) {
    console.error("❌ /api/generate-gift error:", err.stack || err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      details: err.response?.data || "No additional details",
    });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
