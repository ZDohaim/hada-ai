#!/usr/bin/env node

// Check Node.js version (Supabase requires Node 20+)
const nodeVersion = parseInt(process.version.slice(1).split(".")[0]);
if (nodeVersion < 20) {
  console.warn(
    `⚠️  Node.js ${process.version} detected. Supabase requires Node.js 20 or later.`
  );
  console.warn("   Consider upgrading: https://nodejs.org/");
  console.warn("   This may cause issues with @supabase/supabase-js\n");
}

// Load environment variables from backend/.env (where Supabase keys are stored)
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

// Also try loading from root .env as fallback
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// FLOWARD Algolia API configuration
const ALGOLIA_CONFIG = {
  baseURL: "https://q085hq2luq-dsn.algolia.net/1/indexes/*/queries",
  appId: "Q085HQ2LUQ",
  apiKey: "a36327f4aec9eec775af628df0f659ab",
  indexName: "product_KSA",
  timeout: 30000,
};

const algoliaApi = axios.create({
  baseURL: ALGOLIA_CONFIG.baseURL,
  timeout: ALGOLIA_CONFIG.timeout,
  headers: {
    "Content-Type": "application/json",
    Accept: "*/*",
    "Accept-Language": "en,en-US;q=0.9,ar;q=0.8",
    Origin: "https://floward.com",
    Referer: "https://floward.com/",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
    "sec-ch-ua":
      '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
  },
});

const createAlgoliaQuery = (
  categoryPageId,
  query = "",
  page = 0,
  hitsPerPage = 50
) => {
  const baseFilters =
    "productAvailability.2.listed=1 AND (productAvailability.2.availability>0 OR productAvailability.2.enablePreOrder=1) AND NOT productAvailability.2.isPickAndPack=1 AND NOT type=4";
  const categoryFilter = categoryPageId
    ? ` AND categoryPageIds:${categoryPageId}`
    : "";
  const filters = baseFilters + categoryFilter;

  return {
    indexName: ALGOLIA_CONFIG.indexName,
    params: new URLSearchParams({
      clickAnalytics: "true",
      facets: JSON.stringify([
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
      ]),
      filters,
      getRankingInfo: "true",
      highlightPostTag: "__/ais-highlight__",
      highlightPreTag: "__ais-highlight__",
      hitsPerPage: hitsPerPage.toString(),
      maxValuesPerFacet: "1000000",
      page: page.toString(),
      query,
      queryLanguages: JSON.stringify(["en", "ar"]),
      tagFilters: "",
    }).toString(),
  };
};

// FLOWARD product categories using Algolia categoryPageIds
const FLOWARD_CATEGORIES = {
  perfume: {
    dbCategory: "perfume",
    categoryPageIds: ["perfume"],
    queries: ["", "fragrance", "cologne", "scent"],
  },
  gifts: {
    dbCategory: "gifts",
    categoryPageIds: ["womens-gifting", "for-him"],
    queries: ["", "gift", "present", "bouquet", "flowers"],
  },
  premium: {
    dbCategory: "premium",
    categoryPageIds: ["luxury", "premium-gifts"],
    queries: ["", "luxury", "premium", "exclusive"],
  },
  fashion: {
    dbCategory: "fashion",
    categoryPageIds: ["jewelry", "accessories", "watches"],
    queries: ["", "jewelry", "watch", "accessory"],
  },
  home_decor: {
    dbCategory: "home_decor",
    categoryPageIds: ["home-decor", "vases", "candles"],
    queries: ["", "home", "decor", "vase", "candle"],
  },
};

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

const showHelp = () => {
  console.log(`
🌸 FLOWARD Product Population Script

USAGE:
  npm run floward-populate [command] [options]
  node backend/scripts/flowardPopulate.js [command] [options]

COMMANDS:
  help                    Show this help message
  list-categories         List available FLOWARD categories
  populate [category]     Populate products for specific category
  populate-all            Populate products from all FLOWARD categories
  test-api [key]          Test API call with specific key
  dry-run [category]      Preview products without database insertion

CATEGORIES:
  perfume, gifts, premium, fashion, home_decor

OPTIONS:
  --limit [number]        Limit products per category (default: 50)
  --delay [ms]           Delay between API calls (default: 2000ms)
  --help                  Show this help

EXAMPLES:
  node backend/scripts/flowardPopulate.js populate perfume --limit 30
  node backend/scripts/flowardPopulate.js populate-all --limit 20 --delay 3000
  node backend/scripts/flowardPopulate.js test-api perfume
  node backend/scripts/flowardPopulate.js test-api womens-gifting
  node backend/scripts/flowardPopulate.js dry-run gifts

ENVIRONMENT VARIABLES REQUIRED:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
};

const parseOptions = (args) => {
  const options = {
    limit: 50,
    delay: 2000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit":
        options.limit = parseInt(args[i + 1]) || 50;
        i++;
        break;
      case "--delay":
        options.delay = parseInt(args[i + 1]) || 2000;
        i++;
        break;
      case "--help":
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
};

const checkEnvironment = () => {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

  const missing = required.filter((env) => !process.env[env]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((env) => console.error(`   ${env}`));
    console.error("\n🔍 Debugging info:");
    console.error(`   Looking for .env files in:`);
    console.error(
      `   - ${require("path").resolve(__dirname, "../.env")} (backend)`
    );
    console.error(
      `   - ${require("path").resolve(__dirname, "../../.env")} (root)`
    );
    console.error(
      "\n💡 Make sure the Supabase environment variables are in backend/.env file."
    );
    console.error("   Required variables should be:");
    console.error("   - NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key");
    process.exit(1);
  }

  console.log("✅ Environment variables configured");
  console.log(`   Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
};

// Database helper functions
const getStoreId = async () => {
  const { data, error } = await supabase
    .from("stores")
    .select("id")
    .eq("code", "floward")
    .single();

  if (error) {
    throw new Error(`FLOWARD store not found in database: ${error.message}`);
  }
  return data.id;
};

const getCategoryId = async (categoryCode) => {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("code", categoryCode)
    .single();

  if (error) {
    throw new Error(`Category not found: ${categoryCode} - ${error.message}`);
  }
  return data.id;
};

const insertProducts = async (products) => {
  if (products.length === 0) return { success: true, inserted: 0 };

  const { data, error } = await supabase
    .from("products")
    .insert(products)
    .select("id");

  if (error) {
    console.error("Database insertion error:", error);
    throw error;
  }

  return { success: true, inserted: data.length };
};

// Product normalization
const normalizeFlowardProduct = (product) => {
  if (!product) return null;

  // Extract bilingual names
  const nameEn = product.nameEn || product.name || "Unknown Product";
  const nameAr = product.nameAr || nameEn;
  const name = `${nameEn} | ${nameAr}`;

  // Extract price from productAvailability (SAR with VAT)
  const availability = product.productAvailability;
  let price = 0;

  if (availability && availability["2"]) {
    price = parseFloat(availability["2"].priceWithVat || 0);
  } else if (product.price) {
    price = parseFloat(product.price);
  }

  // Extract descriptions (prefer English, fallback to Arabic)
  const description =
    product.description ||
    product.shortDescription ||
    product.descriptionAr ||
    nameEn;

  // Extract image URL
  const imageUrl =
    product.images?.coverImage || product.images?.productImages?.[0] || null;

  // Build product URL
  const productUrl = product.slug
    ? `https://floward.com/saudi-en/p/${product.slug}`
    : null;

  // Extract brand information
  const brand = product.attributes?.brand?.[0]?.nameEn || product.brand || null;

  // Extract tags from various sources
  const tags = [
    brand,
    ...(product.attributes?.["perfume-family"]?.map((f) => f.nameEn) || []),
    ...(product.attributes?.gender?.map((g) => g.nameEn) || []),
    ...(product.categories?.collection?.map((c) => c.nameEn) || []),
    product.attributes?.["perfume-type"]?.[0]?.nameEn,
  ].filter(Boolean);

  // Create source ID from objectID or slug
  const sourceId =
    product.objectID ||
    product.slug ||
    `floward-${Date.now()}-${Math.random()}`;

  return {
    name,
    description: description.replace(/<[^>]*>/g, ""), // Strip HTML
    price_sar: price,
    image_url: imageUrl,
    product_url: productUrl,
    brand,
    tags: [...new Set(tags)],
    availability: product.productAvailability?.["2"]?.inStock
      ? "in_stock"
      : "out_of_stock",
    source_id: String(sourceId),
    raw: product,
  };
};

// API functions
const fetchFlowardProducts = async (categoryPageId, query = "", limit = 50) => {
  console.log(
    `→ Fetching FLOWARD products from categoryPageId: "${categoryPageId}" with query: "${query}"`
  );

  try {
    // Calculate pages needed
    const hitsPerPage = 50; // Algolia default
    const totalPages = Math.ceil(limit / hitsPerPage);
    let allProducts = [];

    for (let page = 0; page < totalPages; page++) {
      const algoliaQuery = createAlgoliaQuery(
        categoryPageId,
        query,
        page,
        hitsPerPage
      );

      const requestBody = JSON.stringify({
        requests: [algoliaQuery],
      });

      const response = await algoliaApi.post("", requestBody, {
        params: {
          "x-algolia-agent":
            "Algolia for JavaScript (4.17.0); Browser (lite); instantsearch.js (4.56.9); react (18.2.0); react-instantsearch (7.0.1); react-instantsearch-core (7.0.1); next.js (13.4.12); JS Helper (3.14.0)",
          "x-algolia-api-key": ALGOLIA_CONFIG.apiKey,
          "x-algolia-application-id": ALGOLIA_CONFIG.appId,
        },
      });

      if (
        !response.data ||
        !response.data.results ||
        !response.data.results[0]
      ) {
        console.log(
          `⚠️ FLOWARD: No results found for categoryPageId "${categoryPageId}", query "${query}", page ${page}`
        );
        break;
      }

      const hits = response.data.results[0].hits || [];
      if (hits.length === 0) {
        console.log(`⚠️ FLOWARD: No more products found on page ${page}`);
        break;
      }

      allProducts.push(...hits);
      console.log(
        `✓ FLOWARD: Retrieved ${hits.length} products from page ${page}`
      );

      // Stop if we have enough products
      if (allProducts.length >= limit) {
        break;
      }

      // Rate limiting between pages
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const finalProducts = allProducts.slice(0, limit);
    console.log(
      `✓ FLOWARD: Total retrieved ${finalProducts.length} products for categoryPageId "${categoryPageId}", query "${query}"`
    );
    return finalProducts;
  } catch (error) {
    console.error(
      `❌ FLOWARD Algolia API error for categoryPageId "${categoryPageId}", query "${query}":`,
      error.message
    );
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(
        `Response data:`,
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return [];
  }
};

const testApiCall = async (categoryPageId) => {
  console.log(
    `\n🧪 Testing FLOWARD Algolia API with categoryPageId: "${categoryPageId}"`
  );

  try {
    const products = await fetchFlowardProducts(categoryPageId, "", 5);

    if (products.length > 0) {
      console.log(
        `✅ API test successful! Retrieved ${products.length} products`
      );
      console.log("\n📋 Sample product:");
      const sample = products[0];
      console.log(`   Name (EN): ${sample.nameEn}`);
      console.log(`   Name (AR): ${sample.nameAr}`);
      console.log(
        `   Price: ${
          sample.productAvailability?.["2"]?.priceWithVat || "N/A"
        } SAR`
      );
      console.log(
        `   Brand: ${sample.attributes?.brand?.[0]?.nameEn || "N/A"}`
      );
      console.log(`   Slug: ${sample.slug}`);
      console.log(`   ObjectID: ${sample.objectID}`);

      const normalized = normalizeFlowardProduct(sample);
      console.log("\n🔄 Normalized product:");
      console.log(`   Name: ${normalized.name}`);
      console.log(`   Price: ${normalized.price_sar} SAR`);
      console.log(`   Brand: ${normalized.brand}`);
      console.log(`   Tags: [${normalized.tags.join(", ")}]`);
    } else {
      console.log("❌ No products found for this categoryPageId");
    }
  } catch (error) {
    console.error("❌ API test failed:", error.message);
  }
};

const populateCategory = async (categoryName, options, dryRun = false) => {
  if (!FLOWARD_CATEGORIES[categoryName]) {
    throw new Error(
      `Unknown category: ${categoryName}. Available: ${Object.keys(
        FLOWARD_CATEGORIES
      ).join(", ")}`
    );
  }

  const categoryConfig = FLOWARD_CATEGORIES[categoryName];
  const storeId = await getStoreId();
  const categoryId = await getCategoryId(categoryConfig.dbCategory);

  console.log(
    `\n🌸 ${
      dryRun ? "DRY RUN: " : ""
    }Processing FLOWARD category: ${categoryName}`
  );
  console.log(`   Database category: ${categoryConfig.dbCategory}`);
  console.log(
    `   CategoryPageIds: [${categoryConfig.categoryPageIds.join(", ")}]`
  );
  console.log(`   Queries: [${categoryConfig.queries.join(", ")}]`);

  let totalProducts = 0;
  let totalInserted = 0;

  // Process each categoryPageId with different queries
  for (const categoryPageId of categoryConfig.categoryPageIds) {
    for (const query of categoryConfig.queries) {
      try {
        const rawProducts = await fetchFlowardProducts(
          categoryPageId,
          query,
          options.limit
        );

        if (rawProducts.length === 0) {
          console.log(
            `⚠️ No products found for categoryPageId "${categoryPageId}" with query "${query}"`
          );
          continue;
        }

        // Normalize products
        const normalizedProducts = rawProducts
          .map((p) => normalizeFlowardProduct(p))
          .filter((p) => p && p.price_sar > 0);

        // Add database IDs
        const productsWithIds = normalizedProducts.map((p) => ({
          ...p,
          store_id: storeId,
          category_id: categoryId,
        }));

        totalProducts += productsWithIds.length;

        if (!dryRun && productsWithIds.length > 0) {
          const result = await insertProducts(productsWithIds);
          totalInserted += result.inserted;
          console.log(
            `✅ Inserted ${result.inserted} products for categoryPageId "${categoryPageId}" with query "${query}"`
          );
        } else if (dryRun) {
          console.log(
            `🧪 Dry run: Would insert ${productsWithIds.length} products for categoryPageId "${categoryPageId}" with query "${query}"`
          );

          // Show sample products in dry run
          if (productsWithIds.length > 0) {
            console.log("   Sample products:");
            productsWithIds.slice(0, 3).forEach((p, i) => {
              console.log(
                `     ${i + 1}. ${p.name.split(" | ")[0]} - ${p.price_sar} SAR`
              );
            });
          }
        }

        // Rate limiting between queries
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      } catch (error) {
        console.error(
          `❌ Error processing categoryPageId "${categoryPageId}" with query "${query}":`,
          error.message
        );
      }
    }
  }

  console.log(`\n📊 Category ${categoryName} summary:`);
  console.log(`   Products processed: ${totalProducts}`);
  console.log(`   Products inserted: ${totalInserted}`);

  return { totalProducts, totalInserted };
};

const populateAll = async (options, dryRun = false) => {
  console.log(
    `\n🚀 ${dryRun ? "DRY RUN: " : ""}Starting full FLOWARD population`
  );
  console.log(`Options: limit=${options.limit}, delay=${options.delay}ms`);

  const results = {};
  let grandTotalProducts = 0;
  let grandTotalInserted = 0;

  for (const categoryName of Object.keys(FLOWARD_CATEGORIES)) {
    try {
      const result = await populateCategory(categoryName, options, dryRun);
      results[categoryName] = result;
      grandTotalProducts += result.totalProducts;
      grandTotalInserted += result.totalInserted;
    } catch (error) {
      console.error(`❌ Failed to populate ${categoryName}:`, error.message);
      results[categoryName] = { error: error.message };
    }
  }

  console.log(`\n🎉 ${dryRun ? "DRY RUN " : ""}FLOWARD population completed!`);
  console.log("\n📊 Results by category:");

  Object.entries(results).forEach(([category, result]) => {
    if (result.error) {
      console.log(`   ${category}: ❌ ${result.error}`);
    } else {
      console.log(
        `   ${category}: ${result.totalInserted}/${result.totalProducts} products`
      );
    }
  });

  console.log(`\n📈 Grand totals:`);
  console.log(`   Total products processed: ${grandTotalProducts}`);
  console.log(`   Total products inserted: ${grandTotalInserted}`);

  if (grandTotalProducts > 0) {
    const successRate = (
      (grandTotalInserted / grandTotalProducts) *
      100
    ).toFixed(1);
    console.log(`   Success rate: ${successRate}%`);
  }

  return results;
};

const listCategories = () => {
  console.log("\n🌸 Available FLOWARD Categories:\n");

  Object.entries(FLOWARD_CATEGORIES).forEach(([name, config]) => {
    console.log(`📂 ${name}`);
    console.log(`   Database category: ${config.dbCategory}`);
    console.log(`   CategoryPageIds: [${config.categoryPageIds.join(", ")}]`);
    console.log(`   Queries: [${config.queries.join(", ")}]`);
    console.log("");
  });
};

const main = async () => {
  console.log("🌸 FLOWARD Product Population Script\n");

  if (args.length === 0 || command === "help") {
    showHelp();
    return;
  }

  checkEnvironment();

  const options = parseOptions(args.slice(1));

  switch (command) {
    case "list-categories":
      listCategories();
      break;

    case "test-api":
      const testCategoryPageId = args[1];
      if (!testCategoryPageId) {
        console.error("❌ CategoryPageId required for testing");
        console.error(
          "Example: node backend/scripts/flowardPopulate.js test-api perfume"
        );
        console.error(
          "Available categoryPageIds: perfume, jewelry, womens-gifting, for-him"
        );
        process.exit(1);
      }
      await testApiCall(testCategoryPageId);
      break;

    case "populate":
      const category = args[1];
      if (!category) {
        console.error("❌ Category name required");
        console.error(
          `Available categories: ${Object.keys(FLOWARD_CATEGORIES).join(", ")}`
        );
        process.exit(1);
      }
      await populateCategory(category, options, false);
      break;

    case "dry-run":
      const dryCategory = args[1];
      if (!dryCategory) {
        console.error("❌ Category name required for dry run");
        console.error(
          `Available categories: ${Object.keys(FLOWARD_CATEGORIES).join(", ")}`
        );
        process.exit(1);
      }
      await populateCategory(dryCategory, options, true);
      break;

    case "populate-all":
      await populateAll(options, false);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
};

// Error handling
process.on("uncaughtException", (error) => {
  console.error("\n💥 Uncaught Exception:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("\n💥 Unhandled Rejection:", reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("\n💥 Fatal error:", error.message);
    process.exit(1);
  });
}

module.exports = { main };
