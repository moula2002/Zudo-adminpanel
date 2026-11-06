import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api, { clearApiCache } from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { 
  Users, 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  User, 
  ExternalLink, 
  X, 
  Image as ImageIcon,
  Building2,
  Clock,
  Ban,
  Filter,
  Search,
  Download,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Package,
  Tag,
  Layers,
  Calendar,
  DollarSign,
  Check,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSocket } from '../context/SocketContext';

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const { refreshFlag } = useSocket();

  const [createData, setCreateData] = useState({ name: '', email: '', password: '', creditDays: 0, status: 'pending', businessName: '', b2b: false, b2c: false, isProductVisible: true });
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Seller-Wise Products State
  const [viewingSellerProducts, setViewingSellerProducts] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerProductsLoading, setSellerProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedProductPreview, setSelectedProductPreview] = useState(null);

  const fetchSellers = async () => {
    try {
      clearApiCache('/sellers');
      const { data } = await api.get('/sellers', { skipCache: true, headers: { 'Cache-Control': 'no-cache' } });
      setSellers(data);
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, [refreshFlag]);

  const handleUpdateStatus = async (id, status, isVerified) => {
    setUpdating(true);
    try {
      await api.put(`/sellers/${id}/verify`, { 
        status, 
        isVerified, 
        creditDays: selectedSeller?.creditDays || 0 
      });
      fetchSellers();
      setShowDetails(false);
      setStatus({ type: 'success', message: `Seller account updated successfully!` });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update seller status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const currentUser = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');
      const payload = { 
        ...createData, 
        status: 'pending',
        isVerified: false,
        isProductVisible: true,
        creditDays: Number(createData.creditDays) || 0,
        locationId: createData.locationId || currentUser.locationId 
      };
      await api.post('/sellers', payload);
      setStatus({ type: 'success', message: 'New seller account created successfully!' });
      setShowCreate(false);
      setCreateData({ name: '', email: '', password: '', creditDays: 0, status: 'pending', businessName: '', b2b: false, b2c: false, isProductVisible: true });
      fetchSellers();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to create seller.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const isVisible = editData.isProductVisible !== false;
      const payload = { 
        ...editData, 
        creditDays: Number(editData.creditDays) || 0,
        isProductVisible: isVisible
      };
      if (editPassword) {
        payload.password = editPassword;
      }
      
      const res = await api.put(`/sellers/${editData._id}`, payload);
      const updatedSeller = res.data;

      // Verify that backend confirmed the database update for isProductVisible
      if (updatedSeller && updatedSeller.isProductVisible !== undefined && updatedSeller.isProductVisible !== isVisible) {
        throw new Error(`Database verification failed: isProductVisible is ${updatedSeller.isProductVisible} in database, expected ${isVisible}.`);
      }
      
      clearApiCache();
      toast.success(`Seller profile updated! Products are now ${isVisible ? 'SHOW (Visible)' : 'HIDDEN'}.`);
      setStatus({ 
        type: 'success', 
        message: `Seller profile updated! Products are now ${isVisible ? 'SHOW (Visible)' : 'HIDDEN from website and mobile app'}.` 
      });
      
      setShowEdit(false);
      setEditData(null);
      setEditPassword('');
      await fetchSellers();

      // If currently viewing this seller's products, update local state
      if (viewingSellerProducts && viewingSellerProducts._id === editData._id) {
        const refreshed = {
          ...viewingSellerProducts,
          ...(updatedSeller || {}),
          isProductVisible: isVisible
        };
        setViewingSellerProducts(refreshed);
        handleViewSellerProducts(refreshed);
      }
    } catch (err) {
      console.error('Failed to update seller profile:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to update seller profile.';
      toast.error(msg);
      setStatus({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeller = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this seller account? This action cannot be undone.')) return;
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.delete(`/sellers/${id}`);
      setStatus({ type: 'success', message: 'Seller account deleted successfully!' });
      fetchSellers();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to delete seller.' });
    } finally {
      setLoading(false);
    }
  };

  // Open Seller's Uploaded Products View
  const handleViewSellerProducts = async (seller) => {
    setViewingSellerProducts(seller);
    setSellerProductsLoading(true);
    setProductSearch('');
    setProductCategoryFilter('');
    setProductStatusFilter('');
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        api.get('/products'),
        api.get('/categories')
      ]);

      let prods = [];
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value.data)) {
        prods = prodRes.value.data;
      }

      // Strict seller ID filter to ensure absolute isolation
      const sellerIdStr = seller._id.toString();
      const strictlyFiltered = prods.filter(p => {
        const pSellerId = p.sellerId?._id ? p.sellerId._id.toString() : (p.sellerId ? p.sellerId.toString() : null);
        const pSellerObjId = p.seller && p.seller._id ? p.seller._id.toString() : null;
        return pSellerId === sellerIdStr || pSellerObjId === sellerIdStr;
      });

      setSellerProducts(strictlyFiltered);

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)) {
        setCategories(catRes.value.data);
      }
    } catch (err) {
      console.error('Failed to load seller products:', err);
      toast.error('Failed to load products for this seller');
    } finally {
      setSellerProductsLoading(false);
    }
  };

  const refreshSellerProducts = () => {
    if (viewingSellerProducts) {
      handleViewSellerProducts(viewingSellerProducts);
    }
  };

  const filteredSellers = sellers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.businessName && s.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportSellers = () => {
    const exportData = filteredSellers.map(seller => ({
      'Merchant ID': seller._id,
      Name: seller.name,
      Email: seller.email,
      'Business/Store Name': seller.businessName || seller.storeName || 'Undisclosed',
      'Business Address': seller.businessAddress || 'Not listed',
      Phone: seller.phone || 'No phone',
      'GST Registration': seller.gstNumber || 'N/A',
      'PAN Card No.': seller.panNumber || 'N/A',
      'Allowed Credit Terms (Days)': seller.creditDays || 0,
      'Product Visibility': seller.isProductVisible === false ? 'HIDDEN' : 'SHOW',
      'Store Logo URL': seller.storePic ? getFullUrl(seller.storePic) : 'N/A',
      'GST Document URL': seller.gstDoc ? getFullUrl(seller.gstDoc) : 'N/A',
      'PAN Document URL': seller.panDoc ? getFullUrl(seller.panDoc) : 'N/A',
      'Trade Licence URL': seller.tradeLicenseDoc ? getFullUrl(seller.tradeLicenseDoc) : 'N/A',
      'RMC/AMPC URL': seller.rmcAmpcDoc ? getFullUrl(seller.rmcAmpcDoc) : 'N/A',
      'Food Licence URL': seller.foodLicenseDoc ? getFullUrl(seller.foodLicenseDoc) : 'N/A',
      'Verification Status': seller.status || 'pending',
      'Verified Access': seller.isVerified ? 'Verified' : 'Limited Access',
      'Approval Status': seller.isApproved ? 'Approved' : 'Pending'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sellers");
    XLSX.writeFile(wb, "Zudo_Sellers_Report.xlsx");
  };

  // Filter seller products based on search and filters
  const filteredSellerProducts = sellerProducts.filter(p => {
    const matchesSearch = !productSearch || 
      p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p._id?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.categoryId?.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.subCategoryId?.name?.toLowerCase().includes(productSearch.toLowerCase());

    const matchesCategory = !productCategoryFilter || 
      (p.categoryId?._id ? p.categoryId._id === productCategoryFilter : p.categoryId === productCategoryFilter);

    const isAvailable = (p.stock > 0) && (p.stockStatus !== 'Out of Stock');
    const matchesStatus = !productStatusFilter || 
      (productStatusFilter === 'active' ? isAvailable : !isAvailable);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const exportSellerProducts = () => {
    if (!viewingSellerProducts) return;
    const sellerTitle = viewingSellerProducts.businessName || viewingSellerProducts.name || 'Seller';
    const exportData = filteredSellerProducts.map(p => ({
      'Product ID': p._id,
      'Product Name': p.name,
      'Category': p.categoryId?.name || 'N/A',
      'SubCategory': p.subCategoryId?.name || 'N/A',
      'Seller Name': viewingSellerProducts.businessName || viewingSellerProducts.name,
      'Seller ID': viewingSellerProducts._id,
      'Visibility': (p.isProductVisible === false || viewingSellerProducts.isProductVisible === false) ? 'HIDDEN' : 'VISIBLE',
      'Price (₹)': p.price ?? p.sellerPrice ?? 0,
      'B2B Price (₹)': p.b2bPrice ?? p.price ?? 0,
      'Available Stock': p.stock ?? 0,
      'Stock Status': (p.stock > 0 && p.stockStatus !== 'Out of Stock') ? 'Available' : 'Out of Stock',
      'GST %': p.gstPercent ?? 0,
      'GST Inclusive': p.isGstInclusive ? 'Yes' : 'No',
      'Status': (p.stock > 0 && p.stockStatus !== 'Out of Stock') ? 'Active' : 'Inactive',
      'Created At': p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seller Products");
    XLSX.writeFile(wb, `${sellerTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_Products.xlsx`);
  };

  const stats = {
    total: sellers.length,
    pending: sellers.filter(s => s.status === 'pending').length,
    approved: sellers.filter(s => s.status === 'approved').length,
    rejected: sellers.filter(s => s.status === 'rejected').length
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* VIEW: SELLER-WISE PRODUCTS MANAGEMENT */}
      {viewingSellerProducts ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Header & Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setViewingSellerProducts(null)}
                className="glass-card"
                style={{
                  padding: '10px 18px',
                  borderRadius: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--card-bg)',
                  transition: '0.2s'
                }}
              >
                <ArrowLeft size={16} /> Back to Sellers
              </button>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                    {viewingSellerProducts.businessName || viewingSellerProducts.storeName || viewingSellerProducts.name}'s Products
                  </h2>
                  <span style={{ 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    color: '#6366f1', 
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: 700 
                  }}>
                    {filteredSellerProducts.length} {filteredSellerProducts.length === 1 ? 'Product' : 'Products'}
                  </span>

                  {viewingSellerProducts.isProductVisible === false ? (
                    <span style={{ 
                      background: 'rgba(239, 68, 68, 0.12)', 
                      color: '#ef4444', 
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <EyeOff size={12} /> PRODUCTS HIDDEN
                    </span>
                  ) : (
                    <span style={{ 
                      background: 'rgba(34, 197, 94, 0.12)', 
                      color: '#22c55e', 
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Eye size={12} /> PRODUCTS VISIBLE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Owner: <strong style={{ color: 'var(--text-main)' }}>{viewingSellerProducts.name}</strong></span>
                  <span>•</span>
                  <span>Email: {viewingSellerProducts.email}</span>
                  <span>•</span>
                  <span>Phone: {viewingSellerProducts.phone || 'No phone'}</span>
                  <span>•</span>
                  <span>Seller ID: <strong style={{ fontFamily: 'monospace', color: '#6366f1' }}>#{viewingSellerProducts._id.slice(-8).toUpperCase()}</strong></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={refreshSellerProducts}
                className="btn-primary"
                style={{ 
                  background: 'var(--glass-bg)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--glass-border)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  height: '42px', 
                  padding: '0 16px', 
                  borderRadius: '12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
                title="Refresh products list"
              >
                <RefreshCw size={15} className={sellerProductsLoading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button 
                onClick={exportSellerProducts} 
                className="btn-primary" 
                style={{ 
                  background: 'var(--glass-bg)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--glass-border)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  height: '42px', 
                  padding: '0 18px', 
                  borderRadius: '12px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <Download size={15} /> Export Products
              </button>
            </div>
          </div>

          {/* Alert banner if products are hidden */}
          {viewingSellerProducts.isProductVisible === false && (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              color: '#ef4444', 
              padding: '14px 20px', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: '14px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <EyeOff size={20} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>SELLER PRODUCTS ARE CURRENTLY HIDDEN</div>
                  <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                    All products uploaded by this merchant are blocked from the customer website and mobile app. They remain fully manageable by Admins below.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditData({
                    ...viewingSellerProducts,
                    isProductVisible: viewingSellerProducts.isProductVisible === false ? false : true
                  });
                  setShowEdit(true);
                }}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Configure Visibility
              </button>
            </div>
          )}

          {/* Search & Category Filter Bar */}
          <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '20px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Search by product name, ID or category..." 
                className="input-field" 
                style={{ paddingLeft: '40px', height: '42px', borderRadius: '12px', width: '100%', fontSize: '13px' }}
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>

            <div style={{ minWidth: '180px', position: 'relative' }}>
              <Filter size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <select
                className="input-field"
                style={{ paddingLeft: '36px', height: '42px', borderRadius: '12px', fontSize: '13px', appearance: 'none', cursor: 'pointer' }}
                value={productCategoryFilter}
                onChange={e => setProductCategoryFilter(e.target.value)}
              >
                <option value="">All Categories ({categories.length})</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '160px', position: 'relative' }}>
              <select
                className="input-field"
                style={{ paddingLeft: '14px', height: '42px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer' }}
                value={productStatusFilter}
                onChange={e => setProductStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active / In Stock</option>
                <option value="inactive">Out of Stock</option>
              </select>
            </div>

            {(productSearch || productCategoryFilter || productStatusFilter) && (
              <button
                onClick={() => { setProductSearch(''); setProductCategoryFilter(''); setProductStatusFilter(''); }}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>

          {/* Seller Products Table */}
          <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
            {sellerProductsLoading ? (
              <div style={{ padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                <Loader2 className="animate-spin" size={36} color="#6366f1" />
                <span style={{ fontSize: '14px', color: 'var(--text-dim)', fontWeight: 500 }}>Loading products uploaded by {viewingSellerProducts.businessName || viewingSellerProducts.name}...</span>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Product</th>
                      <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Category</th>
                      <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Seller</th>
                      <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Pricing (B2C / B2B)</th>
                      <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Available Stock</th>
                      <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>GST Details</th>
                      <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Status</th>
                      <th style={{ padding: '18px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Created Date</th>
                      <th style={{ padding: '18px 24px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSellerProducts.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                          <div style={{ opacity: 0.4, marginBottom: '14px' }}>
                            <Package size={48} style={{ margin: '0 auto' }} />
                          </div>
                          <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-main)', marginBottom: '4px' }}>
                            No products found
                          </p>
                          <p style={{ fontSize: '13px' }}>
                            {sellerProducts.length === 0 
                              ? `This seller (${viewingSellerProducts.businessName || viewingSellerProducts.name}) has not uploaded any products yet.` 
                              : 'No products match your search or filter criteria.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredSellerProducts.map(p => {
                        const inStock = (p.stock > 0) && (p.stockStatus !== 'Out of Stock');
                        const stockCount = p.stock !== undefined ? p.stock : 0;
                        const displayPrice = p.price || p.sellerPrice || 0;
                        const b2bPrice = p.b2bPrice || p.sellerB2bPrice;
                        const gstRate = p.gstPercent !== undefined ? p.gstPercent : 0;
                        const isHidden = (p.isProductVisible === false || viewingSellerProducts.isProductVisible === false);

                        return (
                          <tr key={p._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: '0.2s' }} className="hover-row">
                            {/* Product Image & Name */}
                            <td style={{ padding: '16px 24px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <img 
                                  src={getFullUrl(p.imageUrl)} 
                                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/48x48?text=Product'; }}
                                  alt={p.name}
                                  style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', background: 'var(--input-bg)', border: '1px solid var(--glass-border)' }}
                                />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)', maxWidth: '240px', lineHeight: '1.3' }}>
                                      {p.name}
                                    </span>
                                    {isHidden && (
                                      <span style={{ 
                                        background: 'rgba(239, 68, 68, 0.15)', 
                                        color: '#ef4444', 
                                        border: '1px solid rgba(239, 68, 68, 0.35)', 
                                        padding: '2px 7px', 
                                        borderRadius: '6px', 
                                        fontSize: '10px', 
                                        fontWeight: 800, 
                                        letterSpacing: '0.5px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}>
                                        <EyeOff size={10} /> HIDDEN
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-dim)', marginTop: '3px' }}>
                                    ID: #{p._id.slice(-8).toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category & Subcategory */}
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                                {p.categoryId?.name || <span style={{ color: 'var(--text-dim)' }}>General</span>}
                              </div>
                              {p.subCategoryId?.name && (
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                  {p.subCategoryId.name}
                                </div>
                              )}
                            </td>

                            {/* Seller Name */}
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6366f1' }}>
                                {viewingSellerProducts.businessName || viewingSellerProducts.storeName || viewingSellerProducts.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {viewingSellerProducts.name}
                              </div>
                            </td>

                            {/* Price / B2B Price */}
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                                ₹{displayPrice.toLocaleString()}
                              </div>
                              {b2bPrice ? (
                                <div style={{ 
                                  fontSize: '11px', 
                                  color: '#10b981', 
                                  fontWeight: 700, 
                                  background: 'rgba(16, 185, 129, 0.08)', 
                                  padding: '2px 6px', 
                                  borderRadius: '6px', 
                                  display: 'inline-block',
                                  marginTop: '3px',
                                  border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                  B2B: ₹{b2bPrice.toLocaleString()}
                                </div>
                              ) : (
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Standard</div>
                              )}
                            </td>

                            {/* Available Stock */}
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: inStock ? 'var(--text-main)' : '#ef4444' }}>
                                  {stockCount}
                                </span>
                                <span style={{ 
                                  padding: '3px 8px', 
                                  borderRadius: '8px', 
                                  fontSize: '10px', 
                                  fontWeight: 700,
                                  background: inStock ? (stockCount <= 10 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)') : 'rgba(239, 68, 68, 0.1)',
                                  color: inStock ? (stockCount <= 10 ? '#f59e0b' : '#22c55e') : '#ef4444',
                                  border: `1px solid ${inStock ? (stockCount <= 10 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)') : 'rgba(239, 68, 68, 0.2)'}`
                                }}>
                                  {inStock ? (stockCount <= 10 ? 'Low Stock' : 'In Stock') : 'Out of Stock'}
                                </span>
                              </div>
                            </td>

                            {/* GST Details */}
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                                {gstRate}% GST
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {p.isGstInclusive ? 'Inclusive' : 'Exclusive'}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                <span style={{ 
                                  padding: '5px 12px', 
                                  borderRadius: '12px', 
                                  fontSize: '10px', 
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  background: inStock ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: inStock ? '#22c55e' : '#ef4444',
                                  border: `1px solid ${inStock ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                }}>
                                  {inStock ? 'Active' : 'Inactive'}
                                </span>
                                {isHidden && (
                                  <span style={{ 
                                    padding: '3px 8px', 
                                    borderRadius: '8px', 
                                    fontSize: '9px', 
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    background: 'rgba(239, 68, 68, 0.12)',
                                    color: '#ef4444',
                                    border: '1px solid rgba(239, 68, 68, 0.25)'
                                  }}>
                                    Hidden
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Created Date */}
                            <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </td>

                            {/* Actions Column */}
                            <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                              <button
                                onClick={() => setSelectedProductPreview(p)}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.1)',
                                  border: '1px solid rgba(99, 102, 241, 0.2)',
                                  color: '#6366f1',
                                  padding: '7px 12px',
                                  borderRadius: '9px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  transition: '0.2s'
                                }}
                                title="Quick View Product Details"
                              >
                                <Eye size={12} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VIEW: MAIN SELLERS LIST */
        <>
          {/* Header Section */}
          <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Sellers Portfolio</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Validate and manage your platform's merchant network</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={exportSellers} 
                className="btn-primary" 
                style={{ 
                  background: 'var(--glass-bg)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--glass-border)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  height: '48px', 
                  padding: '0 24px', 
                  borderRadius: '16px' 
                }}
              >
                <Download size={18} /> Export
              </button>
              <button 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '48px', padding: '0 24px', borderRadius: '16px' }} 
                onClick={() => setShowCreate(!showCreate)}
              >
                {showCreate ? <X size={20} /> : <UserPlus size={20} />}
                <span>{showCreate ? 'Close Form' : 'Onboard New Seller'}</span>
              </button>
            </div>
          </div>

          {/* Stats Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            {[
              { label: 'Total Merchants', value: stats.total, icon: Users, color: '#6366f1' },
              { label: 'Pending Approval', value: stats.pending, icon: Clock, color: '#f59e0b' },
              { label: 'Verified Partners', value: stats.approved, icon: CheckCircle2, color: '#22c55e' },
              { label: 'Declined', value: stats.rejected, icon: Ban, color: '#ef4444' },
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ padding: '12px', background: `${stat.color}15`, color: stat.color, borderRadius: '14px' }}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {status.message && (
            <div style={{ 
              background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              border: `1px solid ${status.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, 
              color: status.type === 'success' ? '#22c55e' : '#ef4444', 
              padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px',
              animation: 'slideDown 0.3s ease-out'
            }}>
              {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{status.message}</span>
            </div>
          )}

          {showCreate && (
            <div className="glass-card" style={{ padding: '32px', borderRadius: '28px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <form onSubmit={handleCreate}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ width: '8px', height: '24px', background: '#6366f1', borderRadius: '4px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Merchant Registration</h3>
                </div>
                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name</label>
                    <input type="text" placeholder="John Doe" className="input-field" required value={createData.name} onChange={e => setCreateData({...createData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                    <input type="email" placeholder="john@example.com" className="input-field" required value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Secure Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showCreatePassword ? "text" : "password"} placeholder="••••••••" className="input-field" style={{ width: '100%', paddingRight: '40px' }} required value={createData.password} onChange={e => setCreateData({...createData, password: e.target.value})} />
                      <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Company Name</label>
                    <input type="text" placeholder="e.g. Acme Corp" className="input-field" value={createData.businessName} onChange={e => setCreateData({...createData, businessName: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Allowed Credit Days</label>
                    <input type="number" placeholder="e.g. 7" className="input-field" value={createData.creditDays} onChange={e => setCreateData({...createData, creditDays: Number(e.target.value) || 0})} min="0" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Business Type (Optional)</label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '48px', background: 'var(--input-bg)', padding: '0 16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>
                        <input type="checkbox" checked={createData.b2b} onChange={e => setCreateData({...createData, b2b: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} /> B2B
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>
                        <input type="checkbox" checked={createData.b2c} onChange={e => setCreateData({...createData, b2c: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} /> B2C
                      </label>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '0 32px' }} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex-responsive" style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Search by name, business or email..." 
                className="input-field" 
                style={{ paddingLeft: '48px', height: '48px', borderRadius: '16px' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="glass-card" style={{ padding: '0 20px', borderRadius: '16px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Filter size={18} />
              <span style={{ fontWeight: 600, fontSize: '14px' }}>Filter</span>
            </button>
          </div>

          {/* Main Table Section */}
          <div className="glass-card" style={{ borderRadius: '28px', overflow: 'hidden' }}>
            {fetchLoading ? (
              <div style={{ padding: '100px', display: 'flex', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" size={40} color="#6366f1" />
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
                      <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Merchant</th>
                      <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Business Assets</th>
                      <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Verification</th>
                      <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSellers.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '100px', textAlign: 'center', color: 'var(--text-dim)' }}>
                          <div style={{ opacity: 0.5, marginBottom: '16px' }}><Users size={48} style={{ margin: '0 auto' }} /></div>
                          <p style={{ fontWeight: 500 }}>No merchants found matching your criteria.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredSellers.map((seller) => (
                        <tr key={seller._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: '0.2s' }} className="hover-row">
                          <td style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ 
                                width: '44px', height: '44px', borderRadius: '14px', 
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                                color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontWeight: 700, fontSize: '18px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                              }}>
                                {seller.name[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {seller.name}
                                  {seller.isVerified && <CheckCircle2 size={16} color="#22c55e" />}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Mail size={12} />
                                  <span>{seller.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '20px 24px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Building2 size={16} color="var(--primary)" />
                              {seller.businessName || seller.storeName || <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>Undisclosed</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span>{seller.phone || 'No phone'}</span>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--glass-border)' }} />
                              <span style={{ color: '#6366f1', fontWeight: 700, background: 'rgba(99, 102, 241, 0.08)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>{seller.creditDays || 0} Credit Days</span>
                              
                              {/* Product Visibility Badge */}
                              {seller.isProductVisible === false && (
                                <>
                                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--glass-border)' }} />
                                  <span style={{ 
                                    color: '#ef4444', 
                                    fontWeight: 800, 
                                    background: 'rgba(239, 68, 68, 0.1)', 
                                    padding: '2px 8px', 
                                    borderRadius: '6px', 
                                    fontSize: '11px', 
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    <EyeOff size={11} /> HIDDEN
                                  </span>
                                </>
                              )}

                              {(seller.b2b || seller.b2c) && (
                                <>
                                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--glass-border)' }} />
                                  <span style={{ color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.08)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                    {seller.b2b && seller.b2c ? 'B2B & B2C' : seller.b2b ? 'B2B' : 'B2C'}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '20px 24px' }}>
                            <span style={{ 
                              padding: '6px 14px', 
                              borderRadius: '12px', 
                              fontSize: '10px', 
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              background: 
                                seller.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 
                                seller.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              color: 
                                seller.status === 'approved' ? '#22c55e' : 
                                seller.status === 'rejected' ? '#ef4444' : '#f59e0b'
                            }}>
                              {seller.status || 'pending'}
                            </span>
                          </td>

                          <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* Eye Icon - View Seller Products */}
                              <button 
                                onClick={() => handleViewSellerProducts(seller)}
                                style={{ 
                                  background: 'rgba(99, 102, 241, 0.1)', 
                                  border: '1px solid rgba(99, 102, 241, 0.25)', 
                                  color: '#6366f1', 
                                  padding: '8px 12px', 
                                  borderRadius: '10px', 
                                  cursor: 'pointer', 
                                  fontSize: '11px', 
                                  fontWeight: 700, 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '6px', 
                                  transition: '0.2s'
                                }}
                                title={`View products uploaded by ${seller.businessName || seller.name}`}
                              >
                                <Eye size={13} /> View Products
                              </button>

                              <button 
                                onClick={() => { setSelectedSeller(seller); setShowDetails(true); }}
                                style={{ 
                                  background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', color: 'var(--text-main)', 
                                  padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', 
                                  fontSize: '11px', fontWeight: 700, display: 'inline-flex', 
                                  alignItems: 'center', gap: '6px', transition: '0.2s'
                                }}
                                title="Audit Merchant Documents"
                              >
                                <ExternalLink size={12} /> Audit Docs
                              </button>
                              <button 
                                onClick={() => { 
                                  setEditData({
                                    ...seller,
                                    isProductVisible: seller.isProductVisible === false ? false : true
                                  }); 
                                  setShowEdit(true); 
                                }}
                                style={{ 
                                  background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', 
                                  padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', 
                                  fontSize: '11px', fontWeight: 700, display: 'inline-flex', 
                                  alignItems: 'center', gap: '6px', transition: '0.2s'
                                }}
                                title="Edit Merchant Profile"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteSeller(seller._id)}
                                style={{ 
                                  background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', 
                                  padding: '8px', borderRadius: '10px', cursor: 'pointer', 
                                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                                }}
                                title="Delete Merchant Account"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* QUICK PRODUCT PREVIEW MODAL */}
      {selectedProductPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Product Specification</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>ID: #{selectedProductPreview._id}</p>
              </div>
              <button 
                onClick={() => setSelectedProductPreview(null)} 
                style={{ background: 'rgba(0,0,0,0.06)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                <img 
                  src={getFullUrl(selectedProductPreview.imageUrl)} 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/100x100?text=Product'; }}
                  alt={selectedProductPreview.name}
                  style={{ width: '90px', height: '90px', borderRadius: '16px', objectFit: 'cover', border: '1px solid var(--glass-border)', background: 'var(--input-bg)' }}
                />
                <div>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                    {selectedProductPreview.name}
                  </h4>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      Category: {selectedProductPreview.categoryId?.name || 'General'}
                    </span>
                    {selectedProductPreview.subCategoryId?.name && (
                      <span style={{ fontSize: '11px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-dim)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        {selectedProductPreview.subCategoryId.name}
                      </span>
                    )}
                    <span style={{ 
                      fontSize: '11px', 
                      background: selectedProductPreview.stock > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                      color: selectedProductPreview.stock > 0 ? '#22c55e' : '#ef4444', 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontWeight: 700 
                    }}>
                      {selectedProductPreview.stock > 0 ? `In Stock (${selectedProductPreview.stock})` : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '14px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-dim)' }}>Selling Price</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                    ₹{(selectedProductPreview.price || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-dim)' }}>B2B Wholesale</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                    ₹{(selectedProductPreview.b2bPrice || selectedProductPreview.price || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-dim)' }}>Seller Base Price</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                    ₹{(selectedProductPreview.sellerPrice || selectedProductPreview.price || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ padding: '14px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-dim)' }}>GST Applicable</span>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                    {selectedProductPreview.gstPercent || 0}%
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-dim)' }}>Seller / Store</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    {viewingSellerProducts.businessName || viewingSellerProducts.name}
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-dim)' }}>Unit & MOQ</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                    Unit: {selectedProductPreview.unit || 'Standard'} • MOQ: {selectedProductPreview.moq || 1}
                  </div>
                </div>
              </div>

              {/* B2B / Packaging Sizes (if available) */}
              {selectedProductPreview.b2b && selectedProductPreview.b2b.length > 0 && (
                <div>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    B2B Packaging Options
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedProductPreview.b2b.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--glass-border)', fontSize: '13px' }}>
                        <span style={{ fontWeight: 600 }}>{item.packetSize || `Pack #${idx + 1}`}</span>
                        <span>
                          <strong style={{ color: 'var(--text-main)' }}>₹{item.price}</strong>
                          {item.mrp ? <span style={{ textDecoration: 'line-through', color: 'var(--text-dim)', marginLeft: '8px', fontSize: '11px' }}>₹{item.mrp}</span> : null}
                          <span style={{ marginLeft: '12px', color: item.stock > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                            Stock: {item.stock || 0}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedProductPreview.description && (
                <div>
                  <h5 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Description
                  </h5>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', background: 'var(--input-bg)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--glass-border)', lineHeight: '1.5' }}>
                    {selectedProductPreview.description}
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', background: 'rgba(255,255,255,0.01)' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setSelectedProductPreview(null)}
                style={{ padding: '0 24px', height: '40px', fontSize: '13px' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Seller Audit & Verification Modal */}
      {showDetails && selectedSeller && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Account Audit</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Review credentials for {selectedSeller.name}</p>
              </div>
              <button onClick={() => setShowDetails(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                   <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Business Identity</label>
                   <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedSeller.businessName || 'Name not provided'}</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', lineHeight: '1.4' }}>{selectedSeller.businessAddress || 'Address not listed'}</div>
                </div>
                
                <div style={{ padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                   <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>GST Registration</label>
                   <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>{selectedSeller.gstNumber || 'N/A'}</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                   <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>PAN Card No.</label>
                   <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>{selectedSeller.panNumber || 'N/A'}</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                   <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>QR Option / UPI ID</label>
                   <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>{selectedSeller.qrOption || 'N/A'}</div>
                </div>

                <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Terms</label>
                     <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>Allowed Credit Terms</span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <input 
                       type="number" 
                       className="input-field" 
                       style={{ width: '80px', height: '32px', margin: 0, padding: '0 8px', fontSize: '13px', textAlign: 'center', borderRadius: '8px' }}
                       value={selectedSeller.creditDays || 0}
                       onChange={(e) => setSelectedSeller({ ...selectedSeller, creditDays: Number(e.target.value) || 0 })}
                       placeholder="Days"
                       min="0"
                     />
                     <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>Days</span>
                   </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                {[
                  { label: 'Store Picture', val: selectedSeller.storePic },
                  { label: 'GST Doc', val: selectedSeller.gstDoc },
                  { label: 'PAN Doc', val: selectedSeller.panDoc },
                  { label: 'Trade License', val: selectedSeller.tradeLicenseDoc },
                  { label: 'RMC/AMPC', val: selectedSeller.rmcAmpcDoc },
                  { label: 'Food License', val: selectedSeller.foodLicenseDoc },
                ].map((doc, idx) => (
                  <div key={idx} style={{ 
                    border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', 
                    textAlign: 'center', background: 'var(--input-bg)', display: 'flex', flexDirection: 'column', 
                    justifyContent: 'space-between', minHeight: '90px' 
                  }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)' }}>{doc.label}</span>
                    {doc.val ? (
                      <a 
                        href={getFullUrl(doc.val)} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ color: '#6366f1', fontSize: '11px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px', fontWeight: 600 }}
                      >
                        <ImageIcon size={12} /> View File
                      </a>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', opacity: 0.6 }}>Not Uploaded</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleUpdateStatus(selectedSeller._id, 'approved', true)}
                  disabled={updating}
                  style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={14} /> Approve Account
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedSeller._id, 'rejected', false)}
                  disabled={updating}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Decline
                </button>
              </div>

              <button 
                type="button" 
                className="btn-primary" 
                style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--glass-border)', padding: '0 16px', height: '36px', fontSize: '12px' }} 
                onClick={() => setShowDetails(false)}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Merchant Modal */}
      {showEdit && editData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', borderRadius: '28px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <form onSubmit={handleEditSubmit}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Edit Merchant Profile</h3>
                <button type="button" onClick={() => { setShowEdit(false); setEditData(null); setEditPassword(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name</label>
                    <input type="text" className="input-field" required value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                    <input type="email" className="input-field" required value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Phone Number</label>
                    <input type="text" className="input-field" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Allowed Credit Days</label>
                    <input type="number" className="input-field" value={editData.creditDays || 0} onChange={e => setEditData({...editData, creditDays: e.target.value})} min="0" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>New Password (Leave blank to keep unchanged)</label>
                  <input type="password" placeholder="••••••••" className="input-field" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Company / Store Name</label>
                    <input type="text" className="input-field" value={editData.businessName || ''} onChange={e => setEditData({...editData, businessName: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>GST Number</label>
                    <input type="text" className="input-field" value={editData.gstNumber || ''} onChange={e => setEditData({...editData, gstNumber: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Business Address</label>
                  <textarea className="input-field" style={{ height: '80px', padding: '12px' }} value={editData.businessAddress || ''} onChange={e => setEditData({...editData, businessAddress: e.target.value})} />
                </div>



                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Verification Status</label>
                    <select className="input-field" value={editData.status || 'pending'} onChange={e => setEditData({...editData, status: e.target.value, isVerified: e.target.value === 'approved'})}>
                      <option value="pending">Pending Review (Limited Access)</option>
                      <option value="approved">Approved & Verified (Full Access)</option>
                      <option value="rejected">Rejected / Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Business Type</label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', height: '48px', background: 'var(--input-bg)', padding: '0 16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>
                        <input type="checkbox" checked={editData.b2b || false} onChange={e => setEditData({...editData, b2b: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} /> B2B
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-main)', fontWeight: 600 }}>
                        <input type="checkbox" checked={editData.b2c || false} onChange={e => setEditData({...editData, b2c: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} /> B2C
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="isVerified"
                    checked={editData.isVerified || false} 
                    onChange={e => setEditData({...editData, isVerified: e.target.checked})}
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  <label htmlFor="isVerified" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                    Manually set as Verified (Shield Enabled)
                  </label>
                </div>
              </div>

              {/* Modal Footer with Product Visibility Selector */}
              <div style={{ padding: '24px 40px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.01)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 700 }}>Product Visibility:</span>
                  <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '12px', border: '1px solid var(--glass-border)', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, isProductVisible: true })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: editData.isProductVisible !== false ? '#22c55e' : 'transparent',
                        color: editData.isProductVisible !== false ? '#ffffff' : 'var(--text-dim)',
                        boxShadow: editData.isProductVisible !== false ? '0 2px 10px rgba(34,197,94,0.35)' : 'none',
                        transition: '0.2s'
                      }}
                      title="Make merchant products visible to customers across website and apps"
                    >
                      <Eye size={13} />
                      <span>SHOW</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditData({ ...editData, isProductVisible: false })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '9px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: editData.isProductVisible === false ? '#ef4444' : 'transparent',
                        color: editData.isProductVisible === false ? '#ffffff' : 'var(--text-dim)',
                        boxShadow: editData.isProductVisible === false ? '0 2px 10px rgba(239,68,68,0.35)' : 'none',
                        transition: '0.2s'
                      }}
                      title="Hide merchant products from customer website and mobile applications"
                    >
                      <EyeOff size={13} />
                      <span>HIDDEN</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn-primary" 
                    style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }} 
                    onClick={() => { setShowEdit(false); setEditData(null); setEditPassword(''); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" style={{ padding: '0 32px' }} disabled={loading}>
                    {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sellers;
