const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAPI() {
  try {
    console.log('Testing API endpoints...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('Health response:', healthData);
    
    // Test bills test endpoint
    console.log('\n2. Testing bills test endpoint...');
    const testResponse = await fetch(`${API_BASE_URL}/bills/test`);
    const testData = await testResponse.json();
    console.log('Test response:', testData);
    
    // Test bills endpoint
    console.log('\n3. Testing bills endpoint...');
    const billsResponse = await fetch(`${API_BASE_URL}/bills`);
    const billsData = await billsResponse.json();
    console.log('Bills response:', billsData);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPI(); 