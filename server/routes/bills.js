const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

// Helper functions (exact same as frontend)
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

const calculateTaxDetails = (assetCost, assetCategory) => {
  const isAirConditioner = assetCategory.toUpperCase().includes('AIR CONDITIONER');
  const rate = isAirConditioner ? assetCost / 1.28 : assetCost / 1.18;
  const cgst = isAirConditioner ? ((assetCost - (assetCost / 1.28)) / 2) : ((assetCost - (assetCost / 1.18)) / 2);
  const sgst = cgst;
  const taxableValue = assetCost - (sgst + cgst);
  const taxRate = isAirConditioner ? 14 : 9;
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

// Function to generate HTML for bill PDF (EXACT same format as preview)
const generateBillHTML = (bill) => {
  // Always recalculate tax details from current bill data
  const taxDetails = calculateTaxDetails(bill.assetCost, bill.assetCategory);
  const amountInWords = numberToWords(bill.assetCost);
  const taxAmountInWords = numberToWords(parseFloat(taxDetails.totalTaxAmount));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill - ${bill.invoiceNumber}</title>
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
      <div style="width: 100%; max-width: 210mm; height: 297mm; margin: 0 auto; font-family: Arial, sans-serif; font-size: 10px; line-height: 1.3; box-sizing: border-box; padding: 8mm; overflow: hidden;">
        <div style="text-align:center; font-size:18px; font-weight:bold; margin-bottom:8px;">Tax Invoice</div>
        <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 0; table-layout: fixed;">
          <tr>
            <td rowspan="8" style="border:1px solid #000; padding:10px; width:40%; vertical-align:top; font-weight:bold; font-size:9px;">
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
              ${bill.customerName}<br>
              ${bill.customerAddress}<br>
              <div style="margin-left: -8px; margin-right: -8px;">
                <hr style="border: none; border-top: 1px solid #000; width: 100%; margin: 0; padding: 0;" />
              </div>
              <b>Buyer (Bill to)</b><br>
              ${bill.customerName}<br>
              ${bill.customerAddress}
            </td>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; width:50%; font-size:9px; text-align:center;">Invoice No.<div style='height:6px;'></div><div>${bill.invoiceNumber}</div></td>
            <td style="border:1px solid #000; padding:10px; font-weight:bold; width:50%; font-size:9px; text-align:center;">Dated<div style='height:6px;'></div><div>${new Date(bill.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></td>
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
            <td style="border: 1px solid #000; vertical-align: top; padding: 6px; font-size:9px;">
              <strong>${bill.manufacturer} ${bill.assetCategory}</strong><br><br>
              <strong>Model No:</strong> ${bill.model}<br>
              ${bill.imeiSerialNumber ? `<b>Serial Number:</b> ${bill.imeiSerialNumber}<br>` : ''}
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
            <td style="border: 1px solid #000; text-align: center; padding: 3px; font-size:9px;"><strong>₹ ${formatAmount(Number(bill.assetCost))}</strong></td>
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
        ${bill.hdbFinance ? `<tr><td colspan="6" style="font-weight:bold; text-align:center; color:#1a237e; font-size:10px;">FINANCE BY HDBFS</td></tr>` : ''}
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
    </body>
    </html>
  `;
};

// Test endpoint to verify API is working
router.get('/test', (req, res) => {
  console.log('🔍 GET /test - Health check endpoint called');
  res.json({ 
    success: true, 
    message: 'Bills API is working',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Test PUT endpoint
router.put('/test-put', (req, res) => {
  console.log('🔍 PUT /test-put - Test PUT endpoint called');
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Request headers:', req.headers);
  console.log('🔍 Request method:', req.method);
  console.log('🔍 Request URL:', req.url);
  res.json({ 
    success: true, 
    message: 'PUT endpoint is working',
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test bill update endpoint
router.put('/test-update/:id', async (req, res) => {
  console.log('🔍 PUT /test-update/:id - Test update endpoint called');
  console.log('🔍 Bill ID:', req.params.id);
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Request headers:', req.headers);
  
  try {
    // Just return success without actually updating
    res.json({ 
      success: true, 
      message: 'Test update endpoint is working',
      billId: req.params.id,
      receivedData: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in test update:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test update failed',
      error: error.message
    });
  }
});

// Simple storage tracking - 512MB MongoDB Atlas Free Tier
router.get('/disk-space', async (req, res) => {
  try {
    // MongoDB Atlas Free Tier: 512MB total storage
    const MONGODB_TOTAL_SPACE = 512 * 1024 * 1024; // 512MB in bytes
    
    // Get current bill count
    const billCount = await Bill.countDocuments();
    
    // Estimate storage usage
    // Each bill document: ~5KB (including tax details, metadata, etc.)
    const averageBillSize = 5 * 1024; // 5KB per bill
    const usedSpace = billCount * averageBillSize;
    
    // Add 20% overhead for indexes and metadata
    const totalUsedSpace = Math.floor(usedSpace * 1.2);
    const freeSpace = Math.max(0, MONGODB_TOTAL_SPACE - totalUsedSpace);
    const usagePercentage = (totalUsedSpace / MONGODB_TOTAL_SPACE) * 100;
    
    // Calculate remaining bill capacity
    const remainingBillsCapacity = Math.floor(freeSpace / averageBillSize);
    
    res.json({
      success: true,
      data: {
        totalSpace: MONGODB_TOTAL_SPACE,
        freeSpace: freeSpace,
        usedSpace: totalUsedSpace,
        usagePercentage: usagePercentage.toFixed(2),
        estimatedBillsCapacity: remainingBillsCapacity,
        actualBillCount: billCount,
        averageBillSize: averageBillSize,
        storageType: 'MongoDB Atlas Free Tier (512MB)',
        drive: 'Cloud Database'
      }
    });
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error calculating storage usage',
      error: error.message 
    });
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Get all bills with pagination and filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, customerName, manufacturer, assetCategory, status, dateFrom, dateTo } = req.query;
    
    const filters = {
      customerName,
      manufacturer,
      assetCategory,
      status,
      dateFrom,
      dateTo
    };

    const result = await Bill.getBillsWithFilters(filters, parseInt(page), parseInt(limit));
    
    res.json({
      success: true,
      data: result.bills,
      pagination: {
        currentPage: result.page,
        totalPages: result.totalPages,
        totalItems: result.total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ success: false, message: 'Error fetching bills' });
  }
});

// Get single bill by ID
router.get('/:id', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ success: false, message: 'Error fetching bill' });
  }
});

// Create new bill
router.post('/', async (req, res) => {
  try {
    console.log('Received bill data:', JSON.stringify(req.body, null, 2));
    
    const billData = req.body;
    
    // Validate required fields
    if (!billData.invoiceNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invoice number is required' 
      });
    }
    
    if (!billData.customerName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Customer name is required' 
      });
    }
    
    if (!billData.assetCost) {
      return res.status(400).json({ 
        success: false, 
        message: 'Asset cost is required' 
      });
    }
    
    // Clean and validate data before saving
    const cleanedData = {
      ...billData,
      customerName: billData.customerName || 'Unknown Customer',
      customerAddress: billData.customerAddress || 'No Address',
      manufacturer: billData.manufacturer || 'Unknown Manufacturer',
      assetCategory: billData.assetCategory || 'Electronics',
      model: billData.model || 'Unknown Model',
      imeiSerialNumber: billData.imeiSerialNumber || '',
      assetCost: parseFloat(billData.assetCost) || 0,
      hdbFinance: billData.hdbFinance || false
    };

    // Clean up asset category for IDFC bills
    if (cleanedData.customerName.includes('IDFC FIRST BANK')) {
      // Remove any trailing 'D' and clean up extra text
      if (cleanedData.assetCategory && cleanedData.assetCategory.endsWith('D')) {
        cleanedData.assetCategory = cleanedData.assetCategory.slice(0, -1).trim();
      }
      
      // If asset category is too long, take only the first few words
      if (cleanedData.assetCategory && cleanedData.assetCategory.length > 20) {
        const categoryWords = cleanedData.assetCategory.split(/\s+/);
        cleanedData.assetCategory = categoryWords.slice(0, 2).join(' ').trim();
      }
      
      // Clean up model if it's too long
      if (cleanedData.model && cleanedData.model.length > 30) {
        const modelWords = cleanedData.model.split(/\s+/);
        cleanedData.model = modelWords.slice(0, 3).join(' ').trim();
      }
    }
    
    console.log('Cleaned bill data:', JSON.stringify(cleanedData, null, 2));
    
    // Check if invoice number already exists
    const existingBill = await Bill.findOne({ invoiceNumber: cleanedData.invoiceNumber });
    if (existingBill) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invoice number already exists' 
      });
    }

    const bill = new Bill(cleanedData);
    console.log('Saving bill to database...');
    await bill.save();
    console.log('Bill saved successfully:', bill._id);
    
    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    console.error('Error creating bill:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating bill',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update bill
router.put('/:id', async (req, res) => {
  console.log('🔍 PUT /bills/:id - Request received');
  console.log('🔍 Bill ID:', req.params.id);
  console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🔍 Request headers:', req.headers);
  
  try {
    
    const { 
      customerName, 
      customerAddress, 
      manufacturer, 
      assetCategory, 
      model, 
      imeiSerialNumber, 
      assetCost, 
      hdbFinance 
    } = req.body;

    console.log('🔍 Extracted data from request body:', {
      customerName, customerAddress, manufacturer, assetCategory, model, imeiSerialNumber, assetCost, hdbFinance
    });
    
    // Validate required fields
    console.log('🔍 Validating required fields...');
    if (!customerName || customerName.trim() === '') {
      console.log('❌ Validation failed: customerName is required');
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: 'Customer name is required'
      });
    }
    
    if (!customerAddress || customerAddress.trim() === '') {
      console.log('❌ Validation failed: customerAddress is required');
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: 'Customer address is required'
      });
    }
    
    if (!manufacturer || manufacturer.trim() === '') {
      console.log('❌ Validation failed: manufacturer is required');
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: 'Manufacturer is required'
      });
    }
    
    if (!assetCategory || assetCategory.trim() === '') {
      console.log('❌ Validation failed: assetCategory is required');
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: 'Asset category is required'
      });
    }
    
    if (!model || model.trim() === '') {
      console.log('❌ Validation failed: model is required');
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: 'Model is required'
      });
    }
    
    if (!assetCost || isNaN(assetCost) || assetCost <= 0) {
      console.log('❌ Validation failed: assetCost must be a positive number');
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: 'Asset cost must be a positive number'
      });
    }
    
    console.log('✅ All required fields validated successfully');
    
    // Recalculate tax details based on updated values
    console.log('🔍 Calculating tax details for:', { assetCost, assetCategory });
    const taxDetails = calculateTaxDetails(assetCost, assetCategory);
    console.log('🔍 Calculated tax details:', taxDetails);
    
    const amountInWords = numberToWords(assetCost);
    const taxAmountInWords = numberToWords(parseFloat(taxDetails.totalTaxAmount));
    console.log('🔍 Amount in words:', amountInWords);
    console.log('🔍 Tax amount in words:', taxAmountInWords);

    const updateData = {
      customerName,
      customerAddress,
      manufacturer,
      assetCategory,
      model,
      imeiSerialNumber,
      assetCost,
      hdbFinance,
      taxDetails,
      amountInWords,
      taxAmountInWords,
      product: `${manufacturer} ${assetCategory} - ${model}`,
      amount: assetCost,
      // Remove generated PDF path so it will be regenerated
      generatedPdfPath: null,
      status: 'updated'
    };
    
    console.log('🔍 Update data to save:', JSON.stringify(updateData, null, 2));

    console.log('🔍 Attempting to update bill in database...');
    console.log('🔍 Bill ID to update:', req.params.id);
    
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false } // Disable validators since we're updating existing data
    );
    
    console.log('🔍 Database update result:', bill ? 'Bill found and updated' : 'Bill not found');
    
    if (!bill) {
      console.log('❌ Bill not found in database');
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    console.log('✅ Bill updated successfully in database');

    // Regenerate PDF with updated data
    try {
      console.log('🔍 Starting PDF regeneration...');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      console.log('🔍 Uploads directory:', uploadsDir);
      
      if (!fs.existsSync(uploadsDir)) {
        console.log('🔍 Creating uploads directory...');
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const pdfFilename = `${bill.invoiceNumber}_${Date.now()}.pdf`;
      const pdfPath = path.join(uploadsDir, pdfFilename);
      console.log('🔍 PDF filename:', pdfFilename);
      console.log('🔍 PDF path:', pdfPath);

      console.log('🔍 Generating HTML content...');
      const htmlContent = generateBillHTML(bill);
      console.log('🔍 HTML content length:', htmlContent.length);

      console.log('🔍 Launching Puppeteer...');
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      console.log('🔍 Setting page content...');
      await page.setContent(htmlContent);
      console.log('🔍 Generating PDF...');
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false
      });
      console.log('🔍 Closing browser...');
      await browser.close();

      console.log('🔍 Updating bill with new PDF path...');
      // Update bill with new PDF path
      await Bill.findByIdAndUpdate(bill._id, {
        generatedPdfPath: `uploads/${pdfFilename}`
      });

      console.log('✅ PDF regenerated successfully for updated bill');
    } catch (error) {
      console.error('❌ Error regenerating PDF:', error);
      console.error('❌ Error stack:', error.stack);
      // Don't fail the update if PDF generation fails
    }
    
    console.log('✅ Sending success response');
    res.json({ success: true, data: bill });
  } catch (error) {
    console.error('❌ Error updating bill:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // Check if it's a database connection error
    if (error.name === 'MongoError' || error.name === 'MongooseError') {
      console.error('❌ Database connection error detected');
      res.status(500).json({ 
        success: false, 
        message: 'Database connection error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Database error'
      });
      return;
    }
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      console.error('❌ Validation error detected');
      console.error('❌ Validation error details:', error.message);
      console.error('❌ Validation error fields:', error.errors);
      res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Invalid data',
        details: process.env.NODE_ENV === 'development' ? error.errors : undefined
      });
      return;
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error updating bill',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    
    // Delete associated PDF files if they exist
    if (bill.originalPdfPath && fs.existsSync(bill.originalPdfPath)) {
      fs.unlinkSync(bill.originalPdfPath);
    }
    if (bill.generatedPdfPath && fs.existsSync(bill.generatedPdfPath)) {
      fs.unlinkSync(bill.generatedPdfPath);
    }
    
    res.json({ success: true, message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ success: false, message: 'Error deleting bill' });
  }
});

// Upload PDF file
router.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    res.json({ 
      success: true, 
      data: { 
        filename: req.file.filename,
        path: req.file.path 
      } 
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ success: false, message: 'Error uploading PDF' });
  }
});

// Get analytics
router.get('/analytics/summary', async (req, res) => {
  try {
    const analytics = await Bill.getAnalytics();
    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching analytics' });
  }
});

// Get monthly analytics
router.get('/analytics/monthly', async (req, res) => {
  try {
    const { year } = req.query;
    const query = {};
    
    if (year) {
      query.createdAt = {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${parseInt(year) + 1}-01-01`)
      };
    }

    const monthlyData = await Bill.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$assetCost' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({ success: true, data: monthlyData });
  } catch (error) {
    console.error('Error fetching monthly analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching monthly analytics' });
  }
});

// Get category analytics
router.get('/analytics/categories', async (req, res) => {
  try {
    const categoryData = await Bill.aggregate([
      {
        $group: {
          _id: '$assetCategory',
          count: { $sum: 1 },
          revenue: { $sum: '$assetCost' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({ success: true, data: categoryData });
  } catch (error) {
    console.error('Error fetching category analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching category analytics' });
  }
});

// Get manufacturer analytics
router.get('/analytics/manufacturers', async (req, res) => {
  try {
    const manufacturerData = await Bill.aggregate([
      {
        $group: {
          _id: '$manufacturer',
          count: { $sum: 1 },
          revenue: { $sum: '$assetCost' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({ success: true, data: manufacturerData });
  } catch (error) {
    console.error('Error fetching manufacturer analytics:', error);
    res.status(500).json({ success: false, message: 'Error fetching manufacturer analytics' });
  }
});

// Search bills
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const searchQuery = {
      $or: [
        { customerName: { $regex: query, $options: 'i' } },
        { manufacturer: { $regex: query, $options: 'i' } },
        { assetCategory: { $regex: query, $options: 'i' } },
        { model: { $regex: query, $options: 'i' } },
        { invoiceNumber: { $regex: query, $options: 'i' } }
      ]
    };

    const bills = await Bill.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Bill.countDocuments(searchQuery);

    res.json({
      success: true,
      data: bills,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error searching bills:', error);
    res.status(500).json({ success: false, message: 'Error searching bills' });
  }
});

// Cleanup old bills to free up space
router.delete('/cleanup', async (req, res) => {
  try {
    const { daysOld = 365, status = 'archived' } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));
    
    const result = await Bill.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: status
    });
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} old bills`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up bills:', error);
    res.status(500).json({ success: false, message: 'Error cleaning up bills' });
  }
});

// Archive old bills instead of deleting
router.put('/archive', async (req, res) => {
  try {
    const { daysOld = 365 } = req.query;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));
    
    const result = await Bill.updateMany(
      {
        createdAt: { $lt: cutoffDate },
        status: { $ne: 'archived' }
      },
      {
        $set: { status: 'archived' }
      }
    );
    
    res.json({
      success: true,
      message: `Archived ${result.modifiedCount} old bills`,
      archivedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error archiving bills:', error);
    res.status(500).json({ success: false, message: 'Error archiving bills' });
  }
});

// Fix IDFC bills asset categories
router.put('/fix-idfc', async (req, res) => {
  try {
    // Find all bills that contain "IDFC FIRST BANK" in customer name
    const idfcBills = await Bill.find({
      customerName: { $regex: 'IDFC FIRST BANK', $options: 'i' }
    });

    let fixedCount = 0;
    
    for (const bill of idfcBills) {
      let needsUpdate = false;
      const updates = {};
      
      // Fix asset category if it contains extra text
      if (bill.assetCategory && bill.assetCategory.length > 20) {
        // Extract just the category name (usually first word or two)
        const categoryWords = bill.assetCategory.split(/\s+/);
        const cleanCategory = categoryWords.slice(0, 2).join(' ').trim();
        if (cleanCategory && cleanCategory !== bill.assetCategory) {
          updates.assetCategory = cleanCategory;
          needsUpdate = true;
        }
      }
      
      // Fix model if it contains extra text
      if (bill.model && bill.model.length > 30) {
        // Extract just the model name (usually first few words)
        const modelWords = bill.model.split(/\s+/);
        const cleanModel = modelWords.slice(0, 3).join(' ').trim();
        if (cleanModel && cleanModel !== bill.model) {
          updates.model = cleanModel;
          needsUpdate = true;
        }
      }
      
      // Update the bill if needed
      if (needsUpdate) {
        await Bill.findByIdAndUpdate(bill._id, updates);
        fixedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${fixedCount} IDFC bills`,
      fixedCount
    });
  } catch (error) {
    console.error('Error fixing IDFC bills:', error);
    res.status(500).json({ success: false, message: 'Error fixing IDFC bills' });
  }
});

// Generate and store PDF for a bill
router.post('/:id/generate-pdf', async (req, res) => {
  try {
    console.log('Starting PDF generation for bill ID:', req.params.id);
    
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      console.log('Bill not found for ID:', req.params.id);
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    console.log('Bill found:', bill.invoiceNumber);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('Creating uploads directory:', uploadsDir);
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate PDF filename
    const pdfFilename = `${bill.invoiceNumber}_${Date.now()}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfFilename);
    
    console.log('PDF will be saved to:', pdfPath);

    // Generate HTML for the bill
    const htmlContent = generateBillHTML(bill);
    console.log('HTML content generated, length:', htmlContent.length);

    // Generate PDF using Puppeteer with better error handling
    console.log('Launching Puppeteer browser...');
    
    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      console.log('Browser launched, creating new page...');
      const page = await browser.newPage();
      
      console.log('Setting HTML content...');
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      console.log('Generating PDF...');
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false
      });
      
      console.log('PDF generated, closing browser...');
      await browser.close();
      
    } catch (puppeteerError) {
      console.error('Puppeteer failed:', puppeteerError);
      
      // Fallback: Create a simple HTML file instead of PDF
      console.log('Creating HTML fallback...');
      const htmlPath = pdfPath.replace('.pdf', '.html');
      fs.writeFileSync(htmlPath, htmlContent);
      
      // Update bill with HTML path instead
      await Bill.findByIdAndUpdate(bill._id, {
        generatedPdfPath: `uploads/${path.basename(htmlPath)}`,
        status: 'generated'
      });
      
      console.log('HTML file created as fallback');
      
      return res.json({
        success: true,
        message: 'HTML file generated (PDF generation failed)',
        pdfPath: `uploads/${path.basename(htmlPath)}`
      });
    }

    console.log('PDF saved to:', pdfPath);
    console.log('Checking if file exists:', fs.existsSync(pdfPath));

    // Update bill with PDF path
    await Bill.findByIdAndUpdate(bill._id, {
      generatedPdfPath: `uploads/${pdfFilename}`,
      status: 'generated'
    });

    console.log('Bill updated with PDF path');

    res.json({
      success: true,
      message: 'PDF generated successfully',
      pdfPath: `uploads/${pdfFilename}`
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error generating PDF',
      error: process.env.NODE_ENV === 'development' ? error.message : 'PDF generation failed'
    });
  }
});

// Download bill PDF
router.get('/:id/download', async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Check if PDF exists
    if (!bill.generatedPdfPath) {
      return res.status(404).json({ success: false, message: 'PDF not generated for this bill' });
    }

    const pdfPath = path.join(__dirname, '..', bill.generatedPdfPath);
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, message: 'PDF file not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${bill.invoiceNumber}.pdf"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading bill:', error);
    res.status(500).json({ success: false, message: 'Error downloading bill' });
  }
});

module.exports = router; 