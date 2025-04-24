// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const {
  ApiClient,
  DefaultApi,
  SearchItemsRequest,
  SearchItemsResponse,
} = require("paapi5-nodejs-sdk");
const { OpenAI } = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

// ── 1) CONFIGURE AMAZON PA-API ───────────────────────────────────────────────
const defaultClient = ApiClient.instance;
defaultClient.accessKey = process.env.AWS_ACCESS_KEY_ID;
defaultClient.secretKey = process.env.AWS_SECRET_ACCESS_KEY;
defaultClient.host = "webservices.amazon.com";
defaultClient.region = process.env.AWS_REGION || "us-east-1";

const amazon = new DefaultApi();

// Helper to search Amazon
async function searchAmazonProducts(keyword, maxResults = 3) {
  const req = new SearchItemsRequest();
  req.PartnerTag = process.env.AWS_PARTNER_TAG;
  req.PartnerType = "Associates";
  req.Keywords = keyword;
  req.SearchIndex = "All";
  req.ItemCount = maxResults;
  req.Resources = [
    "Images.Primary.Medium",
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "Offers.Listings.Price",
    "Offers.Listings.DeliveryInfo.IsPrimeEligible",
    "Offers.Listings.Availability",
    "DetailPageURL",
    "ItemInfo.Features",
  ];

  const raw = await new Promise((ok, fail) => {
    amazon.searchItems(req, (err, data) => (err ? fail(err) : ok(data)));
  });

  const items =
    SearchItemsResponse.constructFromObject(raw).SearchResult?.Items || [];

  return items.map((item) => ({
    title: item.ItemInfo?.Title?.DisplayValue || "",
    brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue || "",
    price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || "N/A",
    isPrime:
      !!item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible?.DisplayValue,
    availability: item.Offers?.Listings?.[0]?.Availability?.Message || "",
    imageUrl: item.Images?.Primary?.Medium?.URL || "",
    features: item.ItemInfo?.Features?.DisplayValues || [],
    url: item.DetailPageURL || "",
  }));
}

app.get("/api/amazon/search", async (req, res) => {
  try {
    const { query, category = "All", limit = 5 } = req.query;
    const items = await searchAmazonProducts(query, Number(limit));
    return res.json({ products: items });
  } catch (err) {
    console.error("Amazon search error:", err);
    res
      .status(500)
      .json({ error: "Amazon search failed", details: err.message });
  }
});

// ── 2) CONFIGURE OPENAI ───────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 3) HEALTH CHECK ───────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ── 4) TEST OPENAI CONNECTION ─────────────────────────────────────────────────
app.get("/api/test-openai", async (_req, res) => {
  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a test assistant." },
        {
          role: "user",
          content:
            'Respond with a JSON object: { "success": true, "message": "test successful" }',
        },
      ],
    });

    const text = chat.choices[0].message.content;
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(502).json({
        success: true,
        message: "Connected but returned non-JSON. Raw response:",
        raw: text,
      });
    }

    res.json({ success: true, message: "OpenAI API OK", openaiResponse: json });
  } catch (err) {
    console.error("Test OpenAI error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 5) GIFT-GENERATION ENDPOINT ───────────────────────────────────────────────
app.post("/api/generate-gift", async (req, res) => {
  try {
    const prefs = req.body;
    if (!prefs) return res.status(400).json({ error: "Missing preferences" });

    // 5a) Prompt GPT for 3 exact product names
    const systemMsg = {
      role: "system",
      content:
        "You are an assistant that recommends *specific* Amazon products in JSON.",
    };
    const userMsg = {
      role: "user",
      content: `Based on these preferences, suggest 3 exact product names to search on Amazon:
- Budget: ${prefs.budget || "N/A"}
- Age: ${prefs.age || "N/A"}
- Gender: ${prefs.gender || "N/A"}
- Interests: ${prefs.interests || "N/A"}
- Occasion: ${prefs.occasion || "N/A"}
- Relationship: ${prefs.relationship || "N/A"}
- Location: ${prefs.location || "N/A"}

Return only:
{
  "gifts": [
    { "name": "Exact Amazon product name" },
    { "name": "Exact Amazon product name" },
    { "name": "Exact Amazon product name" }
  ]
}`,
    };

    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [systemMsg, userMsg],
      temperature: 0.7,
    });

    const text = chat.choices[0].message.content;
    let parsed;
    try {
      parsed = JSON.parse(text);
      if (!Array.isArray(parsed.gifts)) throw new Error();
    } catch {
      console.error("Bad GPT JSON:", text);
      return res.status(502).json({ error: "Invalid GPT output" });
    }

    // 5b) For each suggestion, look up on Amazon
    const results = await Promise.all(
      parsed.gifts.map(async ({ name }) => {
        const hits = await searchAmazonProducts(name, 3);
        const best = hits[0] || {};

        return {
          name: best.title || name, // overwrite with actual title
          price: best.price || "N/A",
          description: best.features.join(". ") || "No description",
          reasoning: `Suggested based on your ${
            prefs.interests || "preferences"
          }.`,
          url: best.url || "",
          isPrime: best.isPrime || false,
          alternatives: hits,
        };
      })
    );

    res.json({ gifts: results });
  } catch (err) {
    console.error("/api/generate-gift error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── 6) START SERVER ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
