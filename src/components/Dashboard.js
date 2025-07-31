import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  DollarSign,
  Package,
  FileText,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import * as XLSX from 'xlsx';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    customerName: '',
    manufacturer: '',
    assetCategory: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [diskSpace, setDiskSpace] = useState(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // ESC key functionality to close modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (showEditModal) {
          setShowEditModal(false);
          setEditingBill(null);
          setEditFormData({});
        }
        if (showStorageModal) {
          setShowStorageModal(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showEditModal, showStorageModal]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchBills = useCallback(async (page = currentPage, filterParams = filters) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: page,
        limit: 10,
        ...filterParams
      });

      console.log('Fetching bills with params:', queryParams.toString());
      const response = await fetch(`${API_BASE_URL}/bills?${queryParams}`);
      const data = await response.json();

      console.log('Fetched bills data:', data);

      if (data.success) {
        setBills(data.data);
        setTotalPages(data.pagination.totalPages);
        console.log('Updated bills state with:', data.data.length, 'bills');
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bills/analytics/summary`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDiskSpace = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bills/disk-space`);
      const data = await response.json();
      if (data.success) {
        setDiskSpace(data.data);
      }
    } catch (error) {
      console.error('Error fetching disk space:', error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCleanup = async (daysOld = 365) => {
    if (window.confirm(`Are you sure you want to delete bills older than ${daysOld} days? This action cannot be undone.`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/bills/cleanup?daysOld=${daysOld}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          alert(`Successfully deleted ${data.deletedCount} old bills`);
          fetchBills(currentPage, filters);
          fetchDiskSpace();
        }
      } catch (error) {
        console.error('Error cleaning up bills:', error);
        alert('Error cleaning up bills');
      }
    }
  };

  const handleArchive = async (daysOld = 365) => {
    if (window.confirm(`Are you sure you want to archive bills older than ${daysOld} days?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/bills/archive?daysOld=${daysOld}`, {
          method: 'PUT'
        });
        const data = await response.json();
        if (data.success) {
          alert(`Successfully archived ${data.archivedCount} old bills`);
          fetchBills(currentPage, filters);
          fetchDiskSpace();
        }
      } catch (error) {
        console.error('Error archiving bills:', error);
        alert('Error archiving bills');
      }
    }
  };

  useEffect(() => {
    fetchBills(currentPage, filters);
    fetchAnalytics();
    fetchDiskSpace();
  }, [fetchBills, fetchAnalytics, fetchDiskSpace, currentPage, filters]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!refreshing) {
        fetchBills(currentPage, filters);
        fetchAnalytics();
        fetchDiskSpace();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchBills, fetchAnalytics, fetchDiskSpace, currentPage, filters, refreshing]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchBills(currentPage, filters);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/bills/search/${encodeURIComponent(searchQuery)}?page=${currentPage}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setBills(data.data);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error searching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      fetchBills(currentPage, filters),
      fetchAnalytics(),
      fetchDiskSpace()
    ]).finally(() => {
      setRefreshing(false);
    });
  };





  const handleDeleteBill = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/bills/${billId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchBills(currentPage, filters);
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleEditBill = (bill) => {
    console.log('🔍 Opening edit modal for bill:', bill);
    console.log('🔍 Bill ID:', bill._id);
    console.log('🔍 Bill data:', JSON.stringify(bill, null, 2));
    
    setEditingBill(bill);
    const formData = {
      customerName: bill.customerName || '',
      customerAddress: bill.customerAddress || '',
      manufacturer: bill.manufacturer || '',
      assetCategory: bill.assetCategory || '',
      model: bill.model || '',
      imeiSerialNumber: bill.imeiSerialNumber || '',
      assetCost: bill.assetCost || 0,
      hdbFinance: bill.hdbFinance || false,
      tvsFinance: bill.tvsFinance || false
    };
    console.log('🔍 Setting edit form data:', formData);
    setEditFormData(formData);
    setShowEditModal(true);
    console.log('✅ Edit modal should now be visible');
  };

  const handleViewPDF = async (bill) => {
    try {
      console.log('🔍 Starting view for bill:', bill.invoiceNumber);
      
      const response = await fetch(`${API_BASE_URL}/bills/${bill._id}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log('🔍 Blob size:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        // Check content type to determine if it's PDF or HTML
        const contentType = response.headers.get('content-type');
        const isHTML = contentType && contentType.includes('text/html');
        
        if (isHTML) {
          // For HTML files, create a new window with the HTML content
          const text = await blob.text();
          const newWindow = window.open('', '_blank');
          newWindow.document.write(text);
          newWindow.document.close();
          
          setNotification('HTML file opened in new tab');
          setTimeout(() => setNotification(null), 3000);
        } else {
          // For PDF files, open directly
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          
          // Clean up after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
          
          setNotification('PDF opened in new tab');
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        const errorData = await response.json();
        console.log('🔍 View failed:', errorData);
        
        if (errorData.message === 'File not generated for this bill') {
          // Try to generate file first
          console.log('🔍 File not generated, attempting to generate...');
          setNotification('Generating file...');
          
          const generateResponse = await fetch(`${API_BASE_URL}/bills/${bill._id}/generate-pdf`, {
            method: 'POST'
          });
          
          if (generateResponse.ok) {
            console.log('🔍 File generated successfully, attempting to view...');
            setNotification('File generated, opening...');
            
            // Try viewing again
            const viewResponse = await fetch(`${API_BASE_URL}/bills/${bill._id}/download`);
            if (viewResponse.ok) {
              const blob = await viewResponse.blob();
              console.log('🔍 Downloaded blob size:', blob.size, 'bytes');
              
              if (blob.size === 0) {
                throw new Error('Downloaded file is empty');
              }
              
              // Check content type
              const contentType = viewResponse.headers.get('content-type');
              const isHTML = contentType && contentType.includes('text/html');
              
              if (isHTML) {
                // For HTML files, create a new window with the HTML content
                const text = await blob.text();
                const newWindow = window.open('', '_blank');
                newWindow.document.write(text);
                newWindow.document.close();
                
                setNotification('HTML file generated and opened in new tab');
                setTimeout(() => setNotification(null), 3000);
              } else {
                // For PDF files, open directly
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
                
                // Clean up after a delay
                setTimeout(() => {
                  window.URL.revokeObjectURL(url);
                }, 1000);
                
                setNotification('PDF generated and opened in new tab');
                setTimeout(() => setNotification(null), 3000);
              }
            } else {
              const viewError = await viewResponse.json();
              console.error('❌ View failed after generation:', viewError);
              alert(`Failed to view file after generation: ${viewError.message || 'Unknown error'}`);
            }
          } else {
            const errorData = await generateResponse.json();
            console.error('❌ File generation failed:', errorData);
            alert(`Failed to generate file: ${errorData.message || 'Unknown error'}`);
          }
        } else {
          alert(`Unable to view bill file: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error viewing bill:', error);
      alert(`Error viewing bill: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDownloadBill = async (bill) => {
    try {
      console.log('🔍 Starting download for bill:', bill.invoiceNumber);
      
      const response = await fetch(`${API_BASE_URL}/bills/${bill._id}/download`);
      
      if (response.ok) {
        // Check the content type to determine file type
        const contentType = response.headers.get('content-type');
        console.log('🔍 Content-Type:', contentType);
        
        const isHTML = contentType && contentType.includes('text/html');
        const fileExtension = isHTML ? 'html' : 'pdf';
        
        if (isHTML) {
          console.log('⚠️ Response is HTML file, not PDF');
          setNotification('Downloading HTML file');
          setTimeout(() => setNotification(null), 3000);
        }
        
        // Download the file
        const blob = await response.blob();
        console.log('🔍 Blob size:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        // Try to open in new tab first, then download
        try {
          const url = window.URL.createObjectURL(blob);
          
          if (isHTML) {
            // For HTML files, open in new tab
            const text = await blob.text();
            const newWindow = window.open('', '_blank');
            newWindow.document.write(text);
            newWindow.document.close();
          } else {
            // For PDF files, open in new tab
            const newWindow = window.open(url, '_blank');
          }
          
          // Also trigger download
          const a = document.createElement('a');
          a.href = url;
          a.download = `${bill.invoiceNumber}.${fileExtension}`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
          
          // Show success message
          const fileType = isHTML ? 'HTML file' : 'PDF';
          setNotification(`${fileType} opened in new tab and downloaded`);
          setTimeout(() => setNotification(null), 3000);
          
        } catch (openError) {
          console.warn('⚠️ Could not open in new tab, trying download only:', openError);
          
          // Fallback to download only
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${bill.invoiceNumber}.${fileExtension}`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
          
          // Show success message
          const fileType = isHTML ? 'HTML file' : 'PDF';
          setNotification(`${fileType} downloaded successfully`);
          setTimeout(() => setNotification(null), 3000);
        }
      } else {
        const errorData = await response.json();
        console.log('🔍 Download failed:', errorData);
        
        if (errorData.message === 'File not generated for this bill') {
          // Try to generate file first
          console.log('🔍 File not generated, attempting to generate...');
          setNotification('Generating file...');
          
          const generateResponse = await fetch(`${API_BASE_URL}/bills/${bill._id}/generate-pdf`, {
            method: 'POST'
          });
          
          if (generateResponse.ok) {
            console.log('🔍 File generated successfully, attempting download...');
            setNotification('File generated, downloading...');
            
            // Try downloading again
            const downloadResponse = await fetch(`${API_BASE_URL}/bills/${bill._id}/download`);
            if (downloadResponse.ok) {
              const blob = await downloadResponse.blob();
              console.log('🔍 Downloaded blob size:', blob.size, 'bytes');
              
              if (blob.size === 0) {
                throw new Error('Downloaded file is empty');
              }
              
              // Check content type
              const contentType = downloadResponse.headers.get('content-type');
              const isHTML = contentType && contentType.includes('text/html');
              const fileExtension = isHTML ? 'html' : 'pdf';
              
              // Try to open in new tab first, then download
              try {
                const url = window.URL.createObjectURL(blob);
                
                if (isHTML) {
                  // For HTML files, open in new tab
                  const text = await blob.text();
                  const newWindow = window.open('', '_blank');
                  newWindow.document.write(text);
                  newWindow.document.close();
                } else {
                  // For PDF files, open in new tab
                  const newWindow = window.open(url, '_blank');
                }
                
                // Also trigger download
                const a = document.createElement('a');
                a.href = url;
                a.download = `${bill.invoiceNumber}.${fileExtension}`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                setTimeout(() => {
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }, 100);
                
                const fileType = isHTML ? 'HTML file' : 'PDF';
                setNotification(`${fileType} generated, opened in new tab and downloaded`);
                setTimeout(() => setNotification(null), 3000);
                
              } catch (openError) {
                console.warn('⚠️ Could not open in new tab, trying download only:', openError);
                
                // Fallback to download only
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${bill.invoiceNumber}.${fileExtension}`;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                setTimeout(() => {
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }, 100);
                
                const fileType = isHTML ? 'HTML file' : 'PDF';
                setNotification(`${fileType} generated and downloaded successfully`);
                setTimeout(() => setNotification(null), 3000);
              }
            } else {
              const downloadError = await downloadResponse.json();
              console.error('❌ Download failed after generation:', downloadError);
              alert(`Failed to download file after generation: ${downloadError.message || 'Unknown error'}`);
            }
          } else {
            const errorData = await generateResponse.json();
            console.error('❌ File generation failed:', errorData);
            alert(`Failed to generate file: ${errorData.message || 'Unknown error'}`);
          }
        } else {
          alert(`Unable to download bill file: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error downloading bill:', error);
      alert(`Error downloading bill: ${error.message || 'Unknown error'}`);
    }
  };

  const handleExportData = async () => {
    try {
      // Fetch all bills for export
      const response = await fetch(`${API_BASE_URL}/bills?limit=10000&page=1`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Prepare data for Excel
        const excelData = data.data.map(bill => ({
          'Invoice Number': bill.invoiceNumber,
          'Customer Name': bill.customerName,
          'Customer Address': bill.customerAddress,
          'Manufacturer': bill.manufacturer,
          'Asset Category': bill.assetCategory,
          'Model': bill.model,
          'IMEI/Serial Number': bill.imeiSerialNumber || '',
          'Asset Cost (₹)': bill.assetCost,
          'Taxable Value (₹)': bill.taxDetails?.taxableValue || '',
          'CGST (₹)': bill.taxDetails?.cgst || '',
          'SGST (₹)': bill.taxDetails?.sgst || '',
          'Total Tax (₹)': bill.taxDetails?.totalTaxAmount || '',
          'Total Amount (₹)': bill.assetCost,
          'Amount in Words': bill.amountInWords || '',
          'HDB Finance': bill.hdbFinance ? 'Yes' : 'No',
          'Status': bill.status,
          'Created Date': new Date(bill.createdAt).toLocaleDateString('en-GB'),
          'Created Time': new Date(bill.createdAt).toLocaleTimeString('en-GB')
        }));

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        const colWidths = [
          { wch: 15 }, // Invoice Number
          { wch: 20 }, // Customer Name
          { wch: 30 }, // Customer Address
          { wch: 15 }, // Manufacturer
          { wch: 15 }, // Asset Category
          { wch: 15 }, // Model
          { wch: 20 }, // IMEI/Serial Number
          { wch: 12 }, // Asset Cost
          { wch: 15 }, // Taxable Value
          { wch: 10 }, // CGST
          { wch: 10 }, // SGST
          { wch: 12 }, // Total Tax
          { wch: 12 }, // Total Amount
          { wch: 40 }, // Amount in Words
          { wch: 10 }, // HDB Finance
          { wch: 10 }, // Status
          { wch: 12 }, // Created Date
          { wch: 12 }  // Created Time
        ];
        ws['!cols'] = colWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Bills Data');

        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        const filename = `bills_export_${currentDate}.xlsx`;

        // Save the file
        XLSX.writeFile(wb, filename);
        
        setNotification('Data exported successfully to Excel');
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification('Failed to fetch data for export');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setNotification('Error exporting data to Excel');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6b7280',
      generated: '#059669',
      printed: '#2563eb',
      archived: '#7c3aed'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Bill Management Dashboard</h1>
        <div className="header-actions">
          <button 
            className="btn-secondary" 
            onClick={handleRefresh} 
            title="Refresh Dashboard"
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            className="btn-primary"
            onClick={() => navigate('/')}
          >
            <Plus size={16} />
            New Bill
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="card-icon">
            <FileText color="#2563eb" />
          </div>
          <div className="card-content">
            <h3>{analytics.summary?.totalBills || 0}</h3>
            <p>Total Bills</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-icon">
            <DollarSign color="#059669" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(analytics.summary?.totalRevenue || 0)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-icon">
            <TrendingUp color="#7c3aed" />
          </div>
          <div className="card-content">
            <h3>{formatCurrency(analytics.summary?.averageBillValue || 0)}</h3>
            <p>Average Bill Value</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="card-icon">
            <Package color="#dc2626" />
          </div>
          <div className="card-content">
            <h3>{analytics.categoryData?.length || 0}</h3>
            <p>Product Categories</p>
          </div>
        </div>

        {/* MongoDB Storage Card */}
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setShowStorageModal(true)}>
          <div className="card-icon">
            <HardDrive color={
              diskSpace ? 
                (diskSpace.usagePercentage > 80 ? '#dc2626' : 
                 diskSpace.usagePercentage > 60 ? '#f59e0b' : '#059669') 
                : '#059669'
            } />
          </div>
          <div className="card-content">
            <h3>{diskSpace ? `${diskSpace.usagePercentage}%` : '--'}</h3>
            <p>MongoDB Storage</p>
            {diskSpace && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                <div style={{ 
                  color: diskSpace.usagePercentage > 80 ? '#dc2626' : 
                         diskSpace.usagePercentage > 60 ? '#f59e0b' : '#059669', 
                  marginBottom: '2px',
                  fontWeight: '500'
                }}>
                  {diskSpace.freeSpace > 1073741824 
                    ? `${(diskSpace.freeSpace / 1073741824).toFixed(1)}GB free`
                    : `${(diskSpace.freeSpace / 1048576).toFixed(1)}MB free`
                  }
                </div>
                <div style={{ color: '#6b7280', fontSize: '11px' }}>
                  {diskSpace.actualBillCount || 0} bills stored
                </div>
                <div style={{ color: '#6b7280', fontSize: '11px' }}>
                  ~{diskSpace.estimatedBillsCapacity?.toLocaleString() || 0} more bills possible
                </div>
                <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '2px' }}>
                  512MB total storage
                </div>
                <div style={{ 
                  color: diskSpace.usagePercentage > 80 ? '#dc2626' : 
                         diskSpace.usagePercentage > 60 ? '#f59e0b' : '#059669',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  marginTop: '2px'
                }}>
                  {diskSpace.usagePercentage > 80 ? '⚠️ Critical' : 
                   diskSpace.usagePercentage > 60 ? '⚠️ Warning' : '✅ Healthy'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Data Button */}
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'center' 
      }}>
        <button
          onClick={handleExportData}
          style={{
            padding: '12px 24px',
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#047857';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#059669';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
          }}
        >
          <Download size={20} />
          Export Data to Excel
        </button>
      </div>

      {/* Search and Filters */}
      <div className="search-filters">
        <div className="search-section">
          <div className="search-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search bills by customer, manufacturer, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="search-btn">
              Search
            </button>
          </div>
        </div>

        <div className="filters-section">
          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
          </button>

          {showFilters && (
            <div className="filters-panel">
              <div className="filter-row">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={filters.customerName}
                  onChange={(e) => handleFilterChange('customerName', e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Manufacturer"
                  value={filters.manufacturer}
                  onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                />
                <select
                  value={filters.assetCategory}
                  onChange={(e) => handleFilterChange('assetCategory', e.target.value)}
                >
                  <option value="">All Companies</option>
                  <option value="Chola">Chola</option>
                  <option value="IDFC">IDFC</option>
                  <option value="HDB">HDB</option>
                </select>
              </div>
              <div className="filter-row">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="generated">Generated</option>
                  <option value="printed">Printed</option>
                  <option value="archived">Archived</option>
                </select>
                <input
                  type="date"
                  placeholder="From Date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
                <input
                  type="date"
                  placeholder="To Date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bills Table */}
      <div className="bills-table-container">
        <div className="table-header">
          <h2>Recent Bills</h2>
          <div className="table-actions">
            <span>{bills.length} bills found</span>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading bills...</div>
        ) : (
          <div className="bills-table">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.length > 0 ? (
                  bills.map((bill) => (
                    <tr key={bill._id}>
                      <td>{bill.invoiceNumber}</td>
                      <td>
                        <div className="customer-info">
                          <strong>{bill.customerName}</strong>
                          <small>{bill.customerAddress}</small>
                        </div>
                      </td>
                      <td>
                        <div className="product-info">
                          <strong>{bill.manufacturer} ({bill.assetCategory})</strong>
                          <small>Model: {bill.model}</small>
                        </div>
                      </td>
                      <td>
                        <strong>{formatCurrency(bill.assetCost)}</strong>
                      </td>
                      <td>{formatDate(bill.createdAt)}</td>
                      <td>
                        <span 
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(bill.status) }}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons" style={{
                          display: 'flex',
                          gap: '6px',
                          justifyContent: 'center'
                        }}>
                          <button
                            onClick={() => handleEditBill(bill)}
                            title="Edit Bill"
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#2563eb',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.2s ease',
                              minWidth: '70px',
                              justifyContent: 'center',
                              fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#1d4ed8';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#2563eb';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            <Edit size={14} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDownloadBill(bill)}
                            title="Download PDF"
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#059669',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.2s ease',
                              minWidth: '70px',
                              justifyContent: 'center',
                              fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#047857';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#059669';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            <Download size={14} />
                            <span>Download</span>
                          </button>

                          <button
                            onClick={() => handleDeleteBill(bill._id)}
                            title="Delete Bill"
                            style={{
                              padding: '8px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#dc2626',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.2s ease',
                              minWidth: '70px',
                              justifyContent: 'center',
                              fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#b91c1c';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#dc2626';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <div style={{ 
                        color: '#6b7280', 
                        fontSize: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <FileText size={48} color="#9ca3af" />
                        <p style={{ margin: 0, fontWeight: '500' }}>No bills found</p>
                        <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
                          {Object.values(filters).some(val => val) 
                            ? 'No bills match your current filters. Try adjusting your search criteria.'
                            : 'No bills have been created yet.'
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Bill Details Modal */}
      {showBillModal && selectedBill && (
        <div className="modal-overlay" onClick={() => setShowBillModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bill Details</h3>
              <button onClick={() => setShowBillModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="bill-details">
                <div className="detail-row">
                  <strong>Invoice Number:</strong>
                  <span>{selectedBill.invoiceNumber}</span>
                </div>
                <div className="detail-row">
                  <strong>Customer:</strong>
                  <span>{selectedBill.customerName}</span>
                </div>
                <div className="detail-row">
                  <strong>Address:</strong>
                  <span>{selectedBill.customerAddress}</span>
                </div>
                <div className="detail-row">
                  <strong>Product:</strong>
                                          <span>{selectedBill.manufacturer} ({selectedBill.assetCategory})</span>
                </div>
                <div className="detail-row">
                  <strong>Model:</strong>
                  <span>{selectedBill.model}</span>
                </div>
                <div className="detail-row">
                  <strong>Serial Number:</strong>
                  <span>{selectedBill.imeiSerialNumber || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <strong>Amount:</strong>
                  <span>{formatCurrency(selectedBill.assetCost)}</span>
                </div>
                <div className="detail-row">
                  <strong>Status:</strong>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedBill.status) }}>
                    {selectedBill.status}
                  </span>
                </div>
                <div className="detail-row">
                  <strong>Created:</strong>
                  <span>{formatDate(selectedBill.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Storage Management Modal */}
      {showStorageModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
              onClick={() => setShowStorageModal(false)}
              className="modal-close"
              aria-label="Close storage modal"
            >
              ×
            </button>
            <h2>Storage Management</h2>
            
            {diskSpace && (
              <div style={{ marginBottom: '24px' }}>
                <h3>MongoDB Atlas Storage Status</h3>
                <div style={{ 
                  background: '#f8fafc', 
                  padding: '16px', 
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <p><strong>Storage Type:</strong> {diskSpace.storageType}</p>
                      <p><strong>Usage:</strong> {diskSpace.usagePercentage}%</p>
                      <p><strong>Total Space:</strong> {
                        diskSpace.totalSpace > 1073741824 
                          ? `${(diskSpace.totalSpace / 1073741824).toFixed(1)}GB`
                          : `${(diskSpace.totalSpace / 1048576).toFixed(1)}MB`
                      }</p>
                      <p><strong>Used Space:</strong> {
                        diskSpace.usedSpace > 1073741824 
                          ? `${(diskSpace.usedSpace / 1073741824).toFixed(1)}GB`
                          : `${(diskSpace.usedSpace / 1048576).toFixed(1)}MB`
                      }</p>
                      <p><strong>Free Space:</strong> {
                        diskSpace.freeSpace > 1073741824 
                          ? `${(diskSpace.freeSpace / 1073741824).toFixed(1)}GB`
                          : `${(diskSpace.freeSpace / 1048576).toFixed(1)}MB`
                      }</p>
                    </div>
                    <div>
                      <p><strong>Bills Stored:</strong> {diskSpace.actualBillCount?.toLocaleString() || 0}</p>
                      <p><strong>More Bills Possible:</strong> {diskSpace.estimatedBillsCapacity?.toLocaleString() || 0}</p>
                      <p><strong>Avg Bill Size:</strong> {(diskSpace.averageBillSize / 1024).toFixed(0)}KB</p>
                      <p><strong>Status:</strong> 
                        <span style={{ 
                          color: diskSpace.usagePercentage > 80 ? '#dc2626' : 
                                 diskSpace.usagePercentage > 60 ? '#f59e0b' : '#059669',
                          fontWeight: 'bold'
                        }}>
                          {diskSpace.usagePercentage > 80 ? 'Critical' : 
                           diskSpace.usagePercentage > 60 ? 'Warning' : 'Healthy'}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  <div style={{
                    width: '100%',
                    height: '12px',
                    background: '#e2e8f0',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: `${diskSpace.usagePercentage}%`,
                      height: '100%',
                      background: diskSpace.usagePercentage > 80 ? '#dc2626' : 
                                 diskSpace.usagePercentage > 60 ? '#f59e0b' : '#059669',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    textAlign: 'center' 
                  }}>
                    {diskSpace.usagePercentage > 80 ? '⚠️ Critical: Consider upgrading to paid plan or cleaning old bills' :
                     diskSpace.usagePercentage > 60 ? '⚠️ Warning: Monitor storage usage closely' :
                     '✅ Healthy: Plenty of space available for more bills'}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <h3>Data Management</h3>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleArchive(365)}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Archive Bills (1+ year old)
                </button>
                <button
                  onClick={() => handleArchive(180)}
                  style={{
                    padding: '8px 16px',
                    background: '#7c3aed',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Archive Bills (6+ months old)
                </button>
                <button
                  onClick={() => handleCleanup(365)}
                  style={{
                    padding: '8px 16px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Delete Old Bills (1+ year)
                </button>
              </div>
            </div>

            <div style={{ 
              background: '#fef3c7', 
              padding: '12px', 
              borderRadius: '6px',
              border: '1px solid #f59e0b'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>⚠️ Warning:</strong> Deleting bills is permanent and cannot be undone. 
                Consider archiving instead of deleting to preserve data.
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Edit Bill Modal */}
      {showEditModal && editingBill && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px' }}>Edit Bill - {editingBill.invoiceNumber}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingBill(null);
                  setEditFormData({});
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = '#666';
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              console.log('🚀 Form submitted!');
              console.log('🚀 Event:', e);
              console.log('🚀 Form data:', editFormData);
              console.log('🚀 Editing bill ID:', editingBill._id);
              console.log('🚀 API URL:', `${API_BASE_URL}/bills/${editingBill._id}`);
              
              try {
                console.log('🔍 Submitting edit form with data:', editFormData);
                console.log('🔍 API_BASE_URL:', API_BASE_URL);
                console.log('🔍 Bill ID:', editingBill._id);
                
                // Validate required fields
                if (!editFormData.customerName || !editFormData.assetCost) {
                  console.log('❌ Validation failed - missing required fields');
                  setNotification('Please fill in all required fields');
                  setTimeout(() => setNotification(null), 3000);
                  return;
                }

                console.log('🔍 Making PUT request to:', `${API_BASE_URL}/bills/${editingBill._id}`);
                console.log('🔍 Request headers:', { 
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                });
                console.log('🔍 Request body:', JSON.stringify(editFormData, null, 2));

                const response = await fetch(`${API_BASE_URL}/bills/${editingBill._id}`, {
                  method: 'PUT',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  },
                  body: JSON.stringify(editFormData)
                });

                console.log('🔍 Response status:', response.status);
                console.log('🔍 Response headers:', response.headers);
                console.log('🔍 Response ok:', response.ok);
                
                let responseData;
                const responseText = await response.text();
                console.log('🔍 Raw response text:', responseText);
                
                try {
                  responseData = JSON.parse(responseText);
                  console.log('🔍 Parsed response data:', responseData);
                } catch (parseError) {
                  console.error('❌ Failed to parse response as JSON:', parseError);
                  console.error('❌ Raw response that failed to parse:', responseText);
                  responseData = { message: 'Invalid response format' };
                }

                if (response.ok) {
                  console.log('✅ Bill updated successfully!');
                  setNotification('✅ Bill updated successfully!');
                  setShowEditModal(false);
                  setEditingBill(null);
                  setEditFormData({});
                  
                  // Refresh the bills list
                  await fetchBills(currentPage, filters);
                  await fetchAnalytics();
                } else {
                  console.error('❌ Failed to update bill:', responseData);
                  setNotification(`❌ Failed to update bill: ${responseData.message || 'Unknown error'}`);
                }
                setTimeout(() => setNotification(null), 3000);
              } catch (error) {
                console.error('❌ Error updating bill:', error);
                console.error('❌ Error stack:', error.stack);
                setNotification(`❌ Error updating bill: ${error.message}`);
                setTimeout(() => setNotification(null), 3000);
              }
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.customerName}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Customer Address *
                  </label>
                  <textarea
                    value={editFormData.customerAddress}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      resize: 'vertical',
                      minHeight: '80px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Manufacturer *
                  </label>
                  <input
                    type="text"
                    value={editFormData.manufacturer}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Company *
                  </label>
                  <select
                    value={editFormData.assetCategory}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, assetCategory: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  >
                    <option value="">Select Company</option>
                    <option value="Chola">Chola</option>
                    <option value="IDFC">IDFC</option>
                    <option value="HDB">HDB</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Model *
                  </label>
                  <input
                    type="text"
                    value={editFormData.model}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, model: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    IMEI/Serial Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.imeiSerialNumber}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, imeiSerialNumber: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                    Asset Cost (₹) *
                  </label>
                  <input
                    type="number"
                    value={editFormData.assetCost}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, assetCost: parseFloat(e.target.value) || 0 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}>
                  <input
                    type="checkbox"
                    checked={editFormData.hdbFinance}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, hdbFinance: e.target.checked }))}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <label style={{ 
                    margin: 0, 
                    fontWeight: '600', 
                    color: '#374151',
                    cursor: 'pointer'
                  }}>
                    Finance by HDBFS
                  </label>
                </div>

                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}>
                  <input
                    type="checkbox"
                    checked={editFormData.tvsFinance}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, tvsFinance: e.target.checked }))}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <label style={{ 
                    margin: 0, 
                    fontWeight: '600', 
                    color: '#374151',
                    cursor: 'pointer'
                  }}>
                    Finance by TVS CREDIT
                  </label>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                marginTop: '32px',
                paddingTop: '20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBill(null);
                    setEditFormData({});
                  }}
                  style={{
                    padding: '12px 24px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#4b5563';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#6b7280';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#1d4ed8';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#2563eb';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="notification-toast">
          {notification}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 