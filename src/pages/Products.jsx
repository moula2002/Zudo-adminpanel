import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { Package, Search, Tag, Loader2, Plus, Filter, Download, Edit3, Trash2, Calculator, X, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { refreshFlag } = useSocket();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [deleteModalData, setDeleteModalData] = useState({ show: false, productId: null, productName: '' });
  const [simulatorProduct, setSimulatorProduct] = useState(null);
  const [simQty, setSimQty] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes, commRes] = await Promise.allSettled([
          api.get('/products'),
          api.get('/categories'),
          api.get('/commissions')
        ]);
        if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
        if (catRes.status === 'fulfilled') setCategories(catRes.value.data || []);
        if (commRes.status === 'fulfilled') {
          const raw = commRes.value.data;
          setCommissions(Array.isArray(raw) ? raw : (raw?.commissions || raw?.data || []));
        }
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshFlag]);

  const uniqueSellers = Array.from(new Set(products.map(p => p.sellerName || 'Zudo Official')));

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? (product.categoryId?._id === selectedCategory || product.categoryId === selectedCategory) : true;
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
      toast.success("Product deleted successfully");
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

  const getProductPricingInfo = (product) => {
    const sellerUnitPrice = product.sellerUnitPrice !== undefined && product.sellerUnitPrice !== null
      ? Number(product.sellerUnitPrice)
      : (product.sellerPrice !== undefined && product.sellerPrice !== null ? Number(product.sellerPrice) : Number(product.price || 0));

    const isFlat = (product.commissionType || 'flat') === 'flat';
    const commissionRate = product.commissionRate !== undefined && product.commissionRate !== null
      ? Number(product.commissionRate)
      : Number(product.commissionValue ?? 0);

    const unitCommission = product.unitCommission !== undefined && product.unitCommission !== null
      ? Number(product.unitCommission)
      : (isFlat ? commissionRate : Math.round((sellerUnitPrice * commissionRate / 100) * 100) / 100);

    const stock = getLowestStock(product);

    // Step 1: Seller GST = Seller Unit Price * Seller GST Percentage / 100
    const gstPercent = product.gstPercent !== undefined && product.gstPercent !== null
      ? Number(product.gstPercent)
      : 0;
    const isGstInclusive = Boolean(product.isGstInclusive);

    let sellerGstAmount = 0;
    if (product.sellerGstAmount !== undefined && product.sellerGstAmount !== null) {
      sellerGstAmount = Number(product.sellerGstAmount);
    } else if (gstPercent > 0) {
      if (isGstInclusive) {
        const baseBeforeTax = sellerUnitPrice / (1 + gstPercent / 100);
        sellerGstAmount = Math.round((sellerUnitPrice - baseBeforeTax) * 100) / 100;
      } else {
        sellerGstAmount = Math.round((sellerUnitPrice * (gstPercent / 100)) * 100) / 100;
      }
    } else {
      sellerGstAmount = 0;
    }

    // Step 2: Total Stock Commission = Flat Commission per Unit * Available Stock
    const stockTotalCommission = product.stockTotalCommission !== undefined && product.stockTotalCommission !== null
      ? Number(product.stockTotalCommission)
      : Math.round(unitCommission * Math.max(0, stock) * 100) / 100;

    // Step 3: Subtotal = Seller Unit Price + Total Stock Commission
    const subtotal = product.subtotal !== undefined && product.subtotal !== null
      ? Number(product.subtotal)
      : Math.round((sellerUnitPrice + stockTotalCommission) * 100) / 100;

    // Step 4: Total Amount = Subtotal + Seller GST Amount
    const totalAmount = product.totalAmount !== undefined && product.totalAmount !== null
      ? Number(product.totalAmount)
      : (isGstInclusive ? subtotal : Math.round((subtotal + sellerGstAmount) * 100) / 100);

    const unitCustomerPrice = product.unitCustomerPrice !== undefined && product.unitCustomerPrice !== null
      ? Number(product.unitCustomerPrice)
      : (product.price !== undefined ? Number(product.price) : Math.round((sellerUnitPrice + unitCommission) * 100) / 100);

    return {
      sellerUnitPrice,
      commissionType: product.commissionType || 'flat',
      commissionRate,
      unitCommission,
      availableStock: stock,
      stockTotalCommission,
      subtotal,
      stockSubtotal: subtotal,
      gstPercent,
      sellerGstPercent: gstPercent,
      gstAmount: sellerGstAmount,
      sellerGstAmount,
      stockGstAmount: sellerGstAmount,
      totalAmount,
      stockTotalAmount: totalAmount,
      isGstInclusive,
      unitCustomerPrice,
      isFlat
    };
  };

  const exportProducts = () => {
    const exportData = filteredProducts.map(product => {
      const info = getProductPricingInfo(product);
      return {
        ID: product._id,
        'Product Name': product.name,
        'Seller': product.sellerName || 'Zudo Official',
        Category: product.categoryId?.name || product.categoryId,
        Subcategory: product.subCategoryId?.name || 'No Subcategory',
        '1. Seller Unit Price (₹)': info.sellerUnitPrice,
        '2. Seller GST %': info.gstPercent,
        '2. Seller GST Amount (₹)': info.sellerGstAmount,
        '3. Commission Type': info.isFlat ? 'Flat (₹)' : 'Percentage (%)',
        '3. Flat Commission per Unit (₹)': info.unitCommission,
        '4. Available Stock Quantity': info.availableStock,
        '5. Total Stock Commission (₹)': info.stockTotalCommission,
        '6. Subtotal (₹)': info.subtotal,
        '7. Total Amount (₹)': info.totalAmount,
        'Customer Price per Unit (₹)': info.unitCustomerPrice,
        'B2C Price (₹)': product.price,
        'B2B Price (₹)': product.b2bPrice,
        Stock: info.availableStock,
        Unit: product.unit || 'pcs'
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
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Seller</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Pricing Breakdown</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>B2C Size Value</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>B2B Size Value</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>GST %</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Stock & Total Comm</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="9" style={{ padding: '48px', textAlign: 'center' }}><Loader2 className="animate-spin" style={{ margin: '0 auto' }} /></td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="9" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>No products found matching your search or filter.</td></tr>
            ) : filteredProducts.map(product => {
              const info = getProductPricingInfo(product);
              return (
                <tr key={product._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={getFullUrl(product.imageUrl)} onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/40x40?text=No+Image'; }} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--primary)' }}>
                    {product.sellerName || 'Zudo Official'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px' }}>{product.categoryId?.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{product.subCategoryId?.name || 'No Subcategory'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', minWidth: '240px' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--glass-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>1. Seller Unit Price:</span>
                        <strong style={{ color: 'var(--text-main)' }}>₹{info.sellerUnitPrice.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>2. Seller GST ({info.sellerGstPercent}%{info.isGstInclusive ? ' incl' : ''}):</span>
                        <strong style={{ color: '#f59e0b' }}>₹{info.sellerGstAmount.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>3. Flat Comm / Unit:</span>
                        <span style={{ color: '#6366f1', fontWeight: 600 }}>
                          {info.isFlat ? `₹${info.commissionRate.toFixed(2)}` : `${info.commissionRate}% (₹${info.unitCommission.toFixed(2)})`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>4. Available Stock:</span>
                        <span style={{ fontWeight: 600, color: info.availableStock <= 10 ? '#ef4444' : '#22c55e' }}>
                          {info.availableStock} {product.unit || 'units'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>5. Total Stock Comm:</span>
                        <strong style={{ color: '#6366f1' }}>₹{info.stockTotalCommission.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px dashed var(--glass-border)', paddingTop: '4px' }}>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>6. Subtotal:</span>
                        <strong style={{ color: 'var(--text-main)' }}>₹{info.subtotal.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '4px', marginTop: '2px' }}>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>7. Total Amount:</span>
                        <strong style={{ color: '#10b981', fontSize: '13px' }}>₹{info.totalAmount.toFixed(2)}</strong>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>{getVariantSizes(product.b2c)}</td>
                  <td style={{ padding: '16px 24px' }}>{getVariantSizes(product.b2b)}</td>
                  <td style={{ padding: '16px 24px' }}>{product.gstPercent || 0}%</td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: info.availableStock <= 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                          color: info.availableStock <= 10 ? '#ef4444' : '#22c55e'
                        }}>
                          {info.availableStock} {product.unit || 'units'}
                        </span>
                      </div>
                      {info.availableStock > 0 && info.unitCommission > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }} title={`Total Flat Commission for all ${info.availableStock} units in stock`}>
                          Total Stock Comm: <strong style={{ color: '#6366f1' }}>₹{info.stockTotalCommission.toFixed(2)}</strong>
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSimulatorProduct(product);
                          setSimQty(1);
                        }}
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="View Quantity Commission Simulator"
                      >
                        <Calculator size={16} />
                      </button>
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
              );
            })}
          </tbody>
        </table>
      </div>

            {/* Quantity-Based Commission Breakdown Simulator Modal */}
      {simulatorProduct && (() => {
        const info = getProductPricingInfo(simulatorProduct);
        const currentQty = Math.max(1, parseInt(simQty, 10) || 1);
        const presetQuantities = [1, 2, 3, 5, info.availableStock > 0 ? info.availableStock : 50];
        if (currentQty && !presetQuantities.includes(currentQty)) {
          presetQuantities.push(currentQty);
        }
        const uniquePresets = Array.from(new Set(presetQuantities)).sort((a, b) => a - b);

        const simComm = Math.round(info.unitCommission * currentQty * 100) / 100;
        const simSubtotal = Math.round((info.sellerUnitPrice + simComm) * 100) / 100;
        const simTotal = info.isGstInclusive ? simSubtotal : Math.round((simSubtotal + info.sellerGstAmount) * 100) / 100;

        return (
          <div className="simulator-modal-overlay" onClick={() => setSimulatorProduct(null)}>
            <div
              className="simulator-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{
                padding: '24px 32px 18px',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6366f1',
                    boxShadow: '0 0 20px rgba(99, 102, 241, 0.25)',
                    border: '1px solid rgba(99, 102, 241, 0.25)'
                  }}>
                    <Calculator size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>
                        Stock Quantity Commission Simulator
                      </h3>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#6366f1',
                        border: '1px solid rgba(99, 102, 241, 0.25)'
                      }}>
                        {info.isFlat ? 'Flat Commission' : `${info.commissionRate}% Dynamic`}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{simulatorProduct.name}</span>
                      <span>•</span>
                      <span>Available Stock: <strong style={{ color: info.availableStock <= 10 ? '#ef4444' : '#10b981' }}>{info.availableStock} {simulatorProduct.unit || 'units'}</strong></span>
                      {simulatorProduct.categoryId?.name && (
                        <>
                          <span>•</span>
                          <span>Category: {simulatorProduct.categoryId.name}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSimulatorProduct(null)}
                  style={{
                    background: 'var(--input-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'var(--input-bg)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="simulator-modal-body custom-scrollbar">
                {/* 7-Step Pricing Breakdown Overview Cards */}
                <div className="simulator-stats-grid">
                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                      1. Seller Unit Price
                    </span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 700 }}>
                      ₹{info.sellerUnitPrice.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                      2. Seller GST ({info.sellerGstPercent}%)
                    </span>
                    <strong style={{ fontSize: '15px', color: '#f59e0b', fontWeight: 700 }}>
                      ₹{info.sellerGstAmount.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                      3. Flat Comm / Unit
                    </span>
                    <strong style={{ fontSize: '15px', color: '#6366f1', fontWeight: 700 }}>
                      {info.isFlat ? `₹${info.commissionRate.toFixed(2)}` : `${info.commissionRate}%`}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                      4. Available Stock
                    </span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 700 }}>
                      {info.availableStock} {simulatorProduct.unit || 'units'}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                      5. Total Stock Comm
                    </span>
                    <strong style={{ fontSize: '15px', color: '#6366f1', fontWeight: 700 }}>
                      ₹{info.stockTotalCommission.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                      6. Subtotal
                    </span>
                    <strong style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: 700 }}>
                      ₹{info.subtotal.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card highlight">
                    <span style={{ fontSize: '11px', color: '#10b981', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '6px' }}>
                      7. Total Amount
                    </span>
                    <strong style={{ fontSize: '16px', color: '#10b981', fontWeight: 800 }}>
                      ₹{info.totalAmount.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Interactive Quantity Selector */}
                <div style={{
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  background: 'var(--input-bg)',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Simulate Quantity:
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => setSimQty(Math.max(1, currentQty - 1))}
                        style={{
                          width: '32px',
                          height: '34px',
                          borderRadius: '8px',
                          border: '1px solid var(--glass-border)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Decrease by 1"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        style={{ width: '85px', height: '34px', padding: '0 8px', fontSize: '14px', textAlign: 'center', fontWeight: 700 }}
                        value={simQty}
                        onChange={(e) => setSimQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      />
                      <button
                        onClick={() => setSimQty(currentQty + 1)}
                        style={{
                          width: '32px',
                          height: '34px',
                          borderRadius: '8px',
                          border: '1px solid var(--glass-border)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Increase by 1"
                      >
                        +
                      </button>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginLeft: '2px' }}>
                        {simulatorProduct.unit || 'units'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 500 }}>Presets:</span>
                    {uniquePresets.map(preset => {
                      const isSelected = currentQty === preset;
                      const isFullStock = info.availableStock > 0 && preset === info.availableStock;
                      return (
                        <button
                          key={preset}
                          onClick={() => setSimQty(preset)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: isSelected ? '1px solid #6366f1' : '1px solid var(--glass-border)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'var(--card-bg)',
                            color: isSelected ? '#6366f1' : 'var(--text-main)',
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.2)' : 'none'
                          }}
                        >
                          <span>{preset} {simulatorProduct.unit || 'units'}</span>
                          {isFullStock && (
                            <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 700 }}>
                              (Stock)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Simulation Breakdown Table */}
                <div style={{
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: '1px solid var(--glass-border)',
                  marginBottom: '20px',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderBottom: '1px solid var(--glass-border)'
                      }}>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px' }}>
                          Stock / Order Qty
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Seller Price
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Seller GST ({info.sellerGstPercent}%)
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Flat Comm/Unit
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Total Comm
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Subtotal
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniquePresets.map(q => {
                        const rowSeller = Math.round(info.sellerUnitPrice * 100) / 100;
                        const rowSellerGst = Math.round(info.sellerGstAmount * 100) / 100;
                        const rowComm = Math.round(info.unitCommission * q * 100) / 100;
                        const rowSubtotal = Math.round((rowSeller + rowComm) * 100) / 100;
                        const rowTotal = info.isGstInclusive ? rowSubtotal : Math.round((rowSubtotal + rowSellerGst) * 100) / 100;
                        const isSelected = q === currentQty;
                        return (
                          <tr
                            key={q}
                            onClick={() => setSimQty(q)}
                            style={{
                              borderBottom: '1px solid var(--glass-border)',
                              background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                              borderLeft: isSelected ? '4px solid #6366f1' : '4px solid transparent',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <td style={{ padding: '12px 18px', fontWeight: isSelected ? 700 : 500 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{q} {simulatorProduct.unit || 'units'}</span>
                                {isSelected && (
                                  <span style={{
                                    fontSize: '10px',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                    background: '#6366f1',
                                    color: '#ffffff',
                                    fontWeight: 700
                                  }}>
                                    Simulating
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: isSelected ? 700 : 400 }}>
                              ₹{info.sellerUnitPrice.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', color: '#f59e0b', fontWeight: 600, textAlign: 'right' }}>
                              ₹{rowSellerGst.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', color: '#6366f1', textAlign: 'right', fontWeight: isSelected ? 700 : 400 }}>
                              ₹{info.unitCommission.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', color: '#6366f1', fontWeight: 700, textAlign: 'right' }}>
                              ₹{rowComm.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', color: 'var(--text-main)', fontWeight: 700, textAlign: 'right' }}>
                              ₹{rowSubtotal.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                              <span style={{
                                color: '#10b981',
                                fontWeight: 800,
                                fontSize: '13px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'transparent'
                              }}>
                                ₹{rowTotal.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selected Quantity Detailed Breakdown */}
                <div style={{
                  padding: '18px 24px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(16, 185, 129, 0.05))',
                  borderRadius: '16px',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ minWidth: '320px', flex: 1 }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Live Calculation Formula (for {currentQty} {simulatorProduct.unit || 'units'}):
                    </span>
                    <div style={{
                      fontSize: '13.5px',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      lineHeight: '1.6'
                    }}>
                      <span>₹{info.sellerUnitPrice.toFixed(2)} Seller</span>
                      <span style={{ color: 'var(--text-dim)' }}>+</span>
                      <span style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '2px 8px', borderRadius: '6px', color: '#6366f1', fontWeight: 700 }}>
                        (₹{info.unitCommission.toFixed(2)} × {currentQty} = ₹{simComm.toFixed(2)} Comm)
                      </span>
                      <span style={{ color: 'var(--text-dim)' }}>=</span>
                      <strong style={{ color: 'var(--text-main)' }}>₹{simSubtotal.toFixed(2)} Subtotal</strong>
                      <span style={{ color: 'var(--text-dim)' }}>+</span>
                      <span style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '6px', color: '#f59e0b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        ₹{info.sellerGstAmount.toFixed(2)} Seller GST
                      </span>
                    </div>
                  </div>

                  <div style={{
                    textAlign: 'right',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '12px 22px',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    minWidth: '170px'
                  }}>
                    <span style={{ fontSize: '11px', color: '#10b981', display: 'block', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total Amount
                    </span>
                    <strong style={{ fontSize: '22px', color: '#10b981', fontWeight: 800 }}>
                      ₹{simTotal.toFixed(2)}
                    </strong>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                      {info.isGstInclusive ? 'GST inclusive' : '+ GST included'}
                    </span>
                  </div>
                </div>

                {/* Footer Close Button */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-primary"
                    onClick={() => setSimulatorProduct(null)}
                    style={{ padding: '10px 28px', fontSize: '14px', borderRadius: '12px' }}
                  >
                    Close Simulator
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


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

