const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Data validation rules
const validateProduct = (product) => {
  const errors = [];
  const warnings = [];

  // Required fields validation
  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!product.price_sar || product.price_sar <= 0) {
    errors.push('Valid price (> 0) is required');
  }

  if (!product.store_id) {
    errors.push('Store ID is required');
  }

  if (!product.category_id) {
    errors.push('Category ID is required');
  }

  // Business logic validation
  if (product.price_sar > 10000) {
    warnings.push('Price seems unusually high (> 10,000 SAR)');
  }

  if (product.price_sar < 1) {
    warnings.push('Price seems unusually low (< 1 SAR)');
  }

  if (product.name && product.name.length > 500) {
    warnings.push('Product name is very long (> 500 characters)');
  }

  if (product.description && product.description.length > 2000) {
    warnings.push('Description is very long (> 2000 characters)');
  }

  // URL validation
  if (product.image_url && !isValidUrl(product.image_url)) {
    warnings.push('Image URL appears invalid');
  }

  if (product.product_url && !isValidUrl(product.product_url)) {
    warnings.push('Product URL appears invalid');
  }

  // Tags validation
  if (product.tags && product.tags.length > 20) {
    warnings.push('Product has many tags (> 20)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    cleanedProduct: cleanProduct(product)
  };
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const cleanProduct = (product) => {
  const cleaned = { ...product };

  // Clean and normalize name
  if (cleaned.name) {
    cleaned.name = cleaned.name.trim().substring(0, 500);
  }

  // Clean description
  if (cleaned.description) {
    cleaned.description = cleaned.description.trim().substring(0, 2000);
  }

  // Normalize price
  if (cleaned.price_sar) {
    cleaned.price_sar = Math.round(parseFloat(cleaned.price_sar) * 100) / 100; // Round to 2 decimals
  }

  // Clean and deduplicate tags
  if (cleaned.tags && Array.isArray(cleaned.tags)) {
    cleaned.tags = [...new Set(
      cleaned.tags
        .filter(tag => tag && typeof tag === 'string')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length <= 50)
    )].slice(0, 20); // Limit to 20 tags
  }

  return cleaned;
};

// Deduplication logic
const generateProductHash = (product) => {
  // Create a hash based on name and price for deduplication
  const hashInput = `${product.name?.toLowerCase().trim()}_${product.price_sar}_${product.store_id}`;
  return crypto.createHash('md5').update(hashInput).digest('hex');
};

const findDuplicates = async (products) => {
  if (products.length === 0) return { unique: [], duplicates: [] };

  // Generate hashes for all products
  const productHashes = products.map(product => ({
    ...product,
    hash: generateProductHash(product)
  }));

  // Check for duplicates in database
  const hashes = productHashes.map(p => p.hash);
  const { data: existingProducts, error } = await supabase
    .from('products')
    .select('id, name, price_sar, store_id')
    .in('hash', hashes); // Note: You'd need to add a hash column to products table

  if (error) {
    console.warn('Could not check for existing duplicates:', error.message);
    // Fall back to internal deduplication only
    return deduplicateInternal(productHashes);
  }

  const existingHashes = new Set(existingProducts.map(p => generateProductHash(p)));
  
  // Separate unique vs duplicate products
  const unique = [];
  const duplicates = [];

  productHashes.forEach(product => {
    if (existingHashes.has(product.hash)) {
      duplicates.push(product);
    } else {
      unique.push(product);
    }
  });

  // Also deduplicate within the current batch
  const internallyDeduplicated = deduplicateInternal(unique);
  
  return {
    unique: internallyDeduplicated.unique,
    duplicates: [...duplicates, ...internallyDeduplicated.duplicates]
  };
};

const deduplicateInternal = (products) => {
  const seen = new Set();
  const unique = [];
  const duplicates = [];

  products.forEach(product => {
    const hash = product.hash || generateProductHash(product);
    
    if (seen.has(hash)) {
      duplicates.push(product);
    } else {
      seen.add(hash);
      unique.push(product);
    }
  });

  return { unique, duplicates };
};

// Batch validation function
const validateProductBatch = async (products) => {
  const results = {
    valid: [],
    invalid: [],
    duplicates: [],
    warnings: [],
    stats: {
      total: products.length,
      validCount: 0,
      invalidCount: 0,
      duplicateCount: 0,
      warningCount: 0
    }
  };

  // Step 1: Validate each product
  const validatedProducts = products.map(product => {
    const validation = validateProduct(product);
    
    if (validation.isValid) {
      results.valid.push(validation.cleanedProduct);
      results.stats.validCount++;
    } else {
      results.invalid.push({
        product: validation.cleanedProduct,
        errors: validation.errors
      });
      results.stats.invalidCount++;
    }

    if (validation.warnings.length > 0) {
      results.warnings.push({
        product: validation.cleanedProduct,
        warnings: validation.warnings
      });
      results.stats.warningCount++;
    }

    return validation;
  });

  // Step 2: Check for duplicates among valid products
  if (results.valid.length > 0) {
    const deduplicationResult = await findDuplicates(results.valid);
    results.valid = deduplicationResult.unique;
    results.duplicates = deduplicationResult.duplicates;
    results.stats.duplicateCount = results.duplicates.length;
    results.stats.validCount = results.valid.length; // Update after deduplication
  }

  return results;
};

// Price analysis and normalization
const analyzePrices = (products) => {
  const prices = products
    .map(p => p.price_sar)
    .filter(price => price && price > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return { min: 0, max: 0, median: 0, average: 0, outliers: [] };
  }

  const min = prices[0];
  const max = prices[prices.length - 1];
  const median = prices[Math.floor(prices.length / 2)];
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;

  // Simple outlier detection (prices > 3 standard deviations from mean)
  const stdDev = Math.sqrt(
    prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length
  );
  const outlierThreshold = average + (3 * stdDev);
  const outliers = products.filter(p => p.price_sar > outlierThreshold);

  return {
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
    median: Math.round(median * 100) / 100,
    average: Math.round(average * 100) / 100,
    standardDeviation: Math.round(stdDev * 100) / 100,
    outliers: outliers.length,
    priceDistribution: {
      under50: prices.filter(p => p < 50).length,
      '50to200': prices.filter(p => p >= 50 && p < 200).length,
      '200to500': prices.filter(p => p >= 200 && p < 500).length,
      over500: prices.filter(p => p >= 500).length
    }
  };
};

// Data quality report
const generateQualityReport = (validationResults, products) => {
  const priceAnalysis = analyzePrices(products);
  
  return {
    summary: {
      totalProducts: validationResults.stats.total,
      validProducts: validationResults.stats.validCount,
      invalidProducts: validationResults.stats.invalidCount,
      duplicates: validationResults.stats.duplicateCount,
      warnings: validationResults.stats.warningCount,
      qualityScore: Math.round(
        (validationResults.stats.validCount / validationResults.stats.total) * 100
      )
    },
    priceAnalysis,
    commonErrors: getCommonErrors(validationResults.invalid),
    commonWarnings: getCommonWarnings(validationResults.warnings),
    recommendations: generateRecommendations(validationResults, priceAnalysis)
  };
};

const getCommonErrors = (invalidProducts) => {
  const errorCounts = {};
  invalidProducts.forEach(({ errors }) => {
    errors.forEach(error => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
  });
  
  return Object.entries(errorCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
};

const getCommonWarnings = (warningProducts) => {
  const warningCounts = {};
  warningProducts.forEach(({ warnings }) => {
    warnings.forEach(warning => {
      warningCounts[warning] = (warningCounts[warning] || 0) + 1;
    });
  });
  
  return Object.entries(warningCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([warning, count]) => ({ warning, count }));
};

const generateRecommendations = (validationResults, priceAnalysis) => {
  const recommendations = [];

  if (validationResults.stats.invalidCount > validationResults.stats.validCount * 0.1) {
    recommendations.push('High number of invalid products - review data source quality');
  }

  if (validationResults.stats.duplicateCount > validationResults.stats.validCount * 0.2) {
    recommendations.push('High duplication rate - consider improving deduplication logic');
  }

  if (priceAnalysis.outliers > 0) {
    recommendations.push(`${priceAnalysis.outliers} price outliers detected - review unusual pricing`);
  }

  if (priceAnalysis.priceDistribution.under50 / validationResults.stats.total > 0.8) {
    recommendations.push('Most products under 50 SAR - consider premium product sources');
  }

  return recommendations;
};

module.exports = {
  validateProduct,
  validateProductBatch,
  findDuplicates,
  generateProductHash,
  analyzePrices,
  generateQualityReport
};