const aws4 = require("aws4");
const axios = require("axios");
require("dotenv").config();

class AmazonProductAPI {
  constructor() {
    this.region = process.env.AWS_REGION || "us-east-1";
    this.host = "webservices.amazon.com";
    this.endpoint = "https://" + this.host;
    this.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  async searchProducts(query, maxResults = 5) {
    try {
      const path = "/paapi5/searchitems";
      const payload = {
        PartnerTag: process.env.AMAZON_ASSOCIATE_TAG,
        PartnerType: "Associates",
        Keywords: query,
        SearchIndex: "All",
        ItemCount: maxResults,
        Resources: [
          "ItemInfo.Title",
          "Offers.Listings.Price",
          "Images.Primary.Medium",
          "ItemInfo.Features",
          "ItemInfo.ByLineInfo",
        ],
      };

      const opts = {
        host: this.host,
        method: "POST",
        path: path,
        headers: {
          "content-type": "application/json",
          "x-amz-target":
            "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
        },
        service: "ProductAdvertisingAPI",
        region: this.region,
        body: JSON.stringify(payload),
      };

      aws4.sign(opts, this.credentials);

      const response = await axios({
        method: opts.method,
        url: this.endpoint + path,
        headers: opts.headers,
        data: payload,
      });

      if (
        response.data &&
        response.data.SearchResult &&
        response.data.SearchResult.Items
      ) {
        return response.data.SearchResult.Items.map((item) => ({
          title: item.ItemInfo.Title.DisplayValue,
          price:
            item.Offers?.Listings?.[0]?.Price?.DisplayAmount ||
            "Price not available",
          imageUrl: item.Images?.Primary?.Medium?.URL,
          features: item.ItemInfo.Features?.DisplayValues || [],
          url: item.DetailPageURL,
        }));
      }

      return [];
    } catch (error) {
      console.error("Error searching Amazon products:", error);
      throw new Error("Failed to search Amazon products");
    }
  }

  async findMatchingProducts(giftSuggestion) {
    try {
      // Extract relevant keywords from the gift suggestion
      const keywords = giftSuggestion.name;
      const priceRange = giftSuggestion.price
        .replace(/[^0-9-]/g, "")
        .split("-");

      const options = {};
      if (priceRange.length === 2) {
        options.MinPrice = parseInt(priceRange[0]);
        options.MaxPrice = parseInt(priceRange[1]);
      }

      const results = await this.searchProducts(keywords, options);
      return results.SearchResult?.Items || [];
    } catch (error) {
      console.error("Error finding matching products:", error);
      return [];
    }
  }
}

module.exports = { AmazonProductAPI };
