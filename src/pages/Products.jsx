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
        const presetQuantities = [1, 2, 3, 5, info.availableStock > 0 ? info.availableStock : 50];
        const uniquePresets = Array.from(new Set(presetQuantities)).sort((a, b) => a - b);

        const currentQty = Math.max(1, parseInt(simQty, 10) || 1);
        const calcTotalSeller = Math.round(info.sellerUnitPrice * currentQty * 100) / 100;
        const calcTotalComm = Math.round(info.unitCommission * currentQty * 100) / 100;
        const calcTotalBeforeGst = Math.round((calcTotalSeller + calcTotalComm) * 100) / 100;

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', width: '680px', maxWidth: '95vw', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                    <Calculator size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Stock Quantity Commission Simulator</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>{simulatorProduct.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSimulatorProduct(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* 7-Step Pricing Breakdown Overview Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', background: 'var(--input-bg)', padding: '16px', borderRadius: '14px', marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>1. Seller Unit Price</span>
                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>₹{info.sellerUnitPrice.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>2. Seller GST ({info.sellerGstPercent}%)</span>
                  <strong style={{ fontSize: '14px', color: '#f59e0b' }}>₹{info.sellerGstAmount.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>3. Flat Comm / Unit</span>
                  <strong style={{ fontSize: '14px', color: '#6366f1' }}>{info.isFlat ? `₹${info.commissionRate.toFixed(2)}` : `${info.commissionRate}%`}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>4. Available Stock</span>
                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>{info.availableStock} {simulatorProduct.unit || 'units'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>5. Total Stock Comm</span>
                  <strong style={{ fontSize: '14px', color: '#6366f1' }}>₹{info.stockTotalCommission.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>6. Subtotal</span>
                  <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>₹{info.subtotal.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>7. Total Amount</span>
                  <strong style={{ fontSize: '15px', color: '#10b981' }}>₹{info.totalAmount.toFixed(2)}</strong>
                </div>
              </div>

              {/* Interactive Quantity Selector */}
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Simulate Quantity:</span>
                <input
                  type="number"
                  min="1"
                  className="input-field"
                  style={{ width: '100px', height: '36px', padding: '0 10px', fontSize: '14px' }}
                  value={simQty}
                  onChange={(e) => setSimQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  {uniquePresets.map(preset => (
                    <button
                      key={preset}
                      onClick={() => setSimQty(preset)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: currentQty === preset ? '1px solid #6366f1' : '1px solid var(--glass-border)',
                        background: currentQty === preset ? 'rgba(99, 102, 241, 0.15)' : 'var(--input-bg)',
                        color: currentQty === preset ? '#6366f1' : 'var(--text-main)',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {preset} {simulatorProduct.unit || 'units'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulation Breakdown Table */}
              <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Stock / Order Qty</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Seller Price</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Seller GST ({info.sellerGstPercent}%)</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Flat Comm/Unit</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Total Comm</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Subtotal</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Total Amount</th>
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
                          style={{
                            borderBottom: '1px solid var(--glass-border)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                            fontWeight: isSelected ? 700 : 400
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>{q} {simulatorProduct.unit || 'units'}</td>
                          <td style={{ padding: '10px 14px' }}>₹{info.sellerUnitPrice.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 600 }}>₹{rowSellerGst.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px', color: '#6366f1' }}>₹{info.unitCommission.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px', color: '#6366f1', fontWeight: 700 }}>₹{rowComm.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-main)', fontWeight: 700 }}>₹{rowSubtotal.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 700 }}>₹{rowTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Quantity Detailed Breakdown */}
              {(() => {
                const simComm = Math.round(info.unitCommission * currentQty * 100) / 100;
                const simSubtotal = Math.round((info.sellerUnitPrice + simComm) * 100) / 100;
                const simTotal = info.isGstInclusive ? simSubtotal : Math.round((simSubtotal + info.sellerGstAmount) * 100) / 100;
                return (
                  <div style={{ padding: '14px 18px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>
                        Calculation for {currentQty} units:
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
                        ₹{info.sellerUnitPrice.toFixed(2)} Seller + (₹{info.unitCommission.toFixed(2)} × {currentQty} = <strong style={{ color: '#6366f1' }}>₹{simComm.toFixed(2)} Comm</strong>) = <strong>₹{simSubtotal.toFixed(2)} Subtotal</strong> + <strong style={{ color: '#f59e0b' }}>₹{info.sellerGstAmount.toFixed(2)} Seller GST</strong>
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block' }}>Total Amount</span>
                      <strong style={{ fontSize: '18px', color: '#10b981' }}>₹{simTotal.toFixed(2)}</strong>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn-primary"
                  onClick={() => setSimulatorProduct(null)}
                  style={{ padding: '10px 24px' }}
                >
                  Close
                </button>
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

