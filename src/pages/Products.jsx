import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api, { clearApiCache } from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { Package, Search, Tag, Loader2, Plus, Filter, Download, Edit3, Trash2, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

/**
 * Commission Contract Definition:
 * @typedef {Object} CommissionContract
 * @property {'flat' | 'percentage'} commissionType
 * @property {number} commissionValue
 * @property {number} commissionAmount
 * @property {Object|null} appliedRule
 */

const normalizeId = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val.trim();
  if (val._id) return normalizeId(val._id);
  if (typeof val.toString === 'function') return val.toString().trim();
  return '';
};

const normalizeUnit = (u) => (u || '').trim().toLowerCase();

/**
 * Resolves the applicable category commission according to the platform contract.
 * Explicit read-only server constraint:
 * When the server is read-only or returns zero/uninitialized commission values for a product,
 * this function matches against the live database commissions array to resolve the
 * category-based commission configured in MongoDB.
 */
const resolveProductCommission = (product, commissions = [], categories = []) => {
  // If product already has an explicit custom commission value > 0 and commissionType
  const hasCustomComm = product.commissionValue !== undefined && product.commissionValue !== null && Number(product.commissionValue) > 0;

  const productCatId = normalizeId(product.categoryId);
  let productCatName = (typeof product.categoryId?.name === 'string' ? product.categoryId.name : '').trim().toLowerCase();
  if (!productCatName && productCatId && Array.isArray(categories)) {
    const foundCat = categories.find(c => normalizeId(c._id) === productCatId);
    if (foundCat && foundCat.name) productCatName = foundCat.name.trim().toLowerCase();
  }
  productCatName = productCatName.replace(/\s+/g, ' ');

  // Extract units from product root and variants (e.g. '30kg' -> 'kg', 'pcs')
  const prodUnit = normalizeUnit(product.unit);
  const variantUnits = [];
  const checkArr = (arr) => {
    if (Array.isArray(arr)) {
      arr.forEach(v => {
        if (v?.packetSize && typeof v.packetSize === 'string') {
          const match = v.packetSize.match(/[a-zA-Z]+/g);
          if (match && match.length > 0) {
            variantUnits.push(match[match.length - 1].toLowerCase());
          }
        }
      });
    }
  };
  checkArr(product.b2b);
  checkArr(product.b2c);
  checkArr(product.variants);

  // Filter commissions to only those matching this product's category
  const matchingCatComms = commissions.filter(c => {
    const cCatId = normalizeId(c.categoryId);
    let cCatName = (typeof c.categoryId?.name === 'string' ? c.categoryId.name : '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cCatName && cCatId && Array.isArray(categories)) {
      const found = categories.find(cat => normalizeId(cat._id) === cCatId);
      if (found && found.name) cCatName = found.name.trim().toLowerCase().replace(/\s+/g, ' ');
    }
    const idMatch = productCatId && cCatId && productCatId === cCatId;
    const nameMatch = productCatName && cCatName && productCatName === cCatName;
    return idMatch || nameMatch;
  });

  let matchedRule = null;

  if (matchingCatComms.length > 0) {
    // 1. Exact unit match with product.unit
    if (prodUnit) {
      matchedRule = matchingCatComms.find(c => normalizeUnit(c.unit) === prodUnit);
    }
    // 2. Exact unit match with any variant unit
    if (!matchedRule && variantUnits.length > 0) {
      matchedRule = matchingCatComms.find(c => variantUnits.includes(normalizeUnit(c.unit)));
    }
    // 3. Category fallback (first applicable rule for that category)
    if (!matchedRule) {
      matchedRule = matchingCatComms[0];
    }
  }

  // Determine effective commission type and value
  let effectiveType = 'flat';
  let effectiveVal = 0;

  if (hasCustomComm) {
    effectiveType = product.commissionType === 'percentage' ? 'percentage' : 'flat';
    effectiveVal = Number(product.commissionValue);
  } else if (matchedRule) {
    effectiveType = matchedRule.commissionType === 'percentage' ? 'percentage' : 'flat';
    effectiveVal = Number(matchedRule.commissionValue) || 0;
  } else if (product.commissionValue !== undefined && product.commissionValue !== null) {
    effectiveType = product.commissionType === 'percentage' ? 'percentage' : 'flat';
    effectiveVal = Number(product.commissionValue) || 0;
  }

  return {
    commissionType: effectiveType,
    commissionValue: effectiveVal,
    appliedRule: matchedRule
  };
};

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { refreshFlag } = useSocket() || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [deleteModalData, setDeleteModalData] = useState({ show: false, productId: null, productName: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes, commRes] = await Promise.allSettled([
        api.get('/products', { skipCache: true, headers: { 'Cache-Control': 'no-cache', 'pragma': 'no-cache' } }),
        api.get('/categories', { skipCache: true, headers: { 'Cache-Control': 'no-cache', 'pragma': 'no-cache' } }),
        api.get('/commissions', { skipCache: true, headers: { 'Cache-Control': 'no-cache', 'pragma': 'no-cache' } })
      ]);
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        setProducts(Array.isArray(prodRes.value.data) ? prodRes.value.data : []);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        const rawCats = catRes.value.data;
        setCategories(Array.isArray(rawCats) ? rawCats : (rawCats?.categories || rawCats?.data || []));
      }
      if (commRes.status === 'fulfilled' && commRes.value?.data) {
        const rawComms = commRes.value.data;
        setCommissions(Array.isArray(rawComms) ? rawComms : (rawComms?.commissions || rawComms?.data || []));
      }
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshFlag, refreshTrigger]);

  const uniqueSellers = Array.from(new Set(products.map(p => p.sellerName || 'Zudo Official')));

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? product.categoryId?._id === selectedCategory || product.categoryId === selectedCategory : true;
    const matchesSeller = selectedSeller ? (product.sellerName || 'Zudo Official') === selectedSeller : true;
    return matchesSearch && matchesCategory && matchesSeller;
  });

  const openDeleteModal = (id, name) => {
    setDeleteModalData({ show: true, productId: id, productName: name });
  };

  const confirmDeleteProduct = async () => {
    try {
      await api.delete(`/products/${deleteModalData.productId}`);
      setProducts(products.filter(p => p._id !== deleteModalData.productId));
      setDeleteModalData({ show: false, productId: null, productName: '' });
    } catch (error) {
      console.error("Error deleting product", error);
      toast.error("Failed to delete product");
    }
  };

  const getLowestStock = (product) => {
    let minStock = Infinity;
    let hasVariants = false;

    const checkArr = (arr) => {
      if (arr && arr.length > 0) {
        hasVariants = true;
        arr.forEach(v => {
          if (v.stock !== undefined && v.stock !== null && v.stock < minStock) {
            minStock = v.stock;
          }
        });
      }
    };

    checkArr(product.b2b);
    checkArr(product.b2c);
    checkArr(product.variants);

    if (!hasVariants) return product.stock || 0;
    return minStock === Infinity ? 0 : minStock;
  };

  const getPricingBreakdown = (product) => {
    const isB2B = Boolean(
      (product.b2b && product.b2b.length > 0) || 
      (product.b2bPrice && (!product.price || product.price === product.b2bPrice))
    );

    const baseSellerPrice = isB2B
      ? (product.sellerB2bPrice ?? product.sellerPrice ?? product.b2bPrice ?? product.price ?? 0)
      : (product.sellerPrice ?? product.sellerB2bPrice ?? product.price ?? product.b2bPrice ?? 0);

    const sellerPrice = Number(baseSellerPrice) || 0;

    const commContract = resolveProductCommission(product, commissions, categories);
    let commType = commContract.commissionType;
    let commVal = commContract.commissionValue;
    let commAmount = Number(product.commissionAmount) || 0;

    // Check variant if root has 0 commission
    if (commVal === 0 && isB2B && Array.isArray(product.b2b) && product.b2b.length > 0) {
      const v0 = product.b2b[0];
      if (v0.commissionAmount && Number(v0.commissionAmount) > 0) commAmount = Number(v0.commissionAmount);
      if (v0.commissionValue && Number(v0.commissionValue) > 0) {
        commVal = Number(v0.commissionValue);
        if (v0.commissionType) commType = v0.commissionType === 'percentage' ? 'percentage' : 'flat';
      }
    }

    if (commVal > 0) {
      commAmount = commType === 'percentage' ? (sellerPrice * commVal) / 100 : commVal;
    }
    commAmount = Math.round(commAmount * 100) / 100;

    const priceAfterComm = Math.round((sellerPrice + commAmount) * 100) / 100;
    const gstRate = Number(product.gstPercent) || 0;

    let gstAmount = 0;
    let finalCustomerPrice = priceAfterComm;

    if (isB2B) {
      gstAmount = Math.round((priceAfterComm * (gstRate / 100)) * 100) / 100;
      finalCustomerPrice = Math.round((priceAfterComm + gstAmount) * 100) / 100;
    } else {
      if (gstRate > 0) {
        const baseBeforeGst = priceAfterComm / (1 + gstRate / 100);
        gstAmount = Math.round((priceAfterComm - baseBeforeGst) * 100) / 100;
      }
      finalCustomerPrice = priceAfterComm;
    }

    return {
      isB2B,
      sellerPrice,
      commType,
      commVal,
      commAmount,
      gstRate,
      gstAmount,
      finalCustomerPrice
    };
  };

  const exportProducts = () => {
    const exportData = filteredProducts.map(product => {
      const b = getPricingBreakdown(product);
      return {
        ID: product._id,
        'Product Name': product.name,
        'Seller Name': product.sellerName || 'Zudo Official',
        'Seller GST': product.sellerGstNumber || 'N/A',
        Category: product.categoryId?.name || product.categoryId,
        Subcategory: product.subCategoryId?.name || 'No Subcategory',
        'Seller Price (₹)': b.sellerPrice,
        'Commission Type': b.commType === 'percentage' ? 'Percentage (%)' : 'Flat (₹)',
        'Commission Rate': b.commVal,
        'Commission Amount (₹)': b.commAmount,
        'GST Rate (%)': b.gstRate,
        'GST Amount (₹)': b.gstAmount,
        'Final Customer Price (₹)': b.finalCustomerPrice,
        'B2C Price (₹)': product.price,
        'B2B Price (₹)': product.b2bPrice,
        Stock: getLowestStock(product),
        Unit: product.unit
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "Zudo_Products_Catalog.xlsx");
  };

  const getVariantSizes = (variants) => {
    if (!variants || variants.length === 0) return 'N/A';
    return variants.map(v => v.packetSize).join(', ');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap', minWidth: 'max-content' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search products by name..."
              className="input-field"
              style={{ paddingLeft: '40px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative', width: '160px' }}>
            <Filter size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            <select
              className="input-field"
              style={{ paddingLeft: '40px', appearance: 'none' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div style={{ position: 'relative', width: '160px' }}>
            <Filter size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
            <select
              className="input-field"
              style={{ paddingLeft: '40px', appearance: 'none' }}
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <option value="">All Sellers</option>
              {uniqueSellers.map((seller, idx) => (
                <option key={idx} value={seller}>{seller}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 'max-content' }}>
          <button
            onClick={() => {
              clearApiCache();
              setRefreshTrigger(prev => prev + 1);
              toast.success('Refreshing products & commissions...');
            }}
            className="btn-primary"
            style={{
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            title="Refresh product list and live commission values"
          >
            <RefreshCw size={18} /> Refresh
          </button>
          <button
            onClick={exportProducts}
            className="btn-primary"
            style={{
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download size={18} /> Export
          </button>
          <button
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => navigate('/add-product')}
          >
            <Plus size={18} /> Add New Product
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Product</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Seller Details</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600, minWidth: '220px' }}>Pricing Breakdown</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>B2C Size Value</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>B2B Size Value</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>GST %</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Stock</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ padding: '48px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="9" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>No products found matching your search or filter.</td></tr>
            ) : filteredProducts.map(product => (
              <tr key={product._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={getFullUrl(product.imageUrl)} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40?text=No+Image'; }} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                    <span>{product.name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                      {product.sellerName || 'Zudo Official'}
                    </span>
                    {product.sellerGstNumber && product.sellerGstNumber !== 'N/A' && product.sellerGstNumber !== 'Not Available' ? (
                      <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        fontSize: '11px', 
                        background: 'rgba(99, 102, 241, 0.08)', 
                        color: '#6366f1', 
                        border: '1px solid rgba(99, 102, 241, 0.2)', 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        fontWeight: 600,
                        width: 'fit-content'
                      }}>
                        <span>GST: {product.sellerGstNumber}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        GST: {product.sellerGstNumber || 'N/A'}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px' }}>{product.categoryId?.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{product.subCategoryId?.name || 'No Subcategory'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  {(() => {
                    const b = getPricingBreakdown(product);
                    return (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px', 
                        fontSize: '12px', 
                        minWidth: '190px',
                        background: 'rgba(0, 0, 0, 0.02)',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-dim)' }}>
                          <span>Seller Price:</span>
                          <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>₹{b.sellerPrice}</strong>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#6366f1' }}>
                          <span>Commission:</span>
                          <span style={{ fontWeight: 600, fontSize: '11px' }}>
                            {b.commVal > 0 
                              ? `${b.commVal}${b.commType === 'percentage' ? '%' : ' flat'} (+₹${b.commAmount})` 
                              : (b.commAmount > 0 ? `+₹${b.commAmount}` : '₹0')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f59e0b' }}>
                          <span>GST ({b.gstRate}%):</span>
                          <span style={{ fontWeight: 600, fontSize: '11px' }}>
                            {b.gstRate > 0 ? `+₹${b.gstAmount}${b.isB2B ? '' : ' (inc)'}` : '₹0'}
                          </span>
                        </div>

                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          paddingTop: '6px', 
                          marginTop: '2px', 
                          borderTop: '1px dashed var(--glass-border)',
                          fontWeight: 800, 
                          color: '#10b981',
                          fontSize: '13px'
                        }}>
                          <span>Final Price:</span>
                          <span>₹{b.finalCustomerPrice}</span>
                        </div>
                      </div>
                    );
                  })()}
                </td>
                <td style={{ padding: '16px 24px' }}>{getVariantSizes(product.b2c)}</td>
                <td style={{ padding: '16px 24px' }}>{getVariantSizes(product.b2b)}</td>
                <td style={{ padding: '16px 24px' }}>{product.gstPercent || 0}%</td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: getLowestStock(product) <= 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: getLowestStock(product) <= 10 ? '#ef4444' : '#22c55e'
                    }}>
                      {getLowestStock(product)}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/edit-product/${product._id}`)}
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Edit Product"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(product._id, product.name)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete Product"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom Delete Modal */}
      {deleteModalData.show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', width: '360px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Delete Product</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-main)' }}>{deleteModalData.productName}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteModalData({ show: false, productId: null, productName: '' })}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
