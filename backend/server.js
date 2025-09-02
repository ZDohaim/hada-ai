require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const axios = require("axios");
const crypto = require("crypto");
const { searchGifts, searchGiftsWithPlans } = require("./services/supabaseService");

const app = express();
app.use(cors());
app.use(express.json());

let openai;
try {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch (err) {
  console.error("OpenAI init error:", err);
}

// Initialize caching and concurrency control
const gptCache = new Map();
const productCache = new Map();
let limit; // Will be initialized dynamically

// Cache utility functions
const createCacheKey = (obj) =>
  crypto.createHash("md5").update(JSON.stringify(obj)).digest("hex");
const getCachedResult = (cache, key, ttlMinutes = 30) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttlMinutes * 60 * 1000) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};
const setCachedResult = (cache, key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Input normalization utilities
const normalizeBudget = (budgetStr) => {
  if (!budgetStr) return { budgetBand: 'Mid', minPrice: null, maxPrice: null };
  
  const str = budgetStr.toString().toLowerCase().replace(/[,\s]/g, '');
  let minPrice = null, maxPrice = null, budgetBand = 'Mid';
  
  // Parse different budget formats
  if (str.includes('-') || str.includes('to')) {
    const range = str.split(/[-to]/);
    minPrice = parseInt(range[0]) || null;
    maxPrice = parseInt(range[1]) || null;
  } else if (str.startsWith('under') || str.startsWith('<')) {
    maxPrice = parseInt(str.replace(/[^0-9]/g, '')) || null;
  } else if (str.startsWith('over') || str.startsWith('>')) {
    minPrice = parseInt(str.replace(/[^0-9]/g, '')) || null;
  } else if (str.startsWith('~') || str.startsWith('around')) {
    const amount = parseInt(str.replace(/[^0-9]/g, '')) || null;
    if (amount) {
      minPrice = Math.max(0, amount - 50);
      maxPrice = amount + 50;
    }
  } else {
    // Single number or other format
    const amount = parseInt(str.replace(/[^0-9]/g, '')) || null;
    if (amount) {
      minPrice = amount;
      maxPrice = amount;
    }
  }
  
  // Determine budget band
  const avgBudget = maxPrice || minPrice || 300;
  if (avgBudget < 200) budgetBand = 'Low';
  else if (avgBudget >= 500) budgetBand = 'High';
  else budgetBand = 'Mid';
  
  return { budgetBand, minPrice, maxPrice };
};

const normalizeRelationship = (relationship) => {
  if (!relationship) return 'casual';
  
  const rel = relationship.toLowerCase().trim();
  const closeTerms = ['spouse', 'wife', 'husband', 'fiancé', 'fiancée', 'fiancee', 'mom', 'mother', 'dad', 'father', 'parents', 'parent', 'sister', 'brother', 'family', 'daughter', 'son', 'child'];
  const professionalTerms = ['colleague', 'boss', 'coworker', 'client', 'teacher', 'mentor', 'professor', 'doctor'];
  
  if (closeTerms.some(term => rel.includes(term))) return 'close';
  if (professionalTerms.some(term => rel.includes(term))) return 'professional';
  return 'casual';
};

const normalizeOccasion = (description) => {
  if (!description) return 'casual';
  
  const desc = description.toLowerCase();
  const romanticFormalTerms = ['anniversary', 'wedding', 'engagement', 'valentine', 'romantic', 'formal', 'graduation', 'promotion', 'achievement'];
  const practicalTerms = ['work', 'office', 'study', 'school', 'project', 'professional', 'business'];
  
  if (romanticFormalTerms.some(term => desc.includes(term))) return 'romantic_formal';
  if (practicalTerms.some(term => desc.includes(term))) return 'practical';
  return 'casual';
};

const checkAllowsGiftsCategory = (category) => {
  if (!category) return true; // No category constraint
  const cat = category.toLowerCase().trim();
  // Return false if locked to specific non-gift categories
  const restrictiveCategories = ['devices', 'perfume', 'makeup', 'care', 'health & nutrition', 'nails', 'lenses', 'home scents', 'food & drink'];
  return !restrictiveCategories.includes(cat) || cat === 'gifts' || cat === 'premium';
};

const normalizeUserSignals = (prefs) => {
  const budget = normalizeBudget(prefs.budget);
  const relationshipTier = normalizeRelationship(prefs.relationship);
  const occasionTier = normalizeOccasion(prefs.description);
  const allowsGiftsCategory = checkAllowsGiftsCategory(prefs.category);
  
  console.log('📊 Normalized signals:', { 
    budgetBand: budget.budgetBand, 
    relationshipTier, 
    occasionTier, 
    allowsGiftsCategory,
    minPrice: budget.minPrice,
    maxPrice: budget.maxPrice
  });
  
  return { 
    ...budget, 
    relationshipTier, 
    occasionTier, 
    allowsGiftsCategory 
  };
};

// FLOWARD keyword boost utility
const boostFlowardSearch = (searchContext) => {
  if (!searchContext) return searchContext;
  
  const luxuryKeywords = ['premium', 'luxury', 'bouquet', 'roses', 'arrangement', 'elegant', 'exclusive'];
  const hasLuxuryKeyword = luxuryKeywords.some(keyword => 
    searchContext.toLowerCase().includes(keyword)
  );
  
  if (!hasLuxuryKeyword) {
    // Add appropriate luxury keyword based on context
    if (searchContext.toLowerCase().includes('flower') || searchContext.toLowerCase().includes('rose')) {
      return `premium ${searchContext} luxury bouquet arrangement`;
    } else {
      return `luxury ${searchContext} premium elegant`;
    }
  }
  
  return searchContext;
};

// Product normalization function
const normalizeProduct = (product, source) => {
  if (!product) return null;

  return {
    id: product.id || product.objectID || product.itemId || null,
    name:
      product.title ||
      product.name ||
      product.nameEn ||
      product.itemName ||
      "Unknown Product",
    price:
      product.price ||
      product.salePrice ||
      product.productAvailability?.[2]?.priceWithVat ||
      null,
    image: product.image || product.imageUrl || product.thumbnail || null,
    link:
      product.link || product.url || product.productUrl || product.slug || null,
    brand:
      product.brand ||
      product.brandName ||
      product.attributes?.brand?.nameEn ||
      null,
    source: source,
    sku: product.sku || null,
    tags: product.producttag_data || product.tags || [],
    priority: product.priority || null,
  };
};

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
const algoliaSearchKey =
  process.env.FLOWARD_ALGOLIA_SEARCH_KEY || "a36327f4aec9eec775af628df0f659ab"; // search only
const ALG_AGENT = encodeURIComponent(
  "Algolia for JavaScript (4.17.0); Browser (lite); instantsearch.js (4.56.9); react (18.2.0); react-instantsearch (7.0.1); react-instantsearch-core (7.0.1); next.js (13.4.12); JS Helper (3.14.0)"
);
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
  "vasFilter",
];

function buildFlowardFilters(p) {
  const f = [];
  f.push("productAvailability.2.listed=1");
  f.push("NOT productAvailability.2.isPickAndPack=1");
  f.push("NOT type=4");

  if (p.mustBeInStock && p.allowPreorder)
    f.push(
      "(productAvailability.2.availability>0 OR productAvailability.2.enablePreOrder=1)"
    );
  else if (p.mustBeInStock) f.push("productAvailability.2.availability>0");
  else if (p.allowPreorder) f.push("productAvailability.2.enablePreOrder=1");

  if (Number.isFinite(p.minPrice))
    f.push(`productAvailability.2.priceWithVat>=${p.minPrice}`);
  if (Number.isFinite(p.maxPrice))
    f.push(`productAvailability.2.priceWithVat<=${p.maxPrice}`);

  if (p.recipient?.length)
    f.push(
      "(" +
        p.recipient
          .map((v) => `categories.giftByRecipient.nameEn:"${v}"`)
          .join(" OR ") +
        ")"
    );
  if (p.occasion?.length)
    f.push(
      "(" +
        p.occasion
          .map((v) => `categories.categoryOccasion.nameEn:"${v}"`)
          .join(" OR ") +
        ")"
    );
  if (p.category?.length)
    f.push(
      "(" +
        p.category
          .map((v) => `hierarchicalCategories.lvl0:"${v}"`)
          .join(" OR ") +
        ")"
    );
  if (p.brand?.length)
    f.push(
      "(" +
        p.brand.map((v) => `attributes.brand.nameEn:"${v}"`).join(" OR ") +
        ")"
    );
  if (p.color?.length)
    f.push(
      "(" +
        p.color.map((v) => `attributes.color.nameEn:"${v}"`).join(" OR ") +
        ")"
    );

  return f.join(" AND ");
}

function buildFlowardParams(p) {
  const qp = new URLSearchParams();
  qp.set("query", p.query ?? "");
  qp.set("hitsPerPage", String(p.hitsPerPage ?? 30)); // Optimized to 30 for better user experience
  qp.set("page", String(p.page ?? 0));
  qp.set("clickAnalytics", "true");
  qp.set("getRankingInfo", "true");
  qp.set("highlightPreTag", "__ais-highlight__");
  qp.set("highlightPostTag", "__/ais-highlight__");
  qp.set("queryLanguages", JSON.stringify(["en", "ar"]));
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
  const cacheKey = `floward_${createCacheKey(prefs)}`;
  const cached = getCachedResult(productCache, cacheKey, 15);
  if (cached) {
    console.log(`🎯 Cache hit for Floward: ${prefs.query}`);
    return cached;
  }

  const body = {
    requests: [
      {
        indexName: "product_KSA",
        params: buildFlowardParams(prefs),
      },
    ],
  };

  const r = await axios.post(algoliaEndpoint, body, {
    headers: {
      "content-type": "application/json",
      origin: "https://floward.com",
      referer: "https://floward.com/",
    },
    timeout: 15000,
  });

  const hits = r.data?.results?.[0]?.hits ?? [];
  const normalizedResults = hits.map((h) => normalizeProduct(h, "floward"));

  setCachedResult(productCache, cacheKey, normalizedResults);
  console.log(
    `✓ Floward API: ${normalizedResults.length} results for "${prefs.query}"`
  );

  return normalizedResults;
}

// Optimized Jarir search - no fallbacks, strict intent adherence
const searchJarir = async (query, retries = 2) => {
  const cacheKey = `jarir_${query}`;
  const cached = getCachedResult(productCache, cacheKey, 15); // 15 min cache
  if (cached) {
    console.log(`🎯 Cache hit for Jarir: "${query}"`);
    return cached;
  }

  const params = {
    autoComplete: true,
    typeOfSuggestions: "cms|category",
    noOfResults: 30,
    noOfResultsAC: 5,
    enablePartialSearch: false,
    sortOrder: "rel",
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
    filterResults: "",
    klevu_filterLimit: 50,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`→ Jarir API attempt ${attempt + 1} for: "${query}"`);

      const res = await jarirApi.get("", {
        params,
        headers: getJarirHeaders(),
      });

      const results = res.data.result || [];

      // Prioritize trending/bestseller products, but don't fallback to all products
      const popularTags = ["Trending Now", "Best Sellers"];
      let filteredResults = results.filter((item) => {
        if (!item.producttag_data) return false;
        return item.producttag_data.some((tag) =>
          popularTags.includes(tag.label)
        );
      });

      // If no trending products, return empty instead of generic results
      if (filteredResults.length === 0) {
        console.log(`⚠️ No trending/bestseller products found for "${query}"`);
        setCachedResult(productCache, cacheKey, []);
        return [];
      }

      const normalizedResults = filteredResults.map((item) =>
        normalizeProduct(item, "jarir")
      );
      console.log(
        `✓ Jarir API: ${normalizedResults.length} trending results for "${query}"`
      );

      setCachedResult(productCache, cacheKey, normalizedResults);
      return normalizedResults;
    } catch (err) {
      console.error(
        `✗ Jarir API attempt ${attempt + 1} failed for "${query}":`,
        err.message
      );

      if (attempt === retries) {
        console.error(`✗ All Jarir API attempts failed for "${query}"`);
        setCachedResult(productCache, cacheKey, []);
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
    version: "Updated with Jarir/NiceOne/Floward",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/api/jarir/search",
      "/api/niceone/search",
      "/api/floward/search",
    ],
  });
});

app.get("/api/niceone/search", async (req, res) => {
  try {
    const { q, sort, page, limit, search } = req.query;
    if (!q) return res.status(400).json({ error: "q required" });

    const cacheKey = `niceone_${q}_${sort}_${page}_${limit}_${search}`;
    const cached = getCachedResult(productCache, cacheKey, 15);
    if (cached) {
      console.log(`🎯 Cache hit for NiceOne: "${q}"`);
      return res.json({ products: cached });
    }

    const params = pruneEmpty({
      route: "rest/product_admin/products",
      search: q, // Always use search parameter for direct queries
      sort: sort || "most_popular",
      page: page || 1,
      limit: limit || 12,
      first: false,
    });

    console.log("→ NiceOne search params:", params);
    const r = await niceoneApi.get("/", {
      params,
      headers: getNiceOneHeaders(),
    });

    const products = extractProducts(r);
    const normalizedProducts = products.map((p) =>
      normalizeProduct(p, "niceone")
    );

    setCachedResult(productCache, cacheKey, normalizedProducts);
    console.log(
      `✓ NiceOne API: ${normalizedProducts.length} results for "${q}"`
    );

    return res.json({ products: normalizedProducts });
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
    res.status(500).json({
      error: "Floward search failed",
      details: err.response?.data || err.message,
    });
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
      model: "gpt-4o",
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

    // Normalize user inputs for deterministic routing
    const signals = normalizeUserSignals(prefs);

    // Build structured user prompt with normalized signals
    let userPrompt = "Generate gift suggestions based on these criteria:\n";

    if (prefs.age) userPrompt += `\n- Recipient's age: ${prefs.age}`;
    if (prefs.gender) userPrompt += `\n- Gender: ${prefs.gender}`;
    if (prefs.relationship) userPrompt += `\n- Relationship to recipient: ${prefs.relationship}`;
    if (prefs.category) userPrompt += `\n- Preferred category: ${prefs.category}`;
    if (prefs.budget) userPrompt += `\n- Budget range: ${prefs.budget} SAR`;
    if (prefs.interests) userPrompt += `\n- Personal interests/preferences: ${prefs.interests}`;
    if (prefs.description) userPrompt += `\n- Additional context: ${prefs.description}`;

    // Add normalized signals for deterministic routing
    userPrompt += `\n\nNormalized Signals:`;
    userPrompt += `\n- BudgetBand: ${signals.budgetBand}`;
    userPrompt += `\n- RelationshipTier: ${signals.relationshipTier}`;
    userPrompt += `\n- OccasionTier: ${signals.occasionTier}`;
    userPrompt += `\n- AllowsGiftsCategory: ${signals.allowsGiftsCategory}`;
    userPrompt += `\n\nIMPORTANT: Generate AT LEAST 15 diverse recommendations. Prioritize VARIETY over perfection.`;

    const sys = {
      role: "system",
      content: `You are Hadai.ai, a precision gift recommendation specialist for Saudi customers.

Rules:
1. Obey the user's stated preferences only. Do not invent constraints.
2. Return strictly valid JSON matching the schema below. No prose.
3. Produce 15–20 diverse recommendations to maximize gift exploration, ensuring comprehensive variety across ALL stores (FLOWARD, JARIR, NICEONE) and multiple categories.
4. VARIETY MANDATE: Include multiple variations per category (different price points, product types, occasions), explore adjacent categories, and provide alternatives at different budget levels.
4. Route stores based on normalized signals:

   Budget bands (SAR):
   - Low:    < 200
   - Mid:    200–499
   - High:   ≥ 500

   Occasions and relationships:
   - Romantic/formal or close relationships (spouse, fiancé(e), parents, immediate family): prefer FLOWARD for fresh flowers or luxury bundles when budget permits.
   - Practical/educational or professional context: prefer JARIR.
   - Casual or everyday beauty: prefer NICEONE.

   Product-type mapping:
   - Fresh flowers, premium bundles, luxury add-ons: FLOWARD
   - Tech, books, office, gaming: JARIR
   - Makeup, skincare, lenses, affordable fragrances, nails, home scents: NICEONE

5. DIVERSITY REQUIREMENTS:
   - Generate 3-4 recommendations per major category relevant to user's request
   - Include price variations: budget-friendly, mid-range, and premium options within user's range
   - Ensure representation from ALL THREE STORES for comprehensive shopping options
   - Explore adjacent categories (Beauty → Fashion accessories, Home scents, Books about beauty)

6. Popularity heuristic:
   - JARIR: prefer items tagged "Trending Now" or "Best Sellers".
   - NICEONE: prefer "most_popular" results.
   - FLOWARD: prefer items with higher price tiers and presence of luxury keywords in the search context: premium, luxury, elegant, bouquet, roses, arrangement, exclusive.

7. Categories whitelist (16 categories):
   Use only: gifts, perfume, devices, home_scents, makeup, care, premium, nails, lenses, fashion, fitness, books, gaming, home_decor, electronics, office.
   Map flowers/arrangements under "gifts".

8. Multi-store recommendations with 16 categories:
   - FLOWARD specializes in: gifts, premium, perfume, fashion
   - JARIR specializes in: books, electronics, devices, office, gaming  
   - NICEONE specializes in: makeup, care, nails, lenses, home_scents, fitness
   - IMPORTANT: Search across ALL stores for each category - don't limit to single store
   - Encourage variety by including products from multiple stores in results

8. Bilingual tokenization requirements:
   - query_en: 3–6 English product tokens, no stopwords, concrete product terms only
   - query_ar: 3–6 Arabic product tokens, culturally relevant Saudi market terms
   - Strip generic words like "best", "good", "nice" - keep specific product types
   - Include store-specific quality indicators:
     * FLOWARD: premium, luxury, bouquet, roses, arrangement, elegant, exclusive
     * JARIR: bestseller, trending, latest, professional, advanced
     * NICEONE: affordable, popular, trendy, long-lasting, everyday

9. EXPANDED VARIETY REQUIREMENTS:
   - Include recommendations from ALL THREE STORES across the 15-20 suggestions
   - Generate MULTIPLE variations per category:
     * Different product types (makeup: brushes, palettes, lipsticks, sets)
     * Different price points within user's budget range
     * Different occasions/use cases (daily, special events, professional)
   - Explore ADJACENT categories to maximize discovery:
     * Beauty → Fashion accessories, Home scents, Self-care books
     * Fashion → Beauty products, Premium gifts, Lifestyle items
     * Tech → Books, Gaming, Office supplies
   - Include "discovery" recommendations: thoughtful alternatives user might not expect

10. Enhanced output schema:
{
  "gifts": [
    {
      "category": "<one of the 16 allowed categories>",
      "store": "ALL",
      "preferred_stores": ["FLOWARD", "JARIR", "NICEONE"],
      "query_en": "<3-6 English product tokens>",
      "query_ar": "<3-6 Arabic product tokens>", 
      "facets": {
        "budget_band": "<Low|Mid|High>",
        "min_price": <number>,
        "max_price": <number>,
        "relationship_tier": "<close|professional|casual>",
        "occasion_tier": "<romantic_formal|practical|casual>"
      },
      "rationale": "<why this recommendation fits the user>",
      "confidence": <0.0-1.0>
    }
  ]
}`,
    };

    const usr = {
      role: "user",
      content: userPrompt,
    };

    console.log("Sending enhanced prompt to OpenAI:", {
      system: sys.content.substring(0, 200) + "...",
      user: userPrompt,
    });

    // Helper function to generate gifts with retry logic
    const generateGiftsWithRetry = async () => {
      const chat = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [sys, usr],
        temperature: 0.7, // Higher temperature for maximum creativity and variety
        max_tokens: 3000, // Increased tokens for more recommendations
        response_format: { type: "json_object" },
      });

      const responseContent = chat.choices[0].message.content;
      console.log("RAW OpenAI response:", responseContent);

      try {
        const jsonResponse = JSON.parse(responseContent);
        return jsonResponse.gifts || [];
      } catch (parseErr) {
        console.error("❌ JSON parse error:", parseErr);
        
        // Single retry with repair instruction
        console.log("🔄 Attempting JSON repair retry...");
        const repairChat = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            sys,
            usr,
            { role: "assistant", content: responseContent },
            { role: "user", content: "Return valid JSON per schema; no text; 6–8 items." }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        });

        const repairedContent = repairChat.choices[0].message.content;
        const repairedResponse = JSON.parse(repairedContent);
        return repairedResponse.gifts || [];
      }
    };

    // Check cache first
    const gptCacheKey = createCacheKey({...prefs, ...signals});
    const cachedGpts = getCachedResult(gptCache, gptCacheKey, 60);
    let gifts;
    
    if (cachedGpts) {
      console.log("🎯 Cache hit for GPT preferences");
      gifts = cachedGpts;
    } else {
      console.log("Making OpenAI API call with structured JSON and lower temperature...");
      gifts = await generateGiftsWithRetry();
      
      // Post-generation validation for conditional FLOWARD rule
      const shouldIncludeFloward = (
        signals.budgetBand === 'High' || 
        signals.relationshipTier === 'close' || 
        signals.occasionTier === 'romantic_formal'
      ) && signals.allowsGiftsCategory;
      
      const hasFlowardItem = gifts.some(g => 
        (g.store || '').toLowerCase().includes('floward')
      );
      
      if (shouldIncludeFloward && !hasFlowardItem) {
        console.log("🔄 FLOWARD validation failed - regenerating with nudge...");
        const flowardNudgeSystem = {
          role: "system",
          content: sys.content + "\n\nIMPORTANT: Include at least one FLOWARD item under category 'Gifts' if conditions permit; keep counts and schema."
        };
        
        const retryChat = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [flowardNudgeSystem, usr],
          temperature: 0.3,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        });
        
        try {
          const retryResponse = JSON.parse(retryChat.choices[0].message.content);
          gifts = retryResponse.gifts || gifts; // Use retry result or fallback to original
          console.log("✅ FLOWARD validation retry completed");
        } catch (retryErr) {
          console.log("⚠️ FLOWARD retry failed, using original response");
        }
      }
      
      setCachedResult(gptCache, gptCacheKey, gifts);
      console.log("✅ GPT generation completed. Gifts count:", gifts.length);
    }

    // Validate gift suggestions
    if (!gifts || gifts.length === 0) {
      throw new Error("No gift suggestions generated");
    }

    if (!prefs.enrichWithProducts) return res.json({ gifts });

    // NEW: Use advanced GPT→DB pipeline with bilingual search
    console.log("🚀 Using new GPT→Database pipeline for product enrichment...");
    
    try {
      const enriched = await searchGiftsWithPlans(gifts);
      
      console.log(
        `📊 Advanced Pipeline Results: ${enriched.gifts.length} plans processed, ` +
        `${enriched.search_metadata.total_products_found} products found, ` +
        `${enriched.search_metadata.avg_products_per_plan.toFixed(1)} avg per plan`
      );
      
      console.log(
        `🏪 Stores covered: ${enriched.search_metadata.stores_covered.join(', ')}`
      );
      
      console.log(
        `📁 Categories covered: ${enriched.search_metadata.categories_covered.join(', ')}`
      );

      res.json({ 
        gifts: enriched.gifts,
        search_metadata: enriched.search_metadata
      });

    } catch (dbError) {
      console.error("❌ Database pipeline failed, falling back to basic response:", dbError.message);
      
      // Fallback: return GPT suggestions without database enrichment
      const fallbackGifts = gifts.map((g, index) => ({
        ...g,
        products: [],
        product: null,
        enrichmentError: true,
        errorMessage: "Database search temporarily unavailable. Showing GPT suggestions only.",
        recommendation_id: `fallback_${index}`,
        source: g.store?.toLowerCase()
      }));

      res.json({ 
        gifts: fallbackGifts,
        search_metadata: {
          fallback_mode: true,
          error: dbError.message,
          plans_processed: gifts.length,
          total_products_found: 0
        }
      });
    }
  } catch (err) {
    console.error("❌ /api/generate-gift error:", err.stack || err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      details: err.response?.data || "No additional details",
    });
  }
});

// Supabase-powered gift search endpoint
app.post("/api/gifts/search", async (req, res) => {
  try {
    console.log("🔍 Supabase gift search called with:", req.body);
    
    const result = await searchGifts(req.body);
    res.json(result);
  } catch (err) {
    console.error("❌ Supabase gift search error:", err);
    res.status(500).json({
      error: "Failed to search gifts",
      message: err.message,
      details: err.details || "No additional details"
    });
  }
});

// Initialize p-limit dynamically
async function initializeServer() {
  try {
    const pLimitModule = await import("p-limit");
    limit = pLimitModule.default(3); // Max 3 concurrent API calls
    console.log("✅ p-limit initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize p-limit:", err);
    // Fallback to no throttling
    limit = (fn) => fn();
  }

  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () =>
    console.log(`🚀 Optimized Hadai backend listening on ${PORT}`)
  );
}

initializeServer();
