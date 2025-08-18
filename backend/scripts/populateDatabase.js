#!/usr/bin/env node

require('dotenv').config({ path: './.env' });
const { ingestStore, ingestAllStores, setupDatabase, SEARCH_TERMS } = require('../services/dataIngestionService');
const { validateProductBatch, generateQualityReport } = require('../services/dataValidationService');

// CLI argument parsing
const args = process.argv.slice(2);
const command = args[0];

const showHelp = () => {
  console.log(`
🎁 Hada AI Database Population Tool

USAGE:
  npm run populate-db [command] [options]

COMMANDS:
  help                    Show this help message
  setup                   Run initial database setup (foundation data)
  ingest [store]          Ingest products from a specific store
  ingest-all              Ingest products from all stores
  validate [store]        Validate existing data for a store
  report                  Generate data quality report
  dry-run [store]         Preview what would be ingested (no database changes)

STORES:
  niceone, jarir, floward

OPTIONS:
  --limit [number]        Limit products per search term (default: 50)
  --categories [list]     Comma-separated list of categories to process
  --help                  Show this help

EXAMPLES:
  npm run populate-db setup
  npm run populate-db ingest niceone --limit 100
  npm run populate-db ingest-all --categories makeup,perfume
  npm run populate-db dry-run jarir
  npm run populate-db report

ENVIRONMENT VARIABLES REQUIRED:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  NICEONE_MERCHANT_ID
  NICEONE_RESTADMIN_ID
  NICEONE_SESSION
`);
};

const parseOptions = (args) => {
  const options = {
    limit: 50,
    categories: null,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--limit':
        options.limit = parseInt(args[i + 1]) || 50;
        i++; // Skip next argument
        break;
      case '--categories':
        options.categories = args[i + 1]?.split(',').map(cat => cat.trim());
        i++; // Skip next argument
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
};

const checkEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   ${env}`));
    console.error('\nPlease check your .env file.');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');
};

const runSetup = async () => {
  console.log('🏗️  Setting up database foundation data...');
  
  try {
    await setupDatabase();
    console.log('\n✅ Database setup complete!');
    console.log('Now you can run: npm run populate-db ingest-all');
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n📋 Please run this SQL manually in your Supabase SQL Editor:');
    console.log('    backend/sql/01_foundation_data.sql');
    console.log('\nThis will create tables and insert stores/categories data.');
    console.log('Then run: npm run populate-db ingest-all');
    process.exit(1);
  }
};

const runIngest = async (store, options) => {
  console.log(`\n🚀 Starting product ingestion for ${store.toUpperCase()}`);
  console.log(`Options:`, options);

  if (!SEARCH_TERMS[store]) {
    console.error(`❌ Unknown store: ${store}`);
    console.error(`Available stores: ${Object.keys(SEARCH_TERMS).join(', ')}`);
    process.exit(1);
  }

  const startTime = Date.now();

  try {
    const result = await ingestStore(store, {
      categoriesFilter: options.categories,
      limit: options.limit,
      dryRun: options.dryRun
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ ${store.toUpperCase()} ingestion completed in ${duration}s`);
    console.log(`   Products processed: ${result.totalProducts}`);
    console.log(`   Products inserted: ${result.totalInserted}`);
    
    if (result.totalProducts > 0) {
      const successRate = ((result.totalInserted / result.totalProducts) * 100).toFixed(1);
      console.log(`   Success rate: ${successRate}%`);
    }

  } catch (error) {
    console.error(`❌ Ingestion failed for ${store}:`, error.message);
    process.exit(1);
  }
};

const runIngestAll = async (options) => {
  console.log('\n🚀 Starting full database population');
  console.log(`Options:`, options);

  const startTime = Date.now();

  try {
    const results = await ingestAllStores({
      categoriesFilter: options.categories,
      limit: options.limit,
      dryRun: options.dryRun
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`\n✅ Full ingestion completed in ${duration}s`);
    console.log('\n📊 Results by store:');
    
    let totalProducts = 0;
    let totalInserted = 0;

    Object.entries(results).forEach(([store, result]) => {
      if (result.error) {
        console.log(`   ${store.toUpperCase()}: ❌ ${result.error}`);
      } else {
        console.log(`   ${store.toUpperCase()}: ${result.totalInserted}/${result.totalProducts} products`);
        totalProducts += result.totalProducts;
        totalInserted += result.totalInserted;
      }
    });

    console.log(`\n📈 Overall statistics:`);
    console.log(`   Total products processed: ${totalProducts}`);
    console.log(`   Total products inserted: ${totalInserted}`);
    
    if (totalProducts > 0) {
      const successRate = ((totalInserted / totalProducts) * 100).toFixed(1);
      console.log(`   Overall success rate: ${successRate}%`);
    }

  } catch (error) {
    console.error('❌ Full ingestion failed:', error.message);
    process.exit(1);
  }
};

const runValidation = async (store) => {
  console.log(`\n🔍 Validating data for ${store.toUpperCase()}...`);
  console.log('Note: Full validation requires implementation of database queries');
  console.log('This is a placeholder for future validation functionality');
  
  // TODO: Implement database validation queries
  // - Check for invalid prices
  // - Find duplicate products
  // - Validate URLs
  // - Generate quality metrics
};

const runReport = async () => {
  console.log('\n📊 Generating data quality report...');
  console.log('Note: Full reporting requires implementation of database analytics');
  console.log('This is a placeholder for future reporting functionality');
  
  // TODO: Implement comprehensive reporting
  // - Products per store/category
  // - Price distribution analysis  
  // - Data quality metrics
  // - Growth trends
};

const main = async () => {
  console.log('🎁 Hada AI Database Population Tool\n');

  if (args.length === 0 || command === 'help') {
    showHelp();
    return;
  }

  checkEnvironment();

  const options = parseOptions(args.slice(1));

  switch (command) {
    case 'setup':
      await runSetup();
      break;

    case 'ingest':
      const store = args[1];
      if (!store) {
        console.error('❌ Store name required. Available: niceone, jarir, floward');
        process.exit(1);
      }
      await runIngest(store, options);
      break;

    case 'ingest-all':
      await runIngestAll(options);
      break;

    case 'validate':
      const validateStore = args[1];
      if (!validateStore) {
        console.error('❌ Store name required for validation');
        process.exit(1);
      }
      await runValidation(validateStore);
      break;

    case 'report':
      await runReport();
      break;

    case 'dry-run':
      const dryRunStore = args[1];
      if (!dryRunStore) {
        console.error('❌ Store name required for dry run');
        process.exit(1);
      }
      options.dryRun = true;
      await runIngest(dryRunStore, options);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled Rejection:', reason);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { main };