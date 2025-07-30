const fs = require('fs');
const path = require('path');

// Test PDF files in the uploads directory
const uploadsDir = path.join(__dirname, 'server', 'uploads');

console.log('🔍 Testing PDF files in:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  console.log('❌ Uploads directory does not exist');
  process.exit(1);
}

const files = fs.readdirSync(uploadsDir);
const pdfFiles = files.filter(file => file.endsWith('.pdf'));

console.log(`🔍 Found ${pdfFiles.length} PDF files`);

if (pdfFiles.length === 0) {
  console.log('❌ No PDF files found');
  process.exit(1);
}

// Test each PDF file
pdfFiles.forEach((filename, index) => {
  const filePath = path.join(uploadsDir, filename);
  const stats = fs.statSync(filePath);
  
  console.log(`\n🔍 Testing file ${index + 1}/${pdfFiles.length}: ${filename}`);
  console.log(`   Size: ${stats.size} bytes`);
  
  // Read the first few bytes to check PDF header
  const buffer = fs.readFileSync(filePath, { encoding: null });
  const header = buffer.slice(0, 10).toString('ascii');
  
  console.log(`   Header: ${header}`);
  
  if (header.startsWith('%PDF-')) {
    console.log('   ✅ Valid PDF header');
  } else {
    console.log('   ❌ Invalid PDF header');
  }
  
  // Check if file is not empty
  if (stats.size > 0) {
    console.log('   ✅ File is not empty');
  } else {
    console.log('   ❌ File is empty');
  }
  
  // Check if file size is reasonable (should be at least 1KB for a PDF)
  if (stats.size > 1024) {
    console.log('   ✅ File size is reasonable');
  } else {
    console.log('   ⚠️ File size seems small for a PDF');
  }
});

console.log('\n🔍 PDF test completed'); 