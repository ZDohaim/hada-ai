const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Import existing API configurations from server.js patterns
const niceoneApi = axios.create({
  baseURL: "https://api.niceonesa.com",
  timeout: 10000,
});

const jarirApi = axios.create({
  baseURL: "https://mecs.klevu.com/cloud-search/n-search/search",
  timeout: 30000,
});

// Utility functions from server.js
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

// Headers from server.js
const getNiceOneHeaders = () => ({
  accept: "*/*",
  "accept-language": "en,en-US;q=0.9,ar;q=0.8",
  origin: "https://niceonesa.com",
  platform: "web",
  referer: "https://niceonesa.com/",
  "sec-ch-ua": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  versionnumber: "5.0.11",
  "web-layout": "laptop",
  "x-oc-currency": "SAR",
  "x-oc-merchant-id": process.env.NICEONE_MERCHANT_ID || "2afc3973-04a5-4913-83f8-d45b0156b5f1",
  "x-oc-merchant-language": "en",
  "x-oc-restadmin-id": process.env.NICEONE_RESTADMIN_ID || "c15378d0-04f1-4d36-9af7-ab7e17da918b",
  "x-oc-session": process.env.NICEONE_SESSION || "761c5dab2893054e7ce719bf12d6b9b5",
  cookie: `PHPSESSID=${process.env.NICEONE_SESSION}; language=en-gb; currency=SAR`,
});

const getJarirHeaders = () => ({
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  origin: "https://www.jarir.com",
  priority: "u=1, i",
  referer: "https://www.jarir.com/",
  "sec-ch-ua": '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
});

// Product normalization adapted from server.js
const normalizeProductForDB = (product, store, category) => {
  if (!product) return null;

  const normalizedName = product.title || product.name || product.nameEn || product.itemName || "Unknown Product";
  const normalizedPrice = parseFloat(
    product.price || 
    product.salePrice || 
    product.productAvailability?.[2]?.priceWithVat ||
    0
  );

  const normalizedDescription = product.description || product.shortDescription || normalizedName;
  const normalizedImageUrl = product.image || product.imageUrl || product.thumbnail || product.thumb || null;
  const normalizedProductUrl = product.link || product.url || product.productUrl || product.share_url || product.slug || null;

  // Extract brand information
  const brand = product.brand || product.brandName || product.attributes?.brand?.nameEn || null;

  // Extract tags from various fields
  const tags = [
    ...(product.producttag_data?.map(tag => tag.label) || []),
    ...(product.tags || []),
    product.brand,
    product.brandName,
    product.attributes?.brand?.nameEn,
    ...(product.Category ? [product.Category] : []),
    ...(product.categories?.map(cat => cat.nameEn) || [])
  ].filter(Boolean);

  // Create a unique source_id based on the product's original ID or URL
  const sourceId = product.id || product.productId || product.slug || product.url || `${store}-${Date.now()}-${Math.random()}`;

  return {
    name: normalizedName,
    description: normalizedDescription,
    price_sar: normalizedPrice,
    image_url: normalizedImageUrl,
    product_url: normalizedProductUrl,
    brand: brand,
    tags: [...new Set(tags)], // Remove duplicates
    availability: 'in_stock', // Default availability
    source_id: String(sourceId), // Ensure it's a string
    raw: product // Store original for debugging
  };
};

// Store-specific search terms optimized for specialized categories and accuracy
const SEARCH_TERMS = {
  floward: {
    gifts: ["roses", "bouquet", "luxury flowers", "premium arrangement", "anniversary flowers", "romantic bouquet"],
    premium: ["luxury gifts", "premium bundles", "elegant presents", "exclusive items"],
    fashion: ["jewelry", "premium accessories", "luxury watches", "elegant jewelry", "designer accessories"],
    home_decor: ["luxury home items", "decorative pieces", "elegant vases", "home accessories"]
  },
  jarir: {
    electronics: ["laptop", "tablet", "smartphone", "tech gadgets", "technology", "gadgets", "computers", "mobile accessories"],
    books: ["books", "bestsellers", "arabic books", "english books", "educational books", "reference books"],
    gaming: ["gaming", "playstation", "xbox", "nintendo", "gaming accessories", "controllers", "gaming headsets", "console games"],
    office: ["office supplies", "stationery", "notebooks", "pens", "desk accessories", "office equipment", "planners"],
    devices: ["tablets", "smartphones", "accessories", "chargers", "cases"]
  },
  niceone: {
    makeup: ["makeup", "cosmetics", "lipstick", "foundation", "eyeshadow", "mascara"],
    perfume: ["perfume", "fragrance", "cologne", "scent", "eau de parfum"],
    care: ["skincare", "moisturizer", "cleanser", "serum", "face care", "body care"],
    fitness: ["vitamins", "supplements", "health", "nutrition", "wellness", "protein", "workout supplements"],
    nails: ["nail polish", "nail care", "manicure", "nail art", "nail accessories"],
    lenses: ["contact lenses", "colored lenses", "daily lenses", "monthly lenses"],
    fashion: ["accessories", "beauty tools", "personal accessories"]
  }
};

// Database setup function
const setupDatabase = async () => {
  console.log('🏗️ Setting up database foundation data...');
  
  try {
    // First check if tables already exist
    const { data: storesExist } = await supabase
      .from('stores')
      .select('count')
      .limit(1);
      
    if (storesExist) {
      console.log('✅ Database tables already exist');
      return;
    }
  } catch (error) {
    // Tables don't exist, need to create them
    console.log('📋 Please run the foundation SQL script manually:');
    console.log('   1. Open your Supabase dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Run the SQL from: backend/sql/01_foundation_data.sql');
    console.log('\nAfter running the SQL, try the ingest command again.');
    throw new Error('Database setup required - please run foundation SQL manually');
  }
};

// Database operations
const getStoreId = async (storeCode) => {
  const { data, error } = await supabase
    .from('stores')
    .select('id')
    .eq('code', storeCode)
    .single();
  
  if (error) {
    // If store not found, try to set up database first
    if (error.code === 'PGRST116' || error.message.includes('relation "stores" does not exist')) {
      console.log('🔄 Database tables not found, attempting setup...');
      await setupDatabase();
      // Retry after setup
      const { data: retryData, error: retryError } = await supabase
        .from('stores')
        .select('id')
        .eq('code', storeCode)
        .single();
      if (retryError) throw new Error(`Store not found after setup: ${storeCode}`);
      return retryData.id;
    }
    throw new Error(`Store not found: ${storeCode}`);
  }
  return data.id;
};

const getCategoryId = async (categoryCode) => {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('code', categoryCode)
    .single();
  
  if (error) {
    // If category not found, try to set up database first
    if (error.code === 'PGRST116' || error.message.includes('relation "categories" does not exist')) {
      console.log('🔄 Database tables not found, attempting setup...');
      await setupDatabase();
      // Retry after setup
      const { data: retryData, error: retryError } = await supabase
        .from('categories')
        .select('id')
        .eq('code', categoryCode)
        .single();
      if (retryError) throw new Error(`Category not found after setup: ${categoryCode}`);
      return retryData.id;
    }
    throw new Error(`Category not found: ${categoryCode}`);
  }
  return data.id;
};

const insertProducts = async (products) => {
  if (products.length === 0) return { success: true, inserted: 0 };

  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select('id');

  if (error) {
    console.error('Database insertion error:', error);
    throw error;
  }

  return { success: true, inserted: data.length };
};

// API-specific ingestion functions
const ingestFromNiceOne = async (searchTerm, category, limit = 50) => {
  const params = pruneEmpty({
    route: "rest/product_admin/products",
    search: searchTerm,
    sort: "most_popular",
    page: 1,
    limit: limit,
    first: false,
  });

  console.log(`→ Fetching NiceOne products for "${searchTerm}" (${category})`);
  
  const response = await niceoneApi.get("/", {
    params,
    headers: getNiceOneHeaders(),
  });

  const products = extractProducts(response);
  const normalizedProducts = products
    .map(p => normalizeProductForDB(p, 'niceone', category))
    .filter(p => p && p.price_sar > 0); // Filter out invalid products

  console.log(`✓ NiceOne: ${normalizedProducts.length} valid products for "${searchTerm}"`);
  return normalizedProducts;
};

const ingestFromJarir = async (searchTerm, category, limit = 50) => {
  const params = {
    autoComplete: true,
    typeOfSuggestions: "cms|category",
    noOfResults: limit,
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
    term: searchTerm,
    filterResults: "",
    klevu_filterLimit: 50,
  };

  console.log(`→ Fetching Jarir products for "${searchTerm}" (${category})`);

  const response = await jarirApi.get("", {
    params,
    headers: getJarirHeaders(),
  });

  const results = response.data.result || [];
  
  // Apply trending/bestseller filter from existing logic
  const popularTags = ["Trending Now", "Best Sellers"];
  const filteredResults = results.filter((item) => {
    if (!item.producttag_data) return true; // Include all if no tags
    return item.producttag_data.some((tag) => popularTags.includes(tag.label));
  });

  const normalizedProducts = filteredResults
    .map(p => normalizeProductForDB(p, 'jarir', category))
    .filter(p => p && p.price_sar > 0);

  console.log(`✓ Jarir: ${normalizedProducts.length} valid products for "${searchTerm}"`);
  return normalizedProducts;
};

const ingestFromFloward = async (searchTerm, category, limit = 50) => {
  // Floward uses Algolia - this is a simplified version
  // In production, you'd implement the full Algolia integration from server.js
  console.log(`⚠️ Floward ingestion not fully implemented for "${searchTerm}" (${category})`);
  console.log(`   Recommendation: Implement Algolia search or use existing /api/floward/search endpoint`);
  return [];
};

// Main ingestion functions
const ingestStore = async (storeName, options = {}) => {
  const { categoriesFilter = null, limit = 50, dryRun = false } = options;
  
  if (!SEARCH_TERMS[storeName]) {
    throw new Error(`Unknown store: ${storeName}`);
  }

  const storeId = await getStoreId(storeName);
  const searchTerms = SEARCH_TERMS[storeName];
  const categories = categoriesFilter || Object.keys(searchTerms);
  
  let totalProducts = 0;
  let totalInserted = 0;

  for (const category of categories) {
    if (!searchTerms[category]) {
      console.log(`⚠️ No search terms for ${storeName}/${category}`);
      continue;
    }

    const categoryId = await getCategoryId(category);
    
    for (const searchTerm of searchTerms[category]) {
      try {
        let products = [];
        
        switch (storeName) {
          case 'niceone':
            products = await ingestFromNiceOne(searchTerm, category, limit);
            break;
          case 'jarir':
            products = await ingestFromJarir(searchTerm, category, limit);
            break;
          case 'floward':
            products = await ingestFromFloward(searchTerm, category, limit);
            break;
        }

        // Add store_id and category_id to products
        const productsWithIds = products.map(p => ({
          ...p,
          store_id: storeId,
          category_id: categoryId
        }));

        totalProducts += productsWithIds.length;

        if (!dryRun && productsWithIds.length > 0) {
          const result = await insertProducts(productsWithIds);
          totalInserted += result.inserted;
          console.log(`✅ Inserted ${result.inserted} products for ${storeName}/${category}/"${searchTerm}"`);
        } else if (dryRun) {
          console.log(`🧪 Dry run: Would insert ${productsWithIds.length} products for ${storeName}/${category}/"${searchTerm}"`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error ingesting ${storeName}/${category}/"${searchTerm}":`, error.message);
      }
    }
  }

  return { totalProducts, totalInserted };
};

const ingestAllStores = async (options = {}) => {
  const stores = ['niceone', 'jarir', 'floward'];
  const results = {};

  for (const store of stores) {
    console.log(`\n🏪 Starting ingestion for ${store.toUpperCase()}`);
    try {
      results[store] = await ingestStore(store, options);
      console.log(`✅ ${store.toUpperCase()} complete: ${results[store].totalInserted} products inserted`);
    } catch (error) {
      console.error(`❌ ${store.toUpperCase()} failed:`, error.message);
      results[store] = { error: error.message };
    }
  }

  return results;
};

module.exports = {
  ingestStore,
  ingestAllStores,
  setupDatabase,
  SEARCH_TERMS
};