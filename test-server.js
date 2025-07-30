const https = require('https');
const http = require('http');

const API_BASE_URL = 'http://localhost:5000/api';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testServer() {
  try {
    console.log('🔍 Testing server connectivity...');
    
    // Test 1: Check if server is running
    const testResponse = await makeRequest(`${API_BASE_URL}/bills/test`);
    console.log('✅ Server is running:', testResponse.data.message);
    
    // Test 2: Test PDF generation
    console.log('\n🔍 Testing PDF generation...');
    const pdfResponse = await makeRequest(`${API_BASE_URL}/bills/test-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (pdfResponse.status === 200) {
      console.log('✅ PDF generation test successful:', pdfResponse.data.message);
      console.log('📄 Test PDF path:', pdfResponse.data.pdfPath);
      console.log('📊 File size:', pdfResponse.data.fileSize, 'bytes');
    } else {
      console.log('❌ PDF generation test failed:', pdfResponse.data.message);
      if (pdfResponse.data.error) {
        console.log('❌ Error details:', pdfResponse.data.error);
      }
    }
    
    // Test 3: Get bills list
    console.log('\n🔍 Testing bills list...');
    const billsResponse = await makeRequest(`${API_BASE_URL}/bills?limit=1`);
    
    if (billsResponse.status === 200 && billsResponse.data.success) {
      console.log('✅ Bills API working, found', billsResponse.data.data.length, 'bills');
      if (billsResponse.data.data.length > 0) {
        const bill = billsResponse.data.data[0];
        console.log('📋 Sample bill:', bill.invoiceNumber);
        
        // Test 4: Test download for first bill
        console.log('\n🔍 Testing download for first bill...');
        const downloadResponse = await makeRequest(`${API_BASE_URL}/bills/${bill._id}/download`);
        
        if (downloadResponse.status === 200) {
          console.log('✅ Download successful, file size:', downloadResponse.data.length, 'bytes');
          
          // Check PDF header
          const header = downloadResponse.data.slice(0, 10).toString('ascii');
          console.log('📄 File header:', header);
          
          if (header.startsWith('%PDF-')) {
            console.log('✅ Downloaded file is a valid PDF');
          } else {
            console.log('❌ Downloaded file is not a valid PDF');
          }
        } else {
          console.log('❌ Download failed:', downloadResponse.data.message);
        }
      }
    } else {
      console.log('❌ Bills API failed:', billsResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing server:', error.message);
  }
}

// Run the test
testServer(); 