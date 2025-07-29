const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:5000/api';

// Simple fetch function using built-in modules
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function debugEditFunctionality() {
  try {
    console.log('🔍 Starting debug session...');
    
    // 1. Test basic API connectivity
    console.log('\n1️⃣ Testing API connectivity...');
    const healthResponse = await makeRequest(`${API_BASE_URL}/bills/test`);
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    
    // 2. Test PUT endpoint
    console.log('\n2️⃣ Testing PUT endpoint...');
    const testPutResponse = await makeRequest(`${API_BASE_URL}/bills/test-put`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: 'data',
        customerName: 'Test Customer',
        assetCost: 1000
      })
    });
    const testPutData = await testPutResponse.json();
    console.log('Test PUT response:', testPutData);
    
    // 3. Get a list of bills
    console.log('\n3️⃣ Fetching bills...');
    const billsResponse = await makeRequest(`${API_BASE_URL}/bills?limit=1`);
    const billsData = await billsResponse.json();
    console.log('Bills response status:', billsResponse.status);
    console.log('Bills data:', billsData);
    
    if (!billsData.success || !billsData.data || billsData.data.length === 0) {
      console.log('❌ No bills found to test with');
      return;
    }
    
    const testBill = billsData.data[0];
    console.log('✅ Found test bill:', testBill.invoiceNumber);
    console.log('Bill ID:', testBill._id);
    
    // 4. Test the actual edit endpoint
    console.log('\n4️⃣ Testing edit endpoint...');
    const editData = {
      customerName: testBill.customerName + ' (EDITED)',
      customerAddress: testBill.customerAddress,
      manufacturer: testBill.manufacturer,
      assetCategory: testBill.assetCategory,
      model: testBill.model,
      imeiSerialNumber: testBill.imeiSerialNumber,
      assetCost: testBill.assetCost,
      hdbFinance: testBill.hdbFinance,
      // Include all required fields from the original bill
      invoiceNumber: testBill.invoiceNumber,
      taxDetails: testBill.taxDetails,
      amountInWords: testBill.amountInWords,
      taxAmountInWords: testBill.taxAmountInWords,
      status: testBill.status
    };
    
    console.log('Edit data to send:', editData);
    
    const editResponse = await makeRequest(`${API_BASE_URL}/bills/${testBill._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(editData)
    });
    
    console.log('Edit response status:', editResponse.status);
    console.log('Edit response headers:', editResponse.headers);
    
    const responseText = await editResponse.text();
    console.log('Raw response text:', responseText);
    
    try {
      const editResult = JSON.parse(responseText);
      console.log('Parsed edit result:', editResult);
      
      if (editResponse.ok) {
        console.log('✅ Edit functionality is working!');
      } else {
        console.log('❌ Edit functionality failed');
        console.log('Error details:', editResult);
      }
    } catch (parseError) {
      console.log('❌ Failed to parse response as JSON');
      console.log('Raw response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Error in debug session:', error);
    console.error('Error stack:', error.stack);
  }
}

debugEditFunctionality(); 