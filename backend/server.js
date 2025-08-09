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

// --- Floward Algolia client ---
const algoliaAppId = "Q085HQ2LUQ";
const algoliaSearchKey = process.env.FLOWARD_ALGOLIA_SEARCH_KEY || "a36327f4aec9eec775af628df0f659ab"; // search only
const ALG_AGENT = encodeURIComponent("Algolia for JavaScript (4.17.0); Browser (lite); instantsearch.js (4.56.9); react (18.2.0); react-instantsearch (7.0.1); react-instantsearch-core (7.0.1); next.js (13.4.12); JS Helper (3.14.0)");
const algoliaEndpoint = `https://${algoliaAppId.toLowerCase()}-1.algolianet.com/1/indexes/*/queries?x-algolia-agent=${ALG_AGENT}&x-algolia-api-key=${algoliaSearchKey}&x-algolia-application-id=${algoliaAppId}`;

const flowardFacets = [
  "Category",
  "attributes.balloons.nameEn",
  "attributes.brand.nameEn",
  "attributes.bundleType.nameEn",
  "attributes.color.nameEn",
  "attributes.flavor.nameEn",
  "attributes.flower.nameEn",
  "attributes.gender.nameEn",
  "attributes.jewelry-material.nameEn",
  "attributes.jewelry-type.nameEn",
  "attributes.packaging.nameEn",
  "attributes.perfume-type.nameEn",
  "attributes.plant-type.nameEn",
  "attributes.serving-size.nameEn",
  "attributes.size-fragrances.nameEn",
  "attributes.voucher-type.nameEn",
  "attributes.watch-strap.nameEn",
  "attributes.watch-waterproof.nameEn",
  "attributes.watches-style.nameEn",
  "categories.categoryOccasion.nameEn",
  "categories.giftByRecipient.nameEn",
  "hierarchicalCategories.lvl0",
  "productAvailability.2.priceWithVat",
  "vasFilter"
];

function buildFlowardFilters(p) {
  const f = [];
  f.push("productAvailability.2.listed=1");
  f.push("NOT productAvailability.2.isPickAndPack=1");
  f.push("NOT type=4");

  if (p.mustBeInStock && p.allowPreorder) f.push("(productAvailability.2.availability>0 OR productAvailability.2.enablePreOrder=1)");
  else if (p.mustBeInStock) f.push("productAvailability.2.availability>0");
  else if (p.allowPreorder) f.push("productAvailability.2.enablePreOrder=1");

  if (Number.isFinite(p.minPrice)) f.push(`productAvailability.2.priceWithVat>=${p.minPrice}`);
  if (Number.isFinite(p.maxPrice)) f.push(`productAvailability.2.priceWithVat<=${p.maxPrice}`);

  if (p.recipient?.length) f.push("(" + p.recipient.map(v => `categories.giftByRecipient.nameEn:"${v}"`).join(" OR ") + ")");
  if (p.occasion?.length) f.push("(" + p.occasion.map(v => `categories.categoryOccasion.nameEn:"${v}"`).join(" OR ") + ")");
  if (p.category?.length) f.push("(" + p.category.map(v => `hierarchicalCategories.lvl0:"${v}"`).join(" OR ") + ")");
  if (p.brand?.length) f.push("(" + p.brand.map(v => `attributes.brand.nameEn:"${v}"`).join(" OR ") + ")");
  if (p.color?.length) f.push("(" + p.color.map(v => `attributes.color.nameEn:"${v}"`).join(" OR ") + ")");

  return f.join(" AND ");
}

function buildFlowardParams(p) {
  const qp = new URLSearchParams();
  qp.set("query", p.query ?? "");
  qp.set("hitsPerPage", String(p.hitsPerPage ?? 50)); // Increased from 18 to 50
  qp.set("page", String(p.page ?? 0));
  qp.set("clickAnalytics", "true");
  qp.set("getRankingInfo", "true");
  qp.set("highlightPreTag", "__ais-highlight__");
  qp.set("highlightPostTag", "__/ais-highlight__");
  qp.set("queryLanguages", JSON.stringify(["en","ar"]));
  qp.set("maxValuesPerFacet", "1000000");
  qp.set("facets", JSON.stringify(flowardFacets));
  qp.set("filters", buildFlowardFilters(p));
  return qp.toString();
}

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

async function searchFloward(prefs) {
  const body = {
    requests: [
      {
        indexName: "product_KSA",
        params: buildFlowardParams(prefs)
      }
    ]
  };
  const r = await axios.post(algoliaEndpoint, body, {
    headers: { "content-type": "application/json", origin: "https://floward.com", referer: "https://floward.com/" },
    timeout: 15000
  });
  const hits = r.data?.results?.[0]?.hits ?? [];
  return hits.map(h => ({
    title: h.nameEn || h.name || h.title || "Product",
    price: h.productAvailability?.[2]?.priceWithVat ?? null,
    image: h.imageUrl || h.image || h.thumbnail || null,
    link: h.url || h.slug || null,
    brand: h.attributes?.brand?.nameEn || null,
    id: h.objectID || h.id || null,
  }));
}

// --- PATCH: Update Jarir search for popularity and trending ---
const searchJarir = async (query, retries = 2) => {
  // Enhanced Jarir search with 50 results and relevance sorting
  const params = {
    autoComplete: true,
    typeOfSuggestions: "cms|category", 
    noOfResults: 50, // Increased from 12 to 50
    noOfResultsAC: 5,
    enablePartialSearch: false,
    sortOrder: "rel", // Use relevance sort for better accuracy
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
    filterResults: "", // Add empty filterResults parameter
    klevu_filterLimit: 50,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(
        `→ Jarir API attempt ${attempt + 1} for: "${query}" (relevance sort, 50 results)`
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

app.post("/api/floward/search", async (req, res) => {
  try {
    const prefs = req.body || {};
    const products = await searchFloward(prefs);
    res.json({ products });
  } catch (err) {
    console.error("Floward Algolia error:", err.response?.data || err.message);
    res.status(500).json({ error: "Floward search failed", details: err.response?.data || err.message });
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

      **STORE ROUTING RULES** (STRICTLY follow based on BUDGET, OCCASION & RELATIONSHIP):
      
      **FLOWARD** (Premium/Luxury - 300+ SAR typically):
      - Products: Premium flowers, luxury flower+gift bundles, high-end perfumes, jewelry, luxury watches, premium chocolates
      - Best for: Romantic occasions (anniversaries, Valentine's), formal events, close relationships (spouse, parents), important celebrations
      - Budget: Higher budget gifts (300+ SAR), when quality and presentation matter most
      - Cultural context: Traditional Saudi formal gift-giving, impressive presents for VIPs
      
      **JARIR** (Practical/Mid-range - 100-500 SAR typically):  
      - Products: Books, electronics, gaming, computers, tech accessories, office/school supplies, educational items
      - Best for: Practical occasions (graduation, new job, back-to-school), professional relationships, tech enthusiasts
      - Budget: Mid-range budget (100-500 SAR), practical value-focused gifts
      - Cultural context: Educational advancement, professional development, practical needs
      
      **NICEONE** (Budget-friendly - 50-200 SAR typically):
      - Products: Makeup, beauty tools, skincare, cosmetics, contact lenses, affordable fragrances, nail products  
      - Best for: Casual occasions, younger recipients, budget-conscious gifting, everyday beauty needs
      - Budget: Lower budget (50-200 SAR), frequent/casual gifting
      - Cultural context: Young women, students, casual friendships, self-care gifts

      **SEARCH CONTEXT REQUIREMENTS:**
      - Use 3-5 specific keywords that target the exact product type
      - Include brand preferences if mentioned
      - Avoid generic terms - be PRECISE
      
      **Store-specific search indicators:**
      - FLOWARD: Include "premium", "luxury", "elegant", "boutique", "exclusive", "high-quality"
      - JARIR: Include "bestseller", "popular", "trending", "latest", "professional", "advanced"  
      - NICEONE: Include "affordable", "popular", "trendy", "everyday", "budget-friendly"
      
      **Cultural relevance for Saudi market:**
      - Consider modesty and cultural appropriateness
      - Prefer internationally recognized brands
      - Account for climate (long-lasting, heat-resistant products)
      - Include Arabic preferences where applicable

      **DECISION MATRIX - Choose stores based on:**
      1. BUDGET: High budget (300+ SAR) → Consider Floward first, Mid (100-500) → Jarir, Low (<200) → NiceOne  
      2. OCCASION: Romantic/Formal → Floward, Practical/Educational → Jarir, Casual → NiceOne
      3. RELATIONSHIP: Close personal → Floward (if budget allows), Professional → Jarir, Casual → NiceOne
      4. PRODUCT TYPE: Flowers/luxury bundles → Floward, Tech/books → Jarir, Beauty → NiceOne

      **EXAMPLE OUTPUTS:**
      High budget + romantic + wife → FLOWARD: "premium luxury flower bouquet jewelry bundle elegant"
      Mid budget + tech enthusiast + friend → JARIR: "wireless gaming headphones bestseller rgb advanced"  
      Low budget + beauty lover + casual → NICEONE: "affordable matte lipstick palette trendy long-lasting"

      Return in this EXACT JSON format:
      {
        "gifts": [
          { 
            "category": "Devices", 
            "store": "JARIR", 
            "search_context": "wireless gaming headphones bestseller rgb advanced", 
            "modifier": "gaming headset" 
          },
          { 
            "category": "Makeup", 
            "store": "NICEONE", 
            "search_context": "affordable matte lipstick palette trendy long-lasting", 
            "modifier": "lipstick collection" 
          },
          { 
            "category": "Gifts", 
            "store": "FLOWARD", 
            "search_context": "premium luxury flower bouquet roses elegant exclusive", 
            "modifier": "flower arrangement" 
          }
        ]
      }

      **QUALITY ASSURANCE:**
      - Each recommendation must be distinctly different
      - INTELLIGENTLY match store to budget, occasion, and relationship importance
      - Vary price points within the specified budget using appropriate stores
      - Ensure cultural appropriateness for Saudi market
      - Match the user's exact relationship and age criteria
      - Use store-specific quality indicators in search contexts
      - NO generic suggestions - everything must be specific, targeted, and popular/trending
      - ALWAYS justify store choice based on the decision matrix above
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
              limit: 50, // Increased from 8 to 50 for more options
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
              products: products.slice(0, 50), // Return top 50 products
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
                  products: fallbackProducts.slice(0, 50),
                  product: fallbackProducts[0] || null,
                  source: "jarir",
                  searchQuery: fallbackQuery,
                  recommendation_id: `jarir_${index}_fallback`,
                };
              }
            }
            return {
              ...g,
              products: products.slice(0, 50),
              product: products[0] || null,
              source: "jarir",
              searchQuery: jarirQuery,
              recommendation_id: `jarir_${index}`,
            };
          } else if (store === "floward") {
            const params = {
              query: g.search_context || g.modifier || g.category || "",
              recipient: g.recipient ? [g.recipient].flat() : [],
              occasion: g.occasion ? [g.occasion].flat() : [],
              category: g.category ? [g.category].flat() : [],
              brand: g.brand ? [g.brand].flat() : [],
              color: g.color ? [g.color].flat() : [],
              minPrice: prefs.minPrice ?? undefined,
              maxPrice: prefs.maxPrice ?? undefined,
              mustBeInStock: true,
              allowPreorder: true,
              hitsPerPage: 50,
              page: 0
            };
            const products = await searchFloward(params);
            return {
              ...g,
              products: products.slice(0, 50),
              product: products[0] || null,
              source: "floward",
              searchQuery: params.query,
              recommendation_id: `floward_${index}`
            };
          } else {
            console.log(
              `🔍 Unknown store "${store}", falling back to Jarir for query: "${query}"`
            );
            // Fallback to Jarir for unknown stores
            const products = await searchJarir(query);
            return {
              ...g,
              products: products.slice(0, 50),
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
