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

app.post("/api/generate-gift", async (req, res) => {
  try {
    if (!openai) throw new Error("OpenAI not initialized");
    const prefs = req.body;
    const sys = {
      role: "system",
      content: `\nYou suggest gift ideas by choosing from these fixed categories:\nMakeup, Perfume, Care, Health & Nutrition, Devices, Premium, Nails, Gifts, Lenses, Home Scents.\nFor each, you may optionally supply a 1–4‑word "modifier" (e.g. "matte lipstick").\nReturn JSON: { "gifts":[ { "category":"Perfume","modifier":"floral eau de parfum" }, … ] }\n`,
    };
    const usr = { role: "user", content: JSON.stringify(prefs) };
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [sys, usr],
    });
    const { gifts } = JSON.parse(chat.choices[0].message.content);

    if (!prefs.enrichWithProducts) return res.json({ gifts });

    const enriched = await Promise.all(
      gifts.map(async (g) => {
        try {
          const params = {
            route: "rest/product_admin/products",
            seo_url: g.category,
            ...(g.modifier ? { search: g.modifier } : {}),
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
          };
        } catch (err) {
          console.error(`Error enriching gift ${g.category}:`, err.message);
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
