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

const mahalyApi = axios.create({
  baseURL: "https://l41y35uonw-dsn.algolia.net/1/indexes/*/queries",
  timeout: 30000,
});

mahalyApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Mahaly API Error:", {
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

const getMahalyHeaders = () => ({
  Accept: "*/*",
  "Content-Type": "application/json",
  Origin: "https://mahally.com",
  Referer: "https://mahally.com/",
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

const searchJarir = async (query, retries = 2) => {
  const params = {
    autoComplete: true,
    typeOfSuggestions: "cms|category",
    noOfResults: 12,
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
    klevu_filterLimit: 50,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`→ Jarir API attempt ${attempt + 1} for: "${query}"`);

      const res = await jarirApi.get("", {
        params,
        headers: getJarirHeaders(),
      });

      console.log(`📊 Jarir API response structure:`, {
        status: res.status,
        dataKeys: Object.keys(res.data || {}),
        resultKeys: res.data.result
          ? Object.keys(res.data.result)
          : "no result key",
        fullResponse: JSON.stringify(res.data).substring(0, 500) + "...",
      });

      // The result is an array, not an object with records
      const results = res.data.result || [];

      console.log(
        `✓ Jarir API success: ${results.length} results for "${query}"`
      );

      return results.map((item) => ({
        title: item.name || item.itemName || "Unknown Product",
        price: item.price || item.salePrice || null,
        image: item.image || item.imageUrl || null,
        link: item.url || item.productUrl || null,
        brand: item.brand || item.brandName || null,
        id: item.id || item.itemId || null,
        sku: item.sku || null,
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

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return [];
};

const searchMahaly = async (query, retries = 2) => {
  const requestBody = {
    requests: [
      {
        indexName: "products_v2_updated_at_desc",
        params: `analytics=true&analyticsTags=["web","original","No Gender","guest_trendy_category_1","updated_at_desc"]&clickAnalytics=true&facets=["brand_name.ar","categories.lvl0","has_special_price","payment_options","price.SA.SAR","rating","variants.color","variants.size"]&filters=price.SA.SAR > 0 AND status:sale&highlightPostTag=__/ais-highlight__&highlightPreTag=__ais-highlight__&hitsPerPage=30&maxValuesPerFacet=100&page=1&query=${encodeURIComponent(
          query
        )}&userToken=anonymous-3e2e26c2-910a-4b9c-8982-4913326ef235&ruleContexts=["web","No gender"]`,
      },
    ],
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`→ Mahaly API attempt ${attempt + 1} for: "${query}"`);

      const res = await mahalyApi.post("", requestBody, {
        headers: getMahalyHeaders(),
        params: {
          "x-algolia-agent":
            "Algolia%20for%20JavaScript%20(4.23.3)%3B%20Browser%20(lite)%3B%20instantsearch.js%20(4.77.3)%3B%20react%20(19.0.0-rc-65e06cb7-20241218)%3B%20react-instantsearch%20(7.15.3)%3B%20react-instantsearch-core%20(7.15.3)%3B%20next.js%20(15.1.7)%3B%20JS%20Helper%20(3.24.1)%3B%20autocomplete-core%20(1.17.1)%3B%20autocomplete-js%20(1.17.1)",
          "x-algolia-api-key": "ccc9490de8160382395ae82c7a96d8b0",
          "x-algolia-application-id": "L41Y35UONW",
        },
      });

      console.log(`📊 Mahaly API response structure:`, {
        status: res.status,
        dataKeys: Object.keys(res.data || {}),
        resultKeys: res.data.results
          ? Object.keys(res.data.results[0] || {})
          : "no results key",
        fullResponse: JSON.stringify(res.data).substring(0, 500) + "...",
      });

      const hits = res.data.results?.[0]?.hits || [];

      console.log(
        `✓ Mahaly API success: ${hits.length} results for "${query}"`
      );

      return hits.map((item) => ({
        title: item.name || "Unknown Product",
        price: item.price?.SA?.SAR || null,
        image: item.image_url || null,
        link: item.url || item.slug || null,
        brand: item.brand_name || null,
        id: item.objectID || null,
        sku: item.sku || null,
      }));
    } catch (err) {
      console.error(
        `✗ Mahaly API attempt ${attempt + 1} failed for "${query}":`,
        err.message
      );

      if (attempt === retries) {
        console.error(`✗ All Mahaly API attempts failed for "${query}"`);
        return [];
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return [];
};

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.get("/api/version-check", (req, res) => {
  res.json({
    version: "Updated with Mahaly API",
    timestamp: new Date().toISOString(),
    mahalyConfigured: true,
    endpoints: [
      "/api/mahaly/search",
      "/api/mahaly/test",
      "/api/jarir/search",
      "/api/niceone/search",
    ],
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

app.get("/api/mahaly/search", async (req, res) => {
  try {
    const { q, limit } = req.query;
    if (!q) return res.status(400).json({ error: "q required" });

    console.log("→ Mahaly search for:", q);
    const products = await searchMahaly(q);
    const limitedProducts = limit
      ? products.slice(0, parseInt(limit))
      : products;

    return res.json({ products: limitedProducts });
  } catch (err) {
    console.error("Mahaly search error:", err.message);
    return res
      .status(500)
      .json({ error: "Mahaly search failed", details: err.message });
  }
});

app.get("/api/mahaly/test", async (req, res) => {
  try {
    const products = await searchMahaly("perfume");
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
      model: "gpt-3.5-turbo",
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
    "GENERATE-GIFT ENDPOINT HIT - Updated version with Mahaly logging"
  );
  try {
    if (!openai) throw new Error("OpenAI not initialized");
    const prefs = req.body;

    // Log the received preferences
    console.log("Received preferences:", prefs);

    let userPrompt =
      "Please list premium gift suggestions based on the following preferences:";

    if (prefs.age) userPrompt += `\n- Recipient's age: ${prefs.age}`;
    if (prefs.gender) userPrompt += `\n- Gender: ${prefs.gender}`;
    if (prefs.relationship)
      userPrompt += `\n- Relationship to recipient: ${prefs.relationship}`;
    if (prefs.category)
      userPrompt += `\n- Preferred category: ${prefs.category}`;
    if (prefs.budget) userPrompt += `\n- Desired budget range: ${prefs.budget}`;
    if (prefs.interests)
      userPrompt += `\n- Personal interests, preferences, or style notes: ${prefs.interests}`;

    if (prefs.description)
      userPrompt += `\n\nAdditional context or special occasion: ${prefs.description}`;

    userPrompt +=
      "\n\nAll suggestions should reflect refined taste and cultural relevance for a Saudi Arabian audience. Stick to the specified categories only, and include elegant, thoughtful modifiers when appropriate.";

    const sys = {
      role: "system",
      content: `
      You are Hadai.ai, an elite gift assistant specializing in luxury and culturally relevant gifts for users in Saudi Arabia.
      
      Your task is to generate tasteful, upper-class gift recommendations using only the following fixed categories:
      Makeup, Perfume, Care, Health & Nutrition, Devices, Premium, Nails, Gifts, Lenses, Home Scents, Food & Drink.
      
      For each gift, determine the appropriate store using these STRICT rules:
      
      - JARIR: ONLY for technology, electronics, devices, gadgets, computers, gaming equipment, books
      - NICEONE: ONLY for makeup, skincare products, beauty tools, nail products, contact lenses, perfumes and fragrances
      - MAHALY: for EVERYTHING ELSE including:
        * Health & nutrition products (supplements, organic foods, coffee, tea, etc.)
        * Food & Drink items (coffee beans, gourmet foods, beverages, etc.)
        * Home scents and candles
        * General gifts and gift sets
        * Care products that aren't specifically skincare/beauty (e.g. toothpaste, shampoo, etc.)
        * Premium items that don't fit the above categories (e.g. luxury watches, jewelry, etc.)
        * Any item with coffee, food, home goods, etc.
      
      IMPORTANT: When in doubt, choose MAHALY as the default store. 
      
      Each item must include:
      - "category" (one of the above)
      - "store" (either "JARIR", "NICEONE", or "MAHALY")
      - Optional "modifier" (1–4 elegant words like "oud-infused perfume" or "gaming headset").
      
      Return in this exact JSON format:
      {
        "gifts": [
          { "category": "Perfume", "store": "MAHALY", "modifier": "luxury oud blend" },
          { "category": "Devices", "store": "JARIR", "modifier": "gaming headset" },
          { "category": "Gifts", "store": "MAHALY", "modifier": "coffee beans" }
        ]
      }
      
      Ensure all gifts align with high-end expectations and Saudi cultural preferences.
      `,
    };

    const usr = {
      role: "user",
      content: userPrompt,
    };

    console.log("Sending to OpenAI:", {
      system: sys.content,
      user: userPrompt,
    });

    console.log(" Making OpenAI API call...");

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [sys, usr],
    });

    const responseContent = chat.choices[0].message.content;
    console.log(" RAW OpenAI response:", responseContent);
    console.log("OpenAI response type:", typeof responseContent);
    console.log("OpenAI response length:", responseContent.length);

    // Parse the JSON response
    let gifts;
    try {
      console.log("🔍 Attempting to parse JSON...");
      const jsonResponse = JSON.parse(responseContent);
      gifts = jsonResponse.gifts || [];
      console.log(" Successfully parsed JSON. Gifts count:", gifts.length);
      console.log("Parsed gifts:", JSON.stringify(gifts, null, 2));
    } catch (parseErr) {
      console.error(" Error parsing OpenAI response:", parseErr);
      console.log("🔍 Attempting to extract JSON from response");

      // Fallback: Try to extract JSON from the response text
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log("🔍 Found JSON match:", jsonMatch[0]);
        try {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          gifts = jsonResponse.gifts || [];
          console.log(
            "Successfully extracted and parsed JSON. Gifts count:",
            gifts.length
          );
          console.log("Extracted gifts:", JSON.stringify(gifts, null, 2));
        } catch (extractErr) {
          console.error(" Error extracting JSON:", extractErr);
          throw new Error(
            "Could not parse gift suggestions from OpenAI response"
          );
        }
      } else {
        console.error("No JSON found in response");
        throw new Error("Could not extract JSON from OpenAI response");
      }
    }

    if (!prefs.enrichWithProducts) return res.json({ gifts });

    const enriched = await Promise.all(
      gifts.map(async (g) => {
        const store = g.store ? g.store.toLowerCase() : "unknown";
        const query = g.modifier || g.category;

        try {
          if (store === "niceone") {
            const params = {
              route: "rest/product_admin/products",
              search: query,
              sort: "most_popular",
              page: 1,
              limit: 10,
              first: false,
            };

            const response = await niceoneApi.get("/", {
              params: pruneEmpty(params),
              headers: getNiceOneHeaders(),
            });

            const products = extractProducts(response);
            return {
              ...g,
              product: products[0] || null,
              alternatives: products.slice(1, 4),
              source: "niceone",
            };
          } else if (store === "jarir") {
            const products = await searchJarir(query);
            return {
              ...g,
              product: products[0] || null,
              alternatives: products.slice(1, 4),
              source: "jarir",
            };
          } else if (store === "mahaly") {
            const products = await searchMahaly(query);
            return {
              ...g,
              product: products[0] || null,
              alternatives: products.slice(1, 4),
              source: "mahaly",
            };
          } else {
            // Default fallback to Mahaly for unknown stores
            console.log(
              `Unknown store "${store}", falling back to Mahaly for query: ${query}`
            );
            const products = await searchMahaly(query);
            return {
              ...g,
              product: products[0] || null,
              alternatives: products.slice(1, 4),
              source: "mahaly",
              fallback: true,
            };
          }
        } catch (err) {
          console.error(
            `Error enriching gift (${store}) ${query}:`,
            err.message
          );
          return {
            ...g,
            product: null,
            alternatives: [],
            enrichmentError: true,
          };
        }
      })
    );

    res.json({ gifts: enriched });
  } catch (err) {
    console.error("/api/generate-gift error:", err.stack || err);
    res.status(500).json({
      error: err.message,
      stack: err.stack,
      details: err.response?.data || "No additional details",
    });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
