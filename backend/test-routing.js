// Test Cases for GiftRouter Refiner Implementation
// Run with: node test-routing.js

const axios = require('axios');

const API_URL = 'http://localhost:5001/api/generate-gift';

const testCases = [
  {
    name: "Test 1: High Budget + Close Relationship",
    description: "Should include FLOWARD due to high budget and close relationship",
    input: {
      budget: "600",
      relationship: "wife",
      category: "", // blank category allows gifts
      enrichWithProducts: false
    },
    expected: {
      shouldHaveFloward: true,
      expectedStores: ["FLOWARD"]
    }
  },
  {
    name: "Test 2: Low Budget + Casual Relationship",  
    description: "Should skip FLOWARD due to low budget and casual context",
    input: {
      budget: "150",
      relationship: "friend", 
      category: "Devices",
      enrichWithProducts: false
    },
    expected: {
      shouldHaveFloward: false,
      expectedStores: ["JARIR", "NICEONE"]
    }
  },
  {
    name: "Test 3: Mid Budget + Close Relationship + Flowers",
    description: "Should include FLOWARD due to close relationship and flower context",
    input: {
      budget: "300-450",
      relationship: "mother",
      description: "Looking for beautiful roses for her birthday",
      enrichWithProducts: false
    },
    expected: {
      shouldHaveFloward: true,
      expectedStores: ["FLOWARD"]
    }
  },
  {
    name: "Test 4: Low Budget + Locked Category",
    description: "Should respect category constraint and skip FLOWARD",
    input: {
      budget: "under 200",
      relationship: "colleague", 
      category: "Perfume",
      enrichWithProducts: false
    },
    expected: {
      shouldHaveFloward: false,
      expectedStores: ["NICEONE"]
    }
  },
  {
    name: "Test 5: High Budget + Romantic Occasion",
    description: "Should include FLOWARD due to high budget and romantic context",
    input: {
      budget: "800",
      relationship: "girlfriend",
      description: "anniversary celebration",
      enrichWithProducts: false
    },
    expected: {
      shouldHaveFloward: true,
      expectedStores: ["FLOWARD"]
    }
  }
];

async function runTest(testCase) {
  try {
    console.log(`\n🧪 ${testCase.name}`);
    console.log(`📝 ${testCase.description}`);
    console.log('📊 Input:', JSON.stringify(testCase.input, null, 2));
    
    const response = await axios.post(API_URL, testCase.input);
    const gifts = response.data.gifts || [];
    
    console.log(`✅ Generated ${gifts.length} gifts`);
    
    // Check store distribution
    const stores = gifts.map(g => (g.store || '').toUpperCase());
    const uniqueStores = [...new Set(stores)];
    const hasFloward = stores.some(store => store.includes('FLOWARD'));
    
    console.log('🏪 Stores:', uniqueStores.join(', '));
    console.log('🌸 Has FLOWARD:', hasFloward);
    
    // Validate expectations
    const passed = hasFloward === testCase.expected.shouldHaveFloward;
    console.log(passed ? '✅ PASSED' : '❌ FAILED');
    
    if (!passed) {
      console.log(`Expected FLOWARD: ${testCase.expected.shouldHaveFloward}, Got: ${hasFloward}`);
    }
    
    // Show sample gifts
    gifts.slice(0, 2).forEach((gift, i) => {
      console.log(`  ${i+1}. ${gift.category} @ ${gift.store}: "${gift.search_context}"`);
    });
    
    return { passed, testCase: testCase.name };
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { passed: false, testCase: testCase.name, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 Running GiftRouter Refiner Test Suite');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Results Summary:');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testCase}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! GiftRouter Refiner is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the routing logic.');
  }
}

// Expected JSON format examples
const expectedJsonExamples = {
  "High Budget + Close Relationship": {
    "gifts": [
      {
        "category": "Gifts",
        "store": "FLOWARD", 
        "search_context": "premium luxury flower bouquet roses elegant exclusive",
        "modifier": "luxury flower arrangement"
      },
      {
        "category": "Premium",
        "store": "FLOWARD",
        "search_context": "luxury premium jewelry elegant boutique sophisticated", 
        "modifier": "luxury jewelry"
      }
    ]
  },
  "Low Budget + Casual": {
    "gifts": [
      {
        "category": "Makeup",
        "store": "NICEONE",
        "search_context": "affordable matte lipstick trendy long-lasting popular",
        "modifier": "trendy lipstick"
      },
      {
        "category": "Devices", 
        "store": "JARIR",
        "search_context": "wireless earbuds bestseller affordable trending",
        "modifier": "wireless earbuds"
      }
    ]
  }
};

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testCases, runTest, expectedJsonExamples };