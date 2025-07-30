const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api';

async function testDownload() {
  try {
    console.log('🔍 Testing download endpoint...');
    
    // First, get a list of bills
    const billsResponse = await fetch(`${API_BASE_URL}/bills?limit=1`);
    const billsData = await billsResponse.json();
    
    if (!billsData.success || !billsData.data || billsData.data.length === 0) {
      console.log('❌ No bills found to test download');
      return;
    }
    
    const bill = billsData.data[0];
    console.log(`🔍 Testing download for bill: ${bill.invoiceNumber}`);
    
    // Test the download endpoint
    const downloadResponse = await fetch(`${API_BASE_URL}/bills/${bill._id}/download`);
    
    console.log(`🔍 Download response status: ${downloadResponse.status}`);
    console.log(`🔍 Content-Type: ${downloadResponse.headers.get('content-type')}`);
    console.log(`🔍 Content-Length: ${downloadResponse.headers.get('content-length')}`);
    console.log(`🔍 Content-Disposition: ${downloadResponse.headers.get('content-disposition')}`);
    
    if (downloadResponse.ok) {
      const buffer = await downloadResponse.buffer();
      console.log(`🔍 Downloaded file size: ${buffer.length} bytes`);
      
      if (buffer.length > 0) {
        // Check if it's a valid PDF
        const header = buffer.slice(0, 10).toString('ascii');
        console.log(`🔍 File header: ${header}`);
        
        if (header.startsWith('%PDF-')) {
          console.log('✅ Downloaded file is a valid PDF');
          
          // Save the file for inspection
          const testFilePath = path.join(__dirname, 'test-download.pdf');
          fs.writeFileSync(testFilePath, buffer);
          console.log(`✅ Test file saved to: ${testFilePath}`);
        } else {
          console.log('❌ Downloaded file is not a valid PDF');
        }
      } else {
        console.log('❌ Downloaded file is empty');
      }
    } else {
      const errorData = await downloadResponse.json();
      console.log('❌ Download failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error testing download:', error);
  }
}

// Run the test
testDownload(); 