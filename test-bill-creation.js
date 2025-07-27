const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:5000/api';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
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
          ok: res.statusCode >= 200 && res.statusCode < 300,
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

async function testBillCreation() {
  try {
    console.log('Testing bill creation...');
    
    const testBillData = {
      invoiceNumber: 'TEST-' + Date.now(),
      customerName: 'Test Customer',
      customerAddress: '123 Test Street, Test City',
      manufacturer: 'Test Manufacturer',
      assetCategory: 'Electronics',
      model: 'Test Model',
      imeiSerialNumber: 'TEST123456789',
      assetCost: 10000,
      taxDetails: {
        rate: 8474.58,
        cgst: 763.71,
        sgst: 763.71,
        taxableValue: 6947.16,
        taxRate: 18,
        totalTaxAmount: 1527.42
      },
      amountInWords: 'Ten Thousand Rupees Only',
      taxAmountInWords: 'One Thousand Five Hundred Twenty Seven Rupees Forty Two Paise Only',
      hdbFinance: false,
      status: 'draft'
    };
    
    console.log('Sending bill data:', JSON.stringify(testBillData, null, 2));
    
    const response = await makeRequest(`${API_BASE_URL}/bills`, {
      method: 'POST',
      body: JSON.stringify(testBillData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('Bill created successfully:', result);
      return true;
    } else {
      const errorText = await response.text();
      console.error('Failed to create bill:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error testing bill creation:', error);
    return false;
  }
}

testBillCreation(); 