// ensure env is loaded (optional if server.js already did it)
require("dotenv").config();

const express = require("express");
const router = express.Router();
const ProductAdvertisingAPIv1 = require("paapi5-nodejs-sdk");

// — configure the PA-API client once
const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
defaultClient.accessKey = process.env.AWS_ACCESS_KEY_ID;
defaultClient.secretKey = process.env.AWS_SECRET_ACCESS_KEY;
defaultClient.host = "webservices.amazon.com";
defaultClient.region = process.env.AWS_REGION;

const api = new ProductAdvertisingAPIv1.DefaultApi();

// — SEARCH
router.get("/search", async (req, res) => {
  try {
    const { query, category = "All" } = req.query;

    const reqModel = new ProductAdvertisingAPIv1.SearchItemsRequest();
    reqModel.PartnerTag = process.env.AWS_PARTNER_TAG;
    reqModel.PartnerType = "Associates";
    reqModel.Keywords = query;
    reqModel.SearchIndex = category;
    reqModel.ItemCount = 5;
    reqModel.Resources = [
      "Images.Primary.Medium",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "CustomerReviews.Count",
      "DetailPageURL",
    ];

    const raw = await new Promise((ok, fail) => {
      api.searchItems(reqModel, (err, data) => (err ? fail(err) : ok(data)));
    });

    const resp =
      ProductAdvertisingAPIv1.SearchItemsResponse.constructFromObject(raw)
        .SearchResult?.Items || [];

    const products = resp
      .map((item) => ({
        title: item.ItemInfo?.Title?.DisplayValue,
        price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount,
        image: item.Images?.Primary?.Medium?.URL,
        reviews: item.CustomerReviews?.Count,
        link: item.DetailPageURL,
      }))
      .filter((p) => p.title && p.price);

    res.json({ products });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({
      error: "Failed to search products",
      details: err.message,
    });
  }
});

// — GET ITEM DETAILS
router.get("/product/:asin", async (req, res) => {
  try {
    const { asin } = req.params;
    const reqModel = new ProductAdvertisingAPIv1.GetItemsRequest();
    reqModel.PartnerTag = process.env.AWS_PARTNER_TAG;
    reqModel.PartnerType = "Associates";
    reqModel.ItemIds = [asin];
    reqModel.Resources = [
      "Images.Primary.Medium",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "ItemInfo.Features",
      "ItemInfo.ProductInfo",
      "ItemInfo.ByLineInfo",
      "ItemInfo.ContentInfo",
      "ItemInfo.ManufactureInfo",
      "CustomerReviews.Count",
      "DetailPageURL",
    ];

    const raw = await new Promise((ok, fail) => {
      api.getItems(reqModel, (err, data) => (err ? fail(err) : ok(data)));
    });

    res.json(raw);
  } catch (err) {
    console.error("GetItem error:", err);
    res.status(500).json({
      error: "Failed to get product details",
      details: err.message,
    });
  }
});

module.exports = router;
