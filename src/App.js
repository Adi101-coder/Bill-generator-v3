import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Eye, Calculator } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Alternative: import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import './App.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Admin Login Component
const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'katiyars1972') {
      localStorage.setItem('adminAuthenticated', 'true');
      onLogin(true);
    } else {
      setError('Invalid password');
    }
  };

  return (
    <div className="admin-login">
      <div className="login-card">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="password-input"
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" className="login-btn">Login</button>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if user is already authenticated from localStorage
    return localStorage.getItem('adminAuthenticated') === 'true';
  });
  const [currentView, setCurrentView] = useState('dashboard');

  if (!isAuthenticated) {
    return <AdminLogin onLogin={setIsAuthenticated} />;
  }

  return (
    <div className="admin-app">
      <nav className="admin-nav">
        <div className="nav-brand">Admin Dashboard</div>
        <div className="nav-links">
          <button 
            className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          {/* Analytics button hidden */}
          {/* <button 
            className={`nav-btn ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentView('analytics')}
          >
            Analytics
          </button> */}
          <button 
            className="nav-btn logout"
            onClick={() => {
              localStorage.removeItem('adminAuthenticated');
              setIsAuthenticated(false);
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main>
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'analytics' && <Analytics />}
      </main>
    </div>
  );
};

// Original Bill Generator Component
const BillGenerator = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const fileInputRef = useRef(null);
  const [isHDBChecked, setIsHDBChecked] = useState(false);
  const [manualSerial, setManualSerial] = useState('');
  const [appliedSerial, setAppliedSerial] = useState('');
  const [isSerialUpdated, setIsSerialUpdated] = useState(false);

  // ESC key functionality to close preview
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showBillPreview) {
        setShowBillPreview(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showBillPreview]);

  const testAPI = async () => {
    try {
      console.log('Testing API connectivity...');
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      console.log('API test response:', data);
      return data.success;
    } catch (error) {
      console.error('API test failed:', error);
      return false;
    }
  };

  // Test API on component mount
  React.useEffect(() => {
    testAPI();
  }, []);

  const numberToWords = (amount) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (amount === 0) return 'Zero Rupees Only';
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return ''; 
    
    const [rupeesStr, paiseStr] = amount.toFixed(2).split('.');
    let rupees = parseInt(rupeesStr, 10); 
    let paise = parseInt(paiseStr, 10); 

    // Function to convert a number to words
    const convertToWords = (num) => {
      if (num === 0) return '';
      if (num < 10) return ones[num];
      if (num < 20) return teens[num - 10];
      if (num < 100) {
        if (num % 10 === 0) return tens[Math.floor(num / 10)];
        return tens[Math.floor(num / 10)] + ' ' + ones[num % 10];
      }
      if (num < 1000) {
        if (num % 100 === 0) return ones[Math.floor(num / 100)] + ' Hundred';
        return ones[Math.floor(num / 100)] + ' Hundred And ' + convertToWords(num % 100);
      }
      return '';
    };

    let resultWords = []; 
    let crores = Math.floor(rupees / 10000000);
    rupees %= 10000000;
    if (crores > 0) {
      const croreWords = convertToWords(crores);
      resultWords.push(croreWords + (crores === 1 ? ' Crore' : ' Crores'));
    }

    let lakhs = Math.floor(rupees / 100000);
    rupees %= 100000;
    if (lakhs > 0) {
      const lakhWords = convertToWords(lakhs);
      resultWords.push(lakhWords + (lakhs === 1 ? ' Lakh' : ' Lakhs'));
    }

    let thousands = Math.floor(rupees / 1000);
    rupees %= 1000;
    if (thousands > 0) {
      const thousandWords = convertToWords(thousands);
      resultWords.push(thousandWords + (thousands === 1 ? ' Thousand' : ' Thousands'));
    }

    if (rupees > 0) {
      const rupeeWords = convertToWords(rupees);
      resultWords.push(rupeeWords);
    }
    
    let finalRupeesPart = resultWords.join(' ').trim();
    if (finalRupeesPart) finalRupeesPart += ' Rupees';

    let paiseWords = '';
    if (paise > 0) {
      const paiseWord = convertToWords(paise);
      paiseWords = paiseWord + (paise === 1 ? ' Paise' : ' Paise');
    }

    if (finalRupeesPart && paiseWords) {
      return finalRupeesPart + ' And ' + paiseWords;
    } else if (finalRupeesPart) {
      return finalRupeesPart + ' Only';
    } else { 
      return 'Zero Rupees Only';
    }
  };

  const formatAmount = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '';
    return num.toLocaleString('en-IN');
  };

  const extractDataFromPDF = async (file) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(' ') + ' ';
      }

      const isHDBDoc = fullText.includes('HDB FINANCIAL SERVICES');
      const isIDFCBankDoc = fullText.includes('IDFC FIRST Bank');
      const isCholaDoc = fullText.includes('CHOLA') || fullText.includes('Chola');
      const isTVSDoc = fullText.includes('TVS CREDIT') || fullText.includes('TVS Credit') || fullText.includes('TVS credit');
      const isBajajDoc = fullText.includes('BAJAJ') || fullText.includes('Bajaj') || fullText.includes('BAJAJ FINSERV') || fullText.includes('Bajaj Finserv');
      const isPoonawallaDoc = fullText.includes('POONAWALLA') || fullText.includes('Poonawalla') || fullText.includes('POONAWALLA FINCORP') || fullText.includes('Poonawalla Fincorp');

      let customerName = '';
      let manufacturer = '';
      let model = '';
      let assetCategory = '';
      let customerAddress = '';
      let serialNumber = '';
      let assetCost = 0;
      let hdbFinance = false;
      let tvsFinance = false;
      if (isHDBDoc) {
        hdbFinance = true;
        const customerMatch = fullText.match(/to our Customer\s+(.+?)\s+\. Pursuant/i);
        customerName = customerMatch ? customerMatch[1].trim() : '';
        
        const brandMatch = fullText.match(/Product Brand\s*:\s*([^\s]+)/i);
        manufacturer = brandMatch ? brandMatch[1].trim() : '';
        
        const modelStart = fullText.indexOf('Product Model :');
        const modelEnd = fullText.indexOf('Scheme Code & EMI');
        if (modelStart !== -1 && modelEnd !== -1 && modelEnd > modelStart) {
          model = fullText.substring(modelStart + 'Product Model :'.length, modelEnd).trim();
        }
        
        const label = 'A. Product Cost';
        const idx = fullText.indexOf(label);
        if (idx !== -1) {
          let i = idx + label.length;
          while (i < fullText.length && !/[0-9]/.test(fullText[i])) i++;
          let numStr = '';
          while (i < fullText.length && /[0-9,\.]/.test(fullText[i])) {
            numStr += fullText[i];
            i++;
          }
          if (numStr) assetCost = parseFloat(numStr.replace(/,/g, ''));
        }
        
        const addressMatch = fullText.match(/Customer Address\s*:\s*([\s\S]*?\d{6})/i);
        customerAddress = addressMatch ? addressMatch[1].trim() : '';
        
        const serialStart = fullText.indexOf('Serial Number');
        const modelNumberStart = fullText.indexOf('Model Number', serialStart + 1);
        if (serialStart !== -1 && modelNumberStart !== -1 && modelNumberStart > serialStart) {
          serialNumber = fullText.substring(serialStart + 'Serial Number'.length, modelNumberStart).trim();
        }
        
        assetCategory = 'Electronics';
      } else if (isIDFCBankDoc) {
        const customerMatch = fullText.match(/loan application of (.+?) has been approved for/i);
        customerName = customerMatch ? `${customerMatch[1].trim()} [IDFC FIRST BANK]` : '';
        
        // Improved asset category extraction for IDFC bills
        const assetCategoryMatch = fullText.match(/Asset Category:?[ \t]*([A-Za-z\s]+?)(?=\s*(?:D\s*Model Number|Model Number|Serial Number|Asset Cost|$))/i);
        if (assetCategoryMatch) {
          assetCategory = assetCategoryMatch[1].trim();
          // Clean up any trailing 'D' that might be included
          if (assetCategory.endsWith('D')) {
            assetCategory = assetCategory.slice(0, -1).trim();
          }
        } else {
          // Fallback: try to find asset category between "Asset Category" and "Model Number"
          const assetCatStartIndex = fullText.indexOf('Asset Category');
          const modelNumStartIndex = fullText.indexOf('Model Number', assetCatStartIndex);
          
          if (assetCatStartIndex !== -1 && modelNumStartIndex !== -1 && modelNumStartIndex > assetCatStartIndex) {
            const textStartIndex = assetCatStartIndex + 'Asset Category'.length;
            const textEndIndex = modelNumStartIndex;
            const rawExtractedText = fullText.substring(textStartIndex, textEndIndex);
            assetCategory = rawExtractedText.trim();
            // Clean up any trailing 'D' that might be included
            if (assetCategory.endsWith('D')) {
              assetCategory = assetCategory.slice(0, -1).trim();
            }
          }
        }
        
          manufacturer = '';
        
        // Improved address extraction for IDFC bills
        let idfcAddressExtracted = false;
        // 1. Try the current method (after the known paragraph)
        const para = "The required formalities with the customer have been completed and hence we request you to collect the down payment and only deliver the product at the following address post device validation is completed and final DA is received.";
        const paraIdx = fullText.indexOf(para);
        if (paraIdx !== -1) {
          const afterPara = fullText.slice(paraIdx);
          const addressIdx = afterPara.search(/Customer Address[:]?/i);
          if (addressIdx !== -1) {
            const afterAddress = afterPara.slice(addressIdx + 'Customer Address:'.length);
            // Try to end at 'Thanking you', 'Contact', or double newline
            const endIdx = afterAddress.search(/(Thanking you|Contact|\n\n|$)/i);
            if (endIdx !== -1) {
              customerAddress = afterAddress.slice(0, endIdx).trim();
            } else {
              customerAddress = afterAddress.trim();
            }
            idfcAddressExtracted = !!customerAddress;
          }
        }
        // 2. Fallback: Try direct regex for Customer Address
        if (!idfcAddressExtracted) {
          const addrMatch = fullText.match(/Customer Address:?\s*([\s\S]*?)(?:Thanking you|Contact|\n\n|$)/i);
          if (addrMatch && addrMatch[1]) {
            customerAddress = addrMatch[1].replace(/\s+/g, ' ').trim();
            idfcAddressExtracted = !!customerAddress;
          }
        }
        // 3. Fallback: Try generic Address
        if (!idfcAddressExtracted) {
          const addrMatch = fullText.match(/Address:?\s*([\s\S]*?)(?:Thanking you|Contact|\n\n|$)/i);
          if (addrMatch && addrMatch[1]) {
            customerAddress = addrMatch[1].replace(/\s+/g, ' ').trim();
            idfcAddressExtracted = !!customerAddress;
          }
        }
        // 4. Debug log if still not found
        if (!idfcAddressExtracted) {
          console.warn('IDFC Address extraction failed. PDF text snippet:', fullText.slice(0, 1000));
        }

        // Improved model extraction for IDFC bills (robust, independent)
        let idfcModelExtracted = false;
        // 1. Try main regex
        let modelMatch = fullText.match(/Model Number:?[ \t]*([^\n\r]+?)(?=\s*(?:Scheme Name|Serial Number|Asset Category|Asset Cost|\n|\r|$))/i);
        if (modelMatch && modelMatch[1]) {
          model = modelMatch[1].trim();
          if (model.endsWith('E')) model = model.slice(0, -1).trim();
          idfcModelExtracted = !!model;
        }
        // 2. Fallback: Find between Model Number and next field
        if (!idfcModelExtracted) {
          const modelStartIndex = fullText.indexOf('Model Number');
          const nextFields = ['Scheme Name', 'Serial Number', 'Asset Category', 'Asset Cost', '\n', '\r'];
          let modelEndIndex = -1;
          for (let field of nextFields) {
            const idx = fullText.indexOf(field, modelStartIndex + 1);
            if (idx !== -1 && (modelEndIndex === -1 || idx < modelEndIndex)) {
              modelEndIndex = idx;
            }
          }
          if (modelStartIndex !== -1 && modelEndIndex !== -1 && modelEndIndex > modelStartIndex) {
            const textStartIndex = modelStartIndex + 'Model Number'.length;
            const rawExtractedText = fullText.substring(textStartIndex, modelEndIndex);
            model = rawExtractedText.trim();
            if (model.endsWith('E')) model = model.slice(0, -1).trim();
            idfcModelExtracted = !!model;
          }
        }
        // 3. Fallback: Try generic Model:
        if (!idfcModelExtracted) {
          const genericModelMatch = fullText.match(/Model:?\s*([^\n\r]+?)(?=\s*(?:Scheme Name|Serial Number|Asset Category|Asset Cost|\n|\r|$))/i);
          if (genericModelMatch && genericModelMatch[1]) {
            model = genericModelMatch[1].trim();
            if (model.endsWith('E')) model = model.slice(0, -1).trim();
            idfcModelExtracted = !!model;
          }
        }
        // 4. Debug log if still not found
        if (!idfcModelExtracted) {
          console.warn('IDFC Model extraction failed. PDF text snippet:', fullText.slice(0, 1000));
        }
        
        const serialNumberMatch = fullText.match(/Serial Number:?[ \t]*([^ \t\n]+)/i);
        serialNumber = serialNumberMatch ? serialNumberMatch[1].trim() : '';
        
        const assetCostMatch = fullText.match(/Cost Of Product[\s:]*([\d,\.]+)/i);
        if (assetCostMatch) {
          assetCost = parseFloat(assetCostMatch[1].replace(/[^0-9.]/g, ''));
        }
      } else if (isCholaDoc) {
        const customerMatch = fullText.match(/Customer Name:?[ \t]*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
        customerName = customerMatch ? customerMatch[1].trim() : '';
        customerName = customerName.replace(/\s+Customer$/, '').trim();
        
        const manufacturerMatch = fullText.match(/Manufacturer:?[ \t]*([^ \t\n]+)/i);
        manufacturer = manufacturerMatch ? manufacturerMatch[1].trim() : '';
        
        const addressMatch = fullText.match(/(?:Customer )?Address:?[ \t]*([\s\S]*?\d{6})/i);
        customerAddress = addressMatch ? addressMatch[1].trim() : '';
        customerAddress = customerAddress.replace(/^(?:Customer )?Address:?[ \t]*(.*)$/i, '$1').trim();
        
        const rawAssetCategoryMatch = fullText.match(/Asset Category:?[ \t]*([A-Za-z\s]+?)(?=\s*(?:Sub-Category|Variant|\bModel\b|\bSerial Number\b|\bAsset Cost\b|$))/i);
        assetCategory = rawAssetCategoryMatch ? rawAssetCategoryMatch[1].trim() : '';
        if (assetCategory.endsWith('D')) assetCategory = assetCategory.slice(0, -1).trim();
        
        const modelMatch = fullText.match(/Model:?\s*([^\n\r]+?)(?=\s*Asset Category|\n|\r)/i);
        model = modelMatch ? modelMatch[1].trim() : '';
        
        const serialNumberMatch = fullText.match(/Serial Number:?[ \t]*([^ \t\n]+)/i);
        serialNumber = serialNumberMatch ? serialNumberMatch[1].trim() : '';
        
        const assetCostMatch = fullText.match(/A\. Asset Cost[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
        if (assetCostMatch) {
          assetCost = parseFloat(assetCostMatch[1].replace(/[^0-9.]/g, ''));
        }
      } else if (isTVSDoc) {
        tvsFinance = true;
        
        console.log('🔍 TVS CREDIT DETECTED - Starting extraction...');
        console.log('🔍 Complete PDF text length:', fullText.length);
        console.log('🔍 Complete PDF text:');
        console.log('='.repeat(80));
        console.log(fullText);
        console.log('='.repeat(80));
        
        // Find the key line to start extraction
        const keyLine = "we  are disbursing the following amount in your favour.  Kindly arrange the delivery of the Product to the customer at the below address only.";
        const keyLineIndex = fullText.indexOf(keyLine);
        console.log('🔍 Key line found at index:', keyLineIndex);
        
        if (keyLineIndex === -1) {
          console.log('❌ Key line not found in PDF text');
          console.log('🔍 Let me search for partial matches...');
          
          // Try to find partial matches
          const partialMatches = [
            'disbursing the following amount',
            'arrange the delivery of the Product',
            'Customer Name:',
            'Customer Address:',
            'Product Brand:',
            'Product Model:'
          ];
          
          partialMatches.forEach(match => {
            const index = fullText.indexOf(match);
            console.log(`🔍 "${match}" found at index: ${index}`);
          });
          
          return;
        }
        
        // Customer Name extraction - NEXT TO the key line until "Mobile Number:"
        const customerNameStart = fullText.indexOf('Customer Name:', keyLineIndex);
        const mobileNumberStart = fullText.indexOf('Mobile Number:', customerNameStart);
        
        console.log('🔍 Customer Name boundaries:', { customerNameStart, mobileNumberStart });
        
        if (customerNameStart !== -1 && mobileNumberStart !== -1 && mobileNumberStart > customerNameStart) {
          const customerNameText = fullText.substring(customerNameStart + 'Customer Name:'.length, mobileNumberStart);
          customerName = customerNameText.trim();
          console.log('🔍 Customer Name extracted (boundary method):', customerName);
          console.log('🔍 Raw Customer Name text:', JSON.stringify(customerNameText));
        } else {
          console.log('❌ Customer Name boundaries not found');
          console.log('🔍 Customer Name start index:', customerNameStart);
          console.log('🔍 Mobile Number start index:', mobileNumberStart);
        }
        console.log('🔍 Final Customer Name:', customerName);
        
        // Customer Address extraction - AFTER Mobile Number until "Product Brand:"
        const addressStart = fullText.indexOf('Customer Address:', mobileNumberStart);
        const productBrandStart = fullText.indexOf('Product Brand:', addressStart);
        
        console.log('🔍 Address boundaries:', { addressStart, productBrandStart });
        
        if (addressStart !== -1 && productBrandStart !== -1 && productBrandStart > addressStart) {
          const addressText = fullText.substring(addressStart + 'Customer Address:'.length, productBrandStart);
          customerAddress = addressText.trim();
          console.log('🔍 Customer Address extracted (boundary method):', customerAddress);
          console.log('🔍 Raw Address text:', JSON.stringify(addressText));
        } else {
          console.log('❌ Address boundaries not found');
          console.log('🔍 Address start index:', addressStart);
          console.log('🔍 Product Brand start index:', productBrandStart);
        }
        console.log('🔍 Final Customer Address:', customerAddress);
        
        // Product Brand extraction - from "Product Brand:" until "Product Catg & Make:"
        const productBrandEnd = fullText.indexOf('Product Catg & Make:', productBrandStart);
        let productBrand = ''; // Declare productBrand outside the if block
        
        console.log('🔍 Product Brand boundaries:', { productBrandStart, productBrandEnd });
        
        if (productBrandStart !== -1 && productBrandEnd !== -1 && productBrandEnd > productBrandStart) {
          const productBrandText = fullText.substring(productBrandStart + 'Product Brand:'.length, productBrandEnd);
          productBrand = productBrandText.trim();
          console.log('🔍 Product Brand extracted:', productBrand);
          
          // Product Catg & Make extraction - from "Product Catg & Make:" until next heading
          const productCatgStart = productBrandEnd;
          const nextHeadingAfterCatg = fullText.indexOf('Product Model:', productCatgStart);
          
          console.log('🔍 Product Catg & Make boundaries:', { productCatgStart, nextHeadingAfterCatg });
          
          if (productCatgStart !== -1 && nextHeadingAfterCatg !== -1 && nextHeadingAfterCatg > productCatgStart) {
            const productCatgText = fullText.substring(productCatgStart + 'Product Catg & Make:'.length, nextHeadingAfterCatg);
            const productCatg = productCatgText.trim();
            console.log('🔍 Product Catg & Make extracted:', productCatg);
            
            // Combine Product Brand + Product Catg & Make for asset category
            assetCategory = `${productBrand} ${productCatg}`.trim();
            console.log('🔍 Combined Asset Category:', assetCategory);
          } else {
            console.log('❌ Product Catg & Make boundaries not found');
          }
        } else {
          console.log('❌ Product Brand boundaries not found');
        }
        
        // Product Model extraction - from "Product Model:" until "Scheme Code & EMI"
        const productModelStart = fullText.indexOf('Product Model:', productBrandStart);
        const schemeCodeStart = fullText.indexOf('Scheme Code & EMI:', productModelStart);
        
        console.log('🔍 Product Model boundaries:', { productModelStart, schemeCodeStart });
        
        if (productModelStart !== -1 && schemeCodeStart !== -1 && schemeCodeStart > productModelStart) {
          const modelText = fullText.substring(productModelStart + 'Product Model:'.length, schemeCodeStart);
          model = modelText.trim();
          console.log('🔍 Product Model extracted:', model);
        } else {
          console.log('❌ Product Model boundaries not found');
        }
        
        // Product Cost extraction
        const productCostMatch = fullText.match(/Product Cost:?[ \t]*([\d,\.]+)/i);
        if (productCostMatch) {
          assetCost = parseFloat(productCostMatch[1].replace(/[^0-9.]/g, ''));
          console.log('🔍 Product Cost:', assetCost);
        } else {
          console.log('🔍 Product Cost: Not found');
        }
        
        // Set manufacturer as Product Brand
        manufacturer = productBrand;
        console.log('🔍 Manufacturer (set to Product Brand):', manufacturer);
        
        console.log('🔍 TVS CREDIT EXTRACTION COMPLETE');
        console.log('🔍 Final extracted data:', {
          customerName,
          customerAddress,
          manufacturer,
          assetCategory,
          model,
          assetCost,
          tvsFinance
        });
      } else if (isBajajDoc) {
        console.log('🔍 BAJAJ FINSERV DETECTED - Starting extraction...');
        console.log('🔍 Complete PDF text length:', fullText.length);
        
        // 1. Customer Name Extraction
        // Look for: "loan application of Mr/Miss/Mrs. [NAME] has been approved by Bajaj Finance"
        const customerNameMatch = fullText.match(/loan application of (?:Mr\/Miss\/Mrs\.|Mr|Miss|Mrs)\s+(.+?)\s+has been approved by Bajaj Finance/i);
        if (customerNameMatch) {
          customerName = customerNameMatch[1].trim();
          console.log('🔍 Customer Name extracted:', customerName);
        } else {
          console.log('❌ Customer Name not found');
        }
        
        // 2. Asset Category Extraction
        // Look for: "Asset Category" cell
        const assetCategoryMatch = fullText.match(/Asset Category[\s\S]*?([A-Z\s]+?)(?=\s*(?:OEM Asset Category|Manufacturer|Model|EAN|$))/i);
        if (assetCategoryMatch) {
          assetCategory = assetCategoryMatch[1].trim();
          console.log('🔍 Asset Category extracted:', assetCategory);
        } else {
          console.log('❌ Asset Category not found');
        }
        
        // 3. Manufacturer Extraction
        // Look for: "Manufacturer" cell
        const manufacturerMatch = fullText.match(/Manufacturer[\s\S]*?([A-Z\s]+?)(?=\s*(?:Model|EAN|Scheme|$))/i);
        if (manufacturerMatch) {
          manufacturer = manufacturerMatch[1].trim();
          console.log('🔍 Manufacturer extracted:', manufacturer);
        } else {
          console.log('❌ Manufacturer not found');
        }
        
        // 4. Model Extraction
        // Look for: "Model" cell
        const modelMatch = fullText.match(/Model[\s\S]*?([A-Z0-9\-\s]+?)(?=\s*(?:EAN Number|Scheme Code|Product Price|$))/i);
        if (modelMatch) {
          model = modelMatch[1].trim();
          console.log('🔍 Model extracted:', model);
        } else {
          console.log('❌ Model not found');
        }
        
        // 5. Product Price (Asset Cost) Extraction
        // Look for: "Product Price" cell
        const productPriceMatch = fullText.match(/Product Price[\s\S]*?([\d,\.]+)/i);
        if (productPriceMatch) {
          assetCost = parseFloat(productPriceMatch[1].replace(/[^0-9.]/g, ''));
          console.log('🔍 Product Price extracted:', assetCost);
        } else {
          console.log('❌ Product Price not found');
        }
        
        // 6. Customer Address Extraction
        // Look for: "Address of the customer for delivery" on page 2
        const addressMatch = fullText.match(/Address of the customer for delivery[\s:]*(.+?)(?=Mobile Number|Delivery Address|$)/is);
        if (addressMatch) {
          customerAddress = addressMatch[1].trim();
          // Clean up the address - remove extra whitespace
          customerAddress = customerAddress.replace(/\s+/g, ' ').trim();
          console.log('🔍 Customer Address extracted:', customerAddress);
        } else {
          // Fallback: Try to find address after "Address" keyword
          const fallbackAddressMatch = fullText.match(/(?:Customer )?Address[\s:]*(.+?\d{6})/is);
          if (fallbackAddressMatch) {
            customerAddress = fallbackAddressMatch[1].trim().replace(/\s+/g, ' ');
            console.log('🔍 Customer Address extracted (fallback):', customerAddress);
          } else {
            console.log('❌ Customer Address not found');
          }
        }
        
        // 7. Serial Number - will be provided manually (like HDB)
        serialNumber = '';
        console.log('🔍 Serial Number: Will be provided manually');
        
        console.log('🔍 BAJAJ FINSERV EXTRACTION COMPLETE');
        console.log('🔍 Final extracted data:', {
          customerName,
          customerAddress,
          manufacturer,
          assetCategory,
          model,
          assetCost,
          serialNumber: 'Manual entry required'
        });
      } else if (isPoonawallaDoc) {
        console.log('🔍 POONAWALLA FINCORP DETECTED - Starting extraction...');
        
        // Poonawalla extraction logic (similar pattern to other finance companies)
        const customerMatch = fullText.match(/Customer Name:?[ \t]*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
        customerName = customerMatch ? customerMatch[1].trim() : '';
        customerName = customerName.replace(/\s+Customer$/, '').trim();
        
        const manufacturerMatch = fullText.match(/Manufacturer:?[ \t]*([^ \t\n]+)/i);
        manufacturer = manufacturerMatch ? manufacturerMatch[1].trim() : '';
        
        const addressMatch = fullText.match(/(?:Customer )?Address:?[ \t]*([\s\S]*?\d{6})/i);
        customerAddress = addressMatch ? addressMatch[1].trim() : '';
        customerAddress = customerAddress.replace(/^(?:Customer )?Address:?[ \t]*(.*)$/i, '$1').trim();
        
        const rawAssetCategoryMatch = fullText.match(/Asset Category:?[ \t]*([A-Za-z\s]+?)(?=\s*(?:Sub-Category|Variant|\bModel\b|\bSerial Number\b|\bAsset Cost\b|$))/i);
        assetCategory = rawAssetCategoryMatch ? rawAssetCategoryMatch[1].trim() : '';
        if (assetCategory.endsWith('D')) assetCategory = assetCategory.slice(0, -1).trim();
        
        const modelMatch = fullText.match(/Model:?\s*([^\n\r]+?)(?=\s*Asset Category|\n|\r)/i);
        model = modelMatch ? modelMatch[1].trim() : '';
        
        const serialNumberMatch = fullText.match(/Serial Number:?[ \t]*([^ \t\n]+)/i);
        serialNumber = serialNumberMatch ? serialNumberMatch[1].trim() : '';
        
        const assetCostMatch = fullText.match(/(?:Asset Cost|Product Cost)[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
        if (assetCostMatch) {
          assetCost = parseFloat(assetCostMatch[1].replace(/[^0-9.]/g, ''));
        }
        
        console.log('🔍 POONAWALLA FINCORP EXTRACTION COMPLETE');
      } else {
        const customerMatch = fullText.match(/Customer Name:?[ \t]*([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/i);
        customerName = customerMatch ? customerMatch[1].trim() : '';
        customerName = customerName.replace(/\s+Customer$/, '').trim();
        
        const manufacturerMatch = fullText.match(/Manufacturer:?[ \t]*([^ \t\n]+)/i);
        manufacturer = manufacturerMatch ? manufacturerMatch[1].trim() : '';
        
        const addressMatch = fullText.match(/(?:Customer )?Address:?[ \t]*([\s\S]*?\d{6})/i);
        customerAddress = addressMatch ? addressMatch[1].trim() : '';
        customerAddress = customerAddress.replace(/^(?:Customer )?Address:?[ \t]*(.*)$/i, '$1').trim();
        
        const rawAssetCategoryMatch = fullText.match(/Asset Category:?[ \t]*([A-Za-z\s]+?)(?=\s*(?:Sub-Category|Variant|\bModel\b|\bSerial Number\b|\bAsset Cost\b|$))/i);
        assetCategory = rawAssetCategoryMatch ? rawAssetCategoryMatch[1].trim() : '';
        if (assetCategory.endsWith('D')) assetCategory = assetCategory.slice(0, -1).trim();
        
        const modelMatch = fullText.match(/Model:?\s*([^\n\r]+?)(?=\s*Asset Category|\n|\r)/i);
        model = modelMatch ? modelMatch[1].trim() : '';
        
        const serialNumberMatch = fullText.match(/Serial Number:?[ \t]*([^ \t\n]+)/i);
        serialNumber = serialNumberMatch ? serialNumberMatch[1].trim() : '';
        
        const assetCostMatch = fullText.match(/A\. Asset Cost[^\d]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i);
        if (assetCostMatch) {
          assetCost = parseFloat(assetCostMatch[1].replace(/[^0-9.]/g, ''));
        }
      }

      const extractedData = {
        customerName,
        customerAddress,
        manufacturer,
        assetCategory,
        model,
        imeiSerialNumber: serialNumber,
        date: new Date().toISOString().split('T')[0],
        assetCost,
        hdbFinance,
        tvsFinance,
        bajajFinance: isBajajDoc,
        poonawallaFinance: isPoonawallaDoc
      };

      // Debug logging for IDFC bills
      if (isIDFCBankDoc) {
        console.log('IDFC Bill Extraction Debug:', {
          customerName,
          assetCategory,
          model,
          manufacturer,
          serialNumber,
          assetCost
        });
      }

      setExtractedData(extractedData);
      
      // Save to database
      if (invoiceNumber) {
        await saveBillToDatabase(extractedData, invoiceNumber);
      }
    } catch (error) {
      console.error('Error extracting PDF data:', error);
      alert('Error extracting data from PDF. Please make sure the PDF is properly formatted.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveBillToDatabase = async (data, invoiceNum) => {
    try {
      const taxDetails = calculateTaxDetails(data.assetCost, data.assetCategory);
      const amountInWords = numberToWords(data.assetCost);
      const taxAmountInWords = numberToWords(parseFloat(taxDetails.totalTaxAmount));

      // Ensure required fields are not empty
      const billData = {
        invoiceNumber: invoiceNum,
        customerName: data.customerName || 'Unknown Customer',
        customerAddress: data.customerAddress || 'No Address',
        manufacturer: data.manufacturer || 'Unknown Manufacturer',
        assetCategory: data.assetCategory || 'Other',
        model: data.model || 'Unknown Model',
        imeiSerialNumber: data.imeiSerialNumber || '',
        assetCost: data.assetCost || 0,
        taxDetails,
        amountInWords,
        taxAmountInWords,
        hdbFinance: data.hdbFinance || false,
        tvsFinance: data.tvsFinance || false,
        bajajFinance: data.bajajFinance || false,
        poonawallaFinance: data.poonawallaFinance || false,
        status: 'generated',
        date: new Date().toISOString().split('T')[0],
        product: `${data.manufacturer || 'Unknown'} ${data.assetCategory || 'Other'} - ${data.model || 'Unknown'}`,
        amount: data.assetCost || 0
      };

      console.log('Attempting to save bill to:', `${API_BASE_URL}/bills`);
      console.log('Bill data:', billData);
      
      const response = await fetch(`${API_BASE_URL}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('Bill saved to database successfully:', result);
        return result.data; // Return the saved bill data with _id
      } else {
        const errorText = await response.text();
        console.error('Failed to save bill to database. Status:', response.status, 'Error:', errorText);
        return null;
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      return false;
    }
  };

  const generatePDFForBill = async (billId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bills/${billId}/generate-pdf`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('PDF generated successfully:', result);
        return true;
      } else {
        console.error('Failed to generate PDF');
        return false;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      return false;
    }
  };

  const handlePreviewBill = async () => {
    if (!extractedData || !invoiceNumber.trim()) return;
    
    // Show preview immediately
    setShowBillPreview(true);
    
    // Save to database and generate PDF in the background
    try {
      const savedBill = await saveBillToDatabase(extractedData, invoiceNumber);
      if (savedBill && savedBill._id) {
        console.log('Bill saved to database, generating PDF...');
        await generatePDFForBill(savedBill._id);
        console.log('PDF generated successfully');
      } else {
        console.log('Failed to save bill to database, but preview is still shown');
      }
    } catch (error) {
      console.error('Error in preview process:', error);
    }
  };

  const handlePrintDownload = async () => {
    if (!extractedData || !invoiceNumber.trim()) return;
    
    // Print immediately
    handlePrint();
    
    // Save to database and generate PDF in the background
    try {
      const savedBill = await saveBillToDatabase(extractedData, invoiceNumber);
      if (savedBill && savedBill._id) {
        console.log('Bill saved to database, generating PDF...');
        await generatePDFForBill(savedBill._id);
        console.log('PDF generated successfully');
      } else {
        console.log('Failed to save bill to database, but print/download still works');
      }
    } catch (error) {
      console.error('Error in print/download process:', error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      extractDataFromPDF(file);
    } else {
      alert('Please upload a PDF file');
    }
  };

  const calculateTaxDetails = (assetCost, assetCategory) => {
    // Always use 18% GST (9% CGST + 9% SGST) regardless of product category
    const rate = assetCost / 1.18;
    const cgst = (assetCost - (assetCost / 1.18)) / 2;
    const sgst = cgst;
    const taxableValue = assetCost - (sgst + cgst);
    const taxRate = 9;
    const totalTaxAmount = sgst + cgst;
    
    return {
      rate: rate.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      taxableValue: taxableValue.toFixed(2),
      taxRate,
      totalTaxAmount: totalTaxAmount.toFixed(2)
    };
  };

  const generateBillHTML = () => {
    if (!extractedData || !invoiceNumber) return '';
    const taxDetails = calculateTaxDetails(extractedData.assetCost, extractedData.assetCategory);
    const amountInWords = numberToWords(extractedData.assetCost);
    const taxAmountInWords = numberToWords(parseFloat(taxDetails.totalTaxAmount));

    // Always use appliedSerial if HDB is checked, else use extracted value
    const serialToDisplay = (isHDBChecked ? appliedSerial : extractedData.imeiSerialNumber) || '';

    return `
    <div style="width: 100%; max-width: 210mm; height: 297mm; margin: 0 auto; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; box-sizing: border-box; padding: 8mm; overflow: hidden;">
      <div style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:8px;">Tax Invoice</div>
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 0; table-layout: fixed;">
        <tr>
                      <td rowspan="8" style="border:1px solid #000; padding:10px; width:40%; vertical-align:top; font-weight:bold; font-size:9px; word-wrap: break-word; overflow-wrap: break-word;">
            KATIYAR ELECTRONICS<br>
            H.I.G.J-33 VISHWABANK BARRA<br>
            KARRAHI<br>
            KANPUR NAGAR<br>
            GSTIN/UIN: 09AMTPK9751D1ZH<br>
            State Name: Uttar Pradesh, Code: 09<br>
            E-Mail: katiyars952@gmail.com<br>
            <div style="margin-left: -8px; margin-right: -8px;">
              <hr style="border: none; border-top: 1px solid #000; width: 100%; margin: 0; padding: 0;" />
            </div>
            <b>Consignee (Ship to)</b><br>
            <span style="word-wrap: break-word; overflow-wrap: break-word; display: block;">${extractedData.customerName}</span>
            <span style="word-wrap: break-word; overflow-wrap: break-word; display: block;">${extractedData.customerAddress}</span><br>
            <div style="margin-left: -8px; margin-right: -8px;">
              <hr style="border: none; border-top: 1px solid #000; width: 100%; margin: 0; padding: 0;" />
            </div>
            <b>Buyer (Bill to)</b><br>
            <span style="word-wrap: break-word; overflow-wrap: break-word; display: block;">${extractedData.customerName}</span>
            <span style="word-wrap: break-word; overflow-wrap: break-word; display: block;">${extractedData.customerAddress}</span>
          </td>
                      <td style="border:1px solid #000; padding:10px; font-weight:bold; width:50%; font-size:9px; text-align:center;">Invoice No.<div style='height:6px;'></div><div>${invoiceNumber}</div></td>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; width:50%; font-size:9px; text-align:center;">Dated<div style='height:6px;'></div><div>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></td>
        </tr>
        <tr>
                      <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;">Delivery Note<div style='height:6px;'></div></td>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;"></td>
          </tr>
          <tr>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;">Buyer's Order No.<div style='height:6px;'></div></td>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;">Dated<div style='height:6px;'></div></td>
          </tr>
          <tr>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;">Dispatch Doc No.<div style='height:6px;'></div></td>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;">Delivery Note Date<div style='height:6px;'></div></td>
          </tr>
          <tr>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;">Dispatched through<div style='height:6px;'></div></td>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; font-size:9px; text-align:center; width:50%;">Destination<div style='height:6px;'></div></td>
          </tr>
          <tr>
            <td colspan="2" style="border:1px solid #000; padding:10px; font-size:9px;"></td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-top:0; margin-bottom: 0;">
                  <tr style="background-color: #f0f0f0;">
            <td style="border: 1px solid #000; text-align: center; width: 4%; padding: 3px; font-size:9px;"><strong>Sl</strong></td>
            <td style="border: 1px solid #000; text-align: center; width: 40%; padding: 3px; font-size:9px;"><strong>Description of Goods</strong></td>
            <td style="border: 1px solid #000; text-align: center; width: 12%; padding: 3px; font-size:9px;"><strong>HSN/SAC</strong></td>
            <td style="border: 1px solid #000; text-align: center; width: 8%; padding: 3px; font-size:9px;"><strong>Quantity</strong></td>
            <td style="border: 1px solid #000; text-align: center; width: 12%; padding: 3px; font-size:9px;"><strong>Rate</strong></td>
            <td style="border: 1px solid #000; text-align: center; width: 4%; padding: 3px; font-size:9px;"><strong>per</strong></td>
            <td style="border: 1px solid #000; text-align: center; width: 20%; padding: 3px; font-size:9px;"><strong>Amount</strong></td>
          </tr>
        <tr>
                      <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;">1</td>
            <td style="border: 1px solid #000; vertical-align: top; padding: 6px; font-size:9px; word-wrap: break-word; overflow-wrap: break-word;">
              <strong style="word-wrap: break-word; overflow-wrap: break-word; display: block;">${extractedData.manufacturer} ${extractedData.assetCategory}</strong><br><br>
              <strong>Model No:</strong> <span style="word-wrap: break-word; overflow-wrap: break-word;">${extractedData.model}</span><br>
              ${serialToDisplay ? `<b>Serial Number:</b> <span style="word-wrap: break-word; overflow-wrap: break-word;">${serialToDisplay}</span><br>` : ''}
              <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                <div><strong>CGST</strong></div>
                <div>${formatAmount(Number(taxDetails.cgst))}</div>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0;">
                <div><strong>SGST</strong></div>
                <div>${formatAmount(Number(taxDetails.sgst))}</div>
              </div>
              <div style="height: 280px;"></div>
            </td>
            <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;"></td>
            <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;">1 PCS</td>
            <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;">${formatAmount(Number(taxDetails.rate))}</td>
            <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;">PCS</td>
            <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;">${formatAmount(Number(taxDetails.rate))}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; text-align: right; padding: 3px; font-size:9px;" colspan="6"><strong>Total</strong></td>
            <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;"><strong>₹ ${formatAmount(Number(extractedData.assetCost))}</strong></td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border-left: 1.5px solid #000; border-right: 1.5px solid #000; margin: 0;">
        <tr>
          <td style="border-left: 1px solid #000; border-right: none; border-top: none; border-bottom: none; width: 1%;"></td>
          <td style="border: none; font-size:8px; padding: 4px;">
            <strong>Amount Chargeable (in words)</strong><br>
            <strong>INR ${amountInWords}</strong>
          </td>
          <td style="border-right: 1px solid #000; border-left: none; border-top: none; border-bottom: none; width: 1%;"></td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 4px;">
        <tr style="background-color: #f0f0f0;">
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" rowspan="2"><strong>HSN/SAC</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" rowspan="2"><strong>Taxable Value</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" colspan="2"><strong>Central Tax</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" colspan="2"><strong>State Tax</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;" rowspan="2"><strong>Total Tax Amount</strong></td>
        </tr>
        <tr style="background-color: #f0f0f0;">
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Rate</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Amount</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Rate</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Amount</strong></td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.taxableValue))}</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${taxDetails.taxRate}%</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.cgst))}</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${taxDetails.taxRate}%</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.sgst))}</td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;">${formatAmount(Number(taxDetails.totalTaxAmount))}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>Total</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.taxableValue))}</strong></td>
          <td style="border: 1px solid #000; padding: 2px; font-size:8px;"></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.cgst))}</strong></td>
          <td style="border: 1px solid #000; padding: 2px; font-size:8px;"></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.sgst))}</strong></td>
          <td style="border: 1px solid #000; text-align: center; padding: 2px; font-size:8px;"><strong>${formatAmount(Number(taxDetails.totalTaxAmount))}</strong></td>
        </tr>
        <tr>
          <td colspan="7" style="border-left: 1.5px solid #000; border-right: 1.5px solid #000; border-top: none; border-bottom: none; font-size:8px; padding: 4px 0; text-align:center;">
            <strong>Tax Amount (in words): INR ${taxAmountInWords}</strong>
          </td>
        </tr>
      </table>
      ${extractedData.hdbFinance ? `<tr><td colspan="6" style="font-weight:bold; text-align:center; color:#1a237e; font-size:10px;">FINANCE BY HDBFS</td></tr>` : ''}
      ${extractedData.tvsFinance ? `<tr><td colspan="6" style="font-weight:bold; text-align:center; color:#1a237e; font-size:10px;">FINANCE BY TVS CREDIT</td></tr>` : ''}
      ${extractedData.bajajFinance ? `<tr><td colspan="6" style="font-weight:bold; text-align:center; color:#1a237e; font-size:10px;">FINANCE BY BAJAJ FINSERV</td></tr>` : ''}
      ${extractedData.poonawallaFinance ? `<tr><td colspan="6" style="font-weight:bold; text-align:center; color:#1a237e; font-size:10px;">FINANCE BY POONAWALLA FINCORP</td></tr>` : ''}
      <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 4px;">
        <tr>
          <td style="border: 1px solid #000; width: 50%; vertical-align: top; padding: 4px; font-size:8px;">
            <strong>Declaration</strong><br>
            We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
          </td>
          <td style="border: 1px solid #000; width: 25%; vertical-align: top; padding: 4px; font-size:8px;">
            <strong>Pre Authenticated by</strong><br><br>
            Authorised Signatory<br>
            Name:<br>
            Designation:
          </td>
          <td style="border: 1px solid #000; width: 25%; vertical-align: top; text-align: center; padding: 4px; font-size:8px;">
            <strong>for KATIYAR ELECTRONICS</strong><br><br>
            Authorised Signatory<br>
            Name:<br>
            Designation:
          </td>
        </tr>
      </table>
      <div style="text-align: center; font-size: 8px; margin-top: 4px;">
        <strong>SUBJECT TO KANPUR JURISDICTION</strong><br>
        This is a Computer Generated Invoice
      </div>
    </div>
    `;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Tax Invoice</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { 
                size: A4; 
                margin: 10mm; 
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${generateBillHTML()}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
      <div className="bill-container">
        {/* Admin Page Button */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => window.location.href = '/admin'}
            style={{
              padding: '8px 16px',
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#6d28d9';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#7c3aed';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Admin Page
          </button>
        </div>
        
        <h1 className="bill-header">Professional Bill Generator</h1>

        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
          />
        <p style={{ color: '#2563eb', marginTop: 16, fontSize: '1.1rem', fontWeight: 500 }}>
            Upload PDF to extract bill information
          </p>
        </div>

        {isProcessing && (
          <div className="processing">
            <span>Processing PDF...</span>
          </div>
        )}

        {extractedData && (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator style={{ width: 24, height: 24 }} />
              Extracted Information (Editable)
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 16, marginTop: 0 }}>
              ✏️ Review and edit the extracted information below before generating the bill
            </p>
            <div className="info-card">
              <div>
                <label className="input-label">Customer Name</label>
                <input
                  type="text"
                  value={extractedData.customerName}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, customerName: e.target.value }))}
                  className="input-box"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="input-label">Manufacturer</label>
                <input
                  type="text"
                  value={extractedData.manufacturer}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, manufacturer: e.target.value }))}
                  className="input-box"
                  placeholder="Enter manufacturer"
                />
              </div>
              <div className="full">
                <label className="input-label">Customer Address</label>
                <textarea
                  value={extractedData.customerAddress}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, customerAddress: e.target.value }))}
                  className="input-box"
                  placeholder="Enter customer address"
                  rows="3"
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="input-label">Model</label>
                <input
                  type="text"
                  value={extractedData.model}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, model: e.target.value }))}
                  className="input-box"
                  placeholder="Enter model"
                />
              </div>
              <div>
                <label className="input-label">Serial Number</label>
                <input
                  type="text"
                  value={extractedData.imeiSerialNumber}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, imeiSerialNumber: e.target.value }))}
                  className="input-box"
                  placeholder="Enter serial number"
                />
              </div>
              <div>
                <label className="input-label">Asset Cost (₹)</label>
                <input
                  type="number"
                  value={extractedData.assetCost}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, assetCost: parseFloat(e.target.value) || 0 }))}
                  className="input-box"
                  placeholder="Enter asset cost"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="input-label">Asset Category</label>
                <input
                  type="text"
                  value={extractedData.assetCategory || ''}
                  onChange={(e) => setExtractedData(prev => ({ ...prev, assetCategory: e.target.value }))}
                  className="input-box"
                  placeholder="Enter asset category"
                />
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <label className="input-label">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice number"
                className="input-box"
              />
            </div>

            <div className="action-btns">
              <button
              onClick={handlePreviewBill}
                disabled={!invoiceNumber.trim()}
              style={{
                background: '#059669',
                color: '#fff',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                marginRight: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.background = '#047857';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#059669';
                e.target.style.transform = 'translateY(0)';
              }}
            >
                Preview Bill
              </button>
              <button
              onClick={handlePrintDownload}
                disabled={!invoiceNumber.trim()}
              style={{
                background: '#2563eb',
                color: '#fff',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled) {
                  e.target.style.background = '#1d4ed8';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#2563eb';
                e.target.style.transform = 'translateY(0)';
              }}
            >
                Print/Download
              </button>
            </div>
          </div>
        )}

        {showBillPreview && extractedData && invoiceNumber && (
          <div className="modal-overlay">
            <div className="modal-content">
              <button
                onClick={() => setShowBillPreview(false)}
                className="modal-close"
                aria-label="Close preview"
              >
                ×
              </button>
              <div
                style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, overflow: 'auto', maxHeight: '70vh' }}
                dangerouslySetInnerHTML={{ __html: generateBillHTML() }}
              />
            </div>
          </div>
        )}

      <h2 style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>Professional Bill Generator</h2>
      <div style={{ margin: '16px 0', textAlign: 'center' }}>
        <label>
          <input
            type="checkbox"
            checked={isHDBChecked}
            onChange={e => setIsHDBChecked(e.target.checked)}
          />{' '}
          Is this an HDB bill?
        </label>
      </div>
      {isHDBChecked && (
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <label htmlFor="manual-serial-input" style={{ marginRight: 8 }}>
            Enter Serial Number (if not auto-extracted):
          </label>
          <input
            id="manual-serial-input"
            type="text"
            value={manualSerial}
            onChange={e => setManualSerial(e.target.value)}
            placeholder="Enter serial number"
            style={{ padding: '4px 8px', fontSize: '1rem', borderRadius: 4, border: '1px solid #ccc', minWidth: 180 }}
          />
         <button
           style={{ 
             marginLeft: 8, 
             padding: '4px 12px', 
             fontSize: '1rem', 
             borderRadius: 4, 
             border: `1px solid ${isSerialUpdated ? '#059669' : '#2563eb'}`, 
             background: isSerialUpdated ? '#059669' : '#2563eb', 
             color: '#fff', 
             cursor: 'pointer',
             transition: 'all 0.2s ease-in-out',
             transform: 'scale(1)',
             boxShadow: isSerialUpdated ? '0 2px 4px rgba(5, 150, 105, 0.2)' : '0 2px 4px rgba(37, 99, 235, 0.2)'
           }}
           onClick={(e) => {
             e.target.style.transform = 'scale(0.95)';
             e.target.style.background = isSerialUpdated ? '#047857' : '#1d4ed8';
             e.target.style.boxShadow = isSerialUpdated ? '0 1px 2px rgba(5, 150, 105, 0.3)' : '0 1px 2px rgba(37, 99, 235, 0.3)';
             
             setTimeout(() => {
               e.target.style.transform = 'scale(1)';
               e.target.style.background = isSerialUpdated ? '#059669' : '#2563eb';
               e.target.style.boxShadow = isSerialUpdated ? '0 2px 4px rgba(5, 150, 105, 0.2)' : '0 2px 4px rgba(37, 99, 235, 0.2)';
             }, 150);
             
             setAppliedSerial(manualSerial);
             setIsSerialUpdated(true);
           }}
           onMouseEnter={(e) => {
             e.target.style.transform = 'scale(1.05)';
             e.target.style.boxShadow = isSerialUpdated ? '0 4px 8px rgba(5, 150, 105, 0.3)' : '0 4px 8px rgba(37, 99, 235, 0.3)';
           }}
           onMouseLeave={(e) => {
             e.target.style.transform = 'scale(1)';
             e.target.style.boxShadow = isSerialUpdated ? '0 2px 4px rgba(5, 150, 105, 0.2)' : '0 2px 4px rgba(37, 99, 235, 0.2)';
           }}
                    >
             {isSerialUpdated ? '✓ Serial Updated' : 'Update Serial Number'}
           </button>
        </div>
      )}
    </div>
  );
};

// Main App Component with Routing
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<BillGenerator />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App; 