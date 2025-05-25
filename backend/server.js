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

app.get("/health", (_req, res) => res.json({ status: "ok" }));

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
  try {
    if (!openai) throw new Error("OpenAI not initialized");
    const prefs = req.body;

    // Log the received preferences
    console.log("Received preferences:", prefs);

    let userPrompt =
      "Please list premium gift suggestions based on the following preferences:";

    if (prefs.age) userPrompt += `\n- Recipient’s age: ${prefs.age}`;
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
      Makeup, Perfume, Care, Health & Nutrition, Devices, Premium, Nails, Gifts, Lenses, Home Scents.
      
      For each gift, determine the appropriate store:
      - JARIR: for technology, books, devices, electronics, gadgets
      - NICEONE: for makeup, perfume, skincare, beauty, care products
      
      Each item must include:
      - "category" (one of the above)
      - "store" (either "JARIR" or "NICEONE")
      - Optional "modifier" (1–4 elegant words like "oud-infused perfume" or "gaming headset").
      
      Return in this exact JSON format:
      {
        "gifts": [
          { "category": "Perfume", "store": "NICEONE", "modifier": "luxury oud blend" },
          { "category": "Devices", "store": "JARIR", "modifier": "gaming headset" }
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

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [sys, usr],
    });

    const responseContent = chat.choices[0].message.content;
    console.log("OpenAI response:", responseContent);

    // Parse the JSON response
    let gifts;
    try {
      const jsonResponse = JSON.parse(responseContent);
      gifts = jsonResponse.gifts || [];
    } catch (parseErr) {
      console.error("Error parsing OpenAI response:", parseErr);
      console.log("Attempting to extract JSON from response");

      // Fallback: Try to extract JSON from the response text
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const jsonResponse = JSON.parse(jsonMatch[0]);
          gifts = jsonResponse.gifts || [];
        } catch (extractErr) {
          console.error("Error extracting JSON:", extractErr);
          throw new Error(
            "Could not parse gift suggestions from OpenAI response"
          );
        }
      } else {
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
          } else {
            return { ...g, product: null, unknownStore: true };
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
