#!/usr/bin/env node

const axios = require('axios');

// FLOWARD API configuration
const flowardApi = axios.create({
  baseURL: "https://apigateway.prod.floward.io",
  timeout: 30000,
});

const getFlowardHeaders = () => ({
  accept: 'application/json',
  'accept-language': 'en,en-US;q=0.9,ar;q=0.8',
  'access-control-allow-origin': '*',
  build: '1.0.0',
  currency: 'SAR',
  device: '2',
  freedeliveryvalueexperiment: '',
  lang: '1',
  minimumordervalueexperiment: '0',
  mxdistinctid: '',
  opscountryid: '2',
  opsid: '2',
  origin: 'https://floward.com',
  priority: 'u=1, i',
  referer: 'https://floward.com/',
  'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'cross-site',
  segment: 'c3a84a4a-c3ec-4529-bc23-f4607d6304cb',
  uniqid: 'NTQxMmY0MTctMGE4My00NmE0LWI4MTUtODA2YWYwOGRhY2M1',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36'
});

const normalizeFlowardProduct = (product, category) => {
  if (!product) return null;

  const nameEn = product.nameEn || product.name || "Unknown Product";
  const nameAr = product.nameAr || nameEn;
  const name = `${nameEn} | ${nameAr}`;

  const availability = product.productAvailability;
  let price = 0;
  
  if (availability && availability['2']) {
    price = parseFloat(availability['2'].priceWithVat || 0);
  } else if (product.price) {
    price = parseFloat(product.price);
  }

  const description = product.description || product.shortDescription || product.descriptionAr || nameEn;
  const imageUrl = product.images?.coverImage || product.images?.productImages?.[0] || null;
  const productUrl = product.slug ? `https://floward.com/saudi-en/p/${product.slug}` : null;
  const brand = product.attributes?.brand?.[0]?.nameEn || product.brand || null;

  const tags = [
    brand,
    ...(product.attributes?.['perfume-family']?.map(f => f.nameEn) || []),
    ...(product.attributes?.gender?.map(g => g.nameEn) || []),
    ...(product.categories?.collection?.map(c => c.nameEn) || []),
    product.attributes?.['perfume-type']?.[0]?.nameEn
  ].filter(Boolean);

  const sourceId = product.objectID || product.slug || `floward-${Date.now()}-${Math.random()}`;

  return {
    name,
    description: description.replace(/<[^>]*>/g, ''),
    price_sar: price,
    image_url: imageUrl,
    product_url: productUrl,
    brand,
    tags: [...new Set(tags)],
    availability: product.productAvailability?.['2']?.inStock ? 'in_stock' : 'out_of_stock',
    source_id: String(sourceId),
  };
};

const testDryRun = async () => {
  console.log('🧪 Testing FLOWARD API Dry Run - No Database Required\n');

  const categories = {
    perfume: ['perfume', 'fragrance'],
    gifts: ['gifts', 'flowers'],
    premium: ['luxury', 'premium']
  };

  for (const [categoryName, apiKeys] of Object.entries(categories)) {
    console.log(`📂 Testing category: ${categoryName}`);
    
    for (const apiKey of apiKeys) {
      try {
        console.log(`  → Fetching products for key: "${apiKey}"`);
        
        const response = await flowardApi.get('/customer/catalog/cms/products', {
          params: { key: apiKey },
          headers: getFlowardHeaders(),
        });

        if (!response.data || !Array.isArray(response.data)) {
          console.log(`  ⚠️ No products found for "${apiKey}"`);
          continue;
        }

        const products = response.data.slice(0, 3); // Limit to 3 for testing
        const normalizedProducts = products
          .map(p => normalizeFlowardProduct(p, categoryName))
          .filter(p => p && p.price_sar > 0);

        console.log(`  ✓ Found ${normalizedProducts.length} valid products`);
        
        if (normalizedProducts.length > 0) {
          console.log(`  📋 Sample products:`);
          normalizedProducts.forEach((p, i) => {
            console.log(`     ${i + 1}. ${p.name.split(' | ')[0]} - ${p.price_sar} SAR`);
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`  ❌ Error fetching "${apiKey}":`, error.message);
      }
    }
    console.log('');
  }

  console.log('✅ Dry run test completed successfully!');
};

testDryRun().catch(error => {
  console.error('💥 Test failed:', error.message);
  process.exit(1);
});