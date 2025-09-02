#!/usr/bin/env node

const axios = require('axios');

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
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'Accept-Language': 'en,en-US;q=0.9,ar;q=0.8',
    'Origin': 'https://floward.com',
    'Referer': 'https://floward.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
  },
});

const createAlgoliaQuery = (categoryPageId, query = '', page = 0, hitsPerPage = 18) => {
  const baseFilters = 'productAvailability.2.listed=1 AND (productAvailability.2.availability>0 OR productAvailability.2.enablePreOrder=1) AND NOT productAvailability.2.isPickAndPack=1 AND NOT type=4';
  const categoryFilter = categoryPageId ? ` AND categoryPageIds:${categoryPageId}` : '';
  const filters = baseFilters + categoryFilter;

  return {
    indexName: ALGOLIA_CONFIG.indexName,
    params: new URLSearchParams({
      clickAnalytics: 'true',
      facets: JSON.stringify([
        'Category',
        'attributes.brand.nameEn',
        'attributes.gender.nameEn',
        'attributes.perfume-type.nameEn',
        'hierarchicalCategories.lvl0',
        'productAvailability.2.priceWithVat',
      ]),
      filters,
      getRankingInfo: 'true',
      highlightPostTag: '__/ais-highlight__',
      highlightPreTag: '__ais-highlight__',
      hitsPerPage: hitsPerPage.toString(),
      maxValuesPerFacet: '1000000',
      page: page.toString(),
      query,
      queryLanguages: JSON.stringify(['en', 'ar']),
      tagFilters: ''
    }).toString()
  };
};

const testAlgoliaAPI = async (categoryPageId) => {
  console.log(`🧪 Testing FLOWARD Algolia API with categoryPageId: "${categoryPageId}"`);
  
  try {
    const algoliaQuery = createAlgoliaQuery(categoryPageId, '', 0, 5);
    
    const requestBody = JSON.stringify({
      requests: [algoliaQuery]
    });

    console.log('📤 Request body:', requestBody);

    const response = await algoliaApi.post('', requestBody, {
      params: {
        'x-algolia-agent': 'Algolia for JavaScript (4.17.0); Browser (lite); instantsearch.js (4.56.9); react (18.2.0); react-instantsearch (7.0.1); react-instantsearch-core (7.0.1); next.js (13.4.12); JS Helper (3.14.0)',
        'x-algolia-api-key': ALGOLIA_CONFIG.apiKey,
        'x-algolia-application-id': ALGOLIA_CONFIG.appId
      }
    });

    if (!response.data || !response.data.results || !response.data.results[0]) {
      console.log('❌ No results found');
      return;
    }

    const hits = response.data.results[0].hits || [];
    console.log(`✅ API test successful! Retrieved ${hits.length} products`);
    
    if (hits.length > 0) {
      console.log('\n📋 Sample products:');
      hits.slice(0, 3).forEach((product, i) => {
        console.log(`   ${i + 1}. ${product.nameEn || 'N/A'}`);
        console.log(`      Name (AR): ${product.nameAr || 'N/A'}`);
        console.log(`      Price: ${product.productAvailability?.['2']?.priceWithVat || 'N/A'} SAR`);
        console.log(`      Brand: ${product.attributes?.brand?.[0]?.nameEn || 'N/A'}`);
        console.log(`      Slug: ${product.slug || 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
};

// Test with different categoryPageIds
const main = async () => {
  const categoryPageId = process.argv[2] || 'perfume';
  
  console.log(`🌸 Testing FLOWARD Algolia API\n`);
  
  await testAlgoliaAPI(categoryPageId);
};

main().catch(console.error);