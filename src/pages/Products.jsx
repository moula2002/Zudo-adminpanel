import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { Package, EyeOff, Search, Tag, Loader2, Plus, Filter, Download, Trash2, Calculator, X, Info } from 'lucide-react';
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
    // Determine base unit size (e.g. 30 for 30 KG bag)
    let unitSize = Number(product.unitSize);
    if (!unitSize || unitSize <= 1) {
      const firstVar = (product.b2b && product.b2b[0]) || (product.b2c && product.b2c[0]) || (product.variants && product.variants[0]);
      if (firstVar) {
        const vSize = Number(firstVar.unitSize || firstVar.sizeValue);
        if (vSize && vSize > 1) {
          unitSize = vSize;
        } else if (firstVar.packetSize) {
          const m = String(firstVar.packetSize).match(/([0-9.]+)/);
          if (m && parseFloat(m[1]) > 1) {
            unitSize = parseFloat(m[1]);
          }
        }
      }
      if (!unitSize || unitSize <= 1) {
        const match = String(product.name || '').match(/([0-9.]+)\s*(kg|g|ltr|pcs|gm|kgs|ton|ml)/i);
        if (match && parseFloat(match[1]) > 1) {
          unitSize = parseFloat(match[1]);
        }
      }
    }
    if (!unitSize || unitSize <= 0) unitSize = 1;

    // Determine Packaging Type and Measurement Basis
    const rawUnit = (product.unit || 'unit').toLowerCase();
    const rawMeas = (product.measurementBasis || product.measurementUnit || '').toLowerCase();
    const BASE_UNITS = ['kg', 'g', 'ton', 'ltr', 'ml', 'pcs'];
    const productMeasurementUnit = (rawMeas || (BASE_UNITS.includes(rawUnit) ? rawUnit : 'kg')).toUpperCase();
    const packagingType = (product.packagingType || product.unit || 'BAG').toUpperCase();

    // Price Basis: 'per_unit' (Method A) vs 'per_package' (Method B)
    const isPackagePrice = product.priceBasis === 'per_package' || product.isPackagePrice === true;

    let rawSellerPrice = product.sellerPricePerProductUnit !== undefined && product.sellerPricePerProductUnit !== null && Number(product.sellerPricePerProductUnit) > 0
      ? Number(product.sellerPricePerProductUnit)
      : (product.sellerPrice !== undefined && product.sellerPrice !== null && Number(product.sellerPrice) > 0
          ? Number(product.sellerPrice)
          : (product.sellerPricePerBaseUnit !== undefined && product.sellerPricePerBaseUnit !== null && Number(product.sellerPricePerBaseUnit) > 0
              ? Number(product.sellerPricePerBaseUnit)
              : Number(product.price || 0)));

    // Fallback to B2B price or variant price if 0
    if (rawSellerPrice <= 0) {
      if (product.sellerB2bPrice > 0) rawSellerPrice = Number(product.sellerB2bPrice);
      else if (product.b2bPrice > 0) rawSellerPrice = Number(product.b2bPrice);
      else if (product.b2b && product.b2b.length > 0) {
        const fvPrice = Number(product.b2b[0].sellerPricePerProductUnit || product.b2b[0].sellerPrice || product.b2b[0].price);
        if (fvPrice > 0) rawSellerPrice = fvPrice;
      }
    }

    // New simplified pricing calculation:
    // Seller Unit Price is strictly the configured price for 1 purchasable package/unit.
    // Do NOT multiply it by product unit size again.
    const sellerPricePerProductUnit = rawSellerPrice > 0 ? rawSellerPrice : 0;
    const sellerPricePerBaseUnit = unitSize > 0 ? Math.round((sellerPricePerProductUnit / unitSize) * 100) / 100 : sellerPricePerProductUnit;

    // 3. Admin Commission Per Base Unit (e.g. ₹5 / KG)
    const isFlat = (product.commissionType || 'flat') === 'flat';
    const adminCommissionPerBaseUnit = product.adminCommissionPerBaseUnit !== undefined && product.adminCommissionPerBaseUnit !== null
      ? Number(product.adminCommissionPerBaseUnit)
      : (product.commissionRate !== undefined && product.commissionRate !== null
          ? Number(product.commissionRate)
          : Number(product.commissionValue ?? 0));

    // 4. Total Commission = Product Unit Size * Admin Commission Per Unit (e.g. 10 * 5 = ₹50)
    let commissionPerProductUnit = 0;
    if (isFlat) {
      commissionPerProductUnit = Math.round(adminCommissionPerBaseUnit * unitSize * 100) / 100;
    } else {
      commissionPerProductUnit = Math.round((sellerPricePerProductUnit * adminCommissionPerBaseUnit / 100) * 100) / 100;
    }

    // 5. Customer Base Price = Seller Unit Price + Total Commission (e.g. 100 + 50 = ₹150)
    const customerUnitBasePrice = Math.round((sellerPricePerProductUnit + commissionPerProductUnit) * 100) / 100;

    // 6. GST Percentage
    const gstPercent = product.gstPercent !== undefined && product.gstPercent !== null
      ? Number(product.gstPercent)
      : 0;
    const isGstInclusive = Boolean(product.isGstInclusive);

    // 7. GST Amount & 8. Customer Final Price
    let gstAmountPerProductUnit = 0;
    let customerFinalPricePerProductUnit = customerUnitBasePrice;

    if (gstPercent > 0) {
      if (isGstInclusive) {
        const baseBeforeTax = customerUnitBasePrice / (1 + gstPercent / 100);
        gstAmountPerProductUnit = Math.round((customerUnitBasePrice - baseBeforeTax) * 100) / 100;
        customerFinalPricePerProductUnit = customerUnitBasePrice;
      } else {
        gstAmountPerProductUnit = Math.round((customerUnitBasePrice * (gstPercent / 100)) * 100) / 100;
        customerFinalPricePerProductUnit = Math.round((customerUnitBasePrice + gstAmountPerProductUnit) * 100) / 100;
      }
    }

    // 10. Customer Final Price Per Product Unit = customerFinalPricePerProductUnit

    // Compatibility & Custom Unit Validation (Section 6)
    const isCompatible = product.isCompatible !== false;
    const validationMessage = product.validationMessage || null;

    // Section 6: Available Stock & Total Stock Commission & Valuation
    const stock = getLowestStock(product);
    const totalStockWeight = Math.round(unitSize * Math.max(0, stock) * 100) / 100;
    const totalStockCommission = Math.round(commissionPerProductUnit * Math.max(0, stock) * 100) / 100;
    const totalSellerStockValue = Math.round(sellerPricePerProductUnit * Math.max(0, stock) * 100) / 100;
    const totalStockSubtotal = Math.round((totalSellerStockValue + totalStockCommission) * 100) / 100;
    const totalStockGst = isGstInclusive ? 0 : Math.round((totalStockSubtotal * (gstPercent / 100)) * 100) / 100;
    const totalStockValuation = isGstInclusive ? totalStockSubtotal : Math.round((totalStockSubtotal + totalStockGst) * 100) / 100;

    return {
      // 11-Step Breakdown (Section 5)
      sellerPricePerBaseUnit,
      productMeasurementUnit,
      packagingType,
      unitSize,
      sellerPricePerProductUnit,
      adminCommissionPerBaseUnit,
      commissionPerProductUnit,
      customerUnitBasePrice,
      gstPercent,
      gstAmountPerProductUnit,
      customerFinalPricePerProductUnit,

      // Custom Unit Validation (Section 6)
      isCompatible,
      validationMessage,

      // Stock & Inventory Valuation (Section 6)
      availableStock: stock,
      totalStockWeight,
      totalStockCommission,
      totalSellerStockValue,
      totalStockSubtotal,
      totalStockValuation,

      // Aliases for compatibility
      sellerUnitPrice: sellerPricePerProductUnit,
      commissionType: product.commissionType || 'flat',
      commissionRate: adminCommissionPerBaseUnit,
      unitCommission: commissionPerProductUnit,
      subtotal: customerUnitBasePrice,
      totalAmount: customerFinalPricePerProductUnit,
      sellerGstAmount: gstAmountPerProductUnit,
      isGstInclusive,
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
        '1. Seller Price / Base Unit (₹)': info.sellerPricePerBaseUnit,
        '2. Product Unit Size': `${info.unitSize} ${info.productMeasurementUnit} / ${info.packagingType}`,
        '3. Admin Commission / Base Unit (₹)': info.adminCommissionPerBaseUnit,
        '4. Commission / Product Unit (₹)': info.commissionPerProductUnit,
        '5. Customer Unit Base Price (₹)': info.customerUnitBasePrice,
        '6. GST %': info.gstPercent,
        '7. GST Amount / Product Unit (₹)': info.gstAmountPerProductUnit,
        '8. Customer Final Price / Product Unit (₹)': info.customerFinalPricePerProductUnit,
        'Available Stock (Packs)': info.availableStock,
        'Total Stock Weight': `${info.totalStockWeight} ${info.productMeasurementUnit}`,
        'Total Stock Commission (₹)': info.totalStockCommission,
        'Total Stock Valuation (₹)': info.totalStockValuation,
        'B2C Price (₹)': product.price,
        'B2B Price (₹)': product.b2bPrice,
        Unit: product.unit || 'pcs'
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "Zudo_Products_Catalog.xlsx");
  };

  const renderVariants = (variants, defaultUnit, defaultPackaging, adminRate = 0, productInfo = null) => {
    if (!variants || variants.length === 0) return <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>N/A</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {variants.map((v, idx) => {
          let vUnitSize = Number(v.unitSize || v.sizeValue);
          if (!vUnitSize || vUnitSize <= 0) {
            const parsed = String(v.packetSize || '').match(/([0-9.]+)/);
            if (parsed && parseFloat(parsed[1]) > 0) vUnitSize = parseFloat(parsed[1]);
            else vUnitSize = 1;
          }
          const vPackaging = (v.packagingType || defaultPackaging || 'BAG').toUpperCase();
          const vMeas = (v.measurementBasis || v.measurementUnit || defaultUnit || 'KG').toUpperCase();
          let vSeller = v.sellerPricePerProductUnit ?? v.sellerPrice;
          let vComm = v.commissionPerProductUnit ?? v.commissionAmount;
          let vCust = v.price;

          // If variant corresponds to root product package size & packaging, ensure synchronized canonical display
          if (productInfo && productInfo.sellerPricePerProductUnit > 0) {
            if (vUnitSize === productInfo.unitSize && vPackaging === productInfo.packagingType) {
              vSeller = productInfo.sellerPricePerProductUnit;
              vComm = productInfo.commissionPerProductUnit;
              vCust = productInfo.customerFinalPricePerProductUnit;
            } else if (Number(vSeller) === productInfo.sellerPricePerProductUnit * vUnitSize) {
              // Normalize legacy data where seller price was multiplied by unit size
              vSeller = productInfo.sellerPricePerProductUnit;
            }
          }
          
          const expectedComm = adminRate > 0 && vUnitSize > 0 ? Math.round(adminRate * vUnitSize * 100) / 100 : 0;
          vComm = expectedComm;
          if (vSeller !== undefined) {
            const base = Number(vSeller) + Number(vComm);
            const gstRate = productInfo ? productInfo.gstPercent : 0;
            const gst = gstRate > 0 ? Math.round(base * (gstRate / 100) * 100) / 100 : 0;
            vCust = Math.round((base + gst) * 100) / 100;
          }
          const vStock = v.stock;
          return (
            <div key={idx} style={{
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                <span>1 {vPackaging} = {vUnitSize} {vMeas}</span>
                {vStock !== undefined && <span style={{ color: vStock < 10 ? '#ef4444' : '#22c55e', fontSize: '10px' }}>Stock: {vStock}</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                {vSeller !== undefined && <span>Seller: <strong style={{ color: 'var(--text-main)' }}>₹{Number(vSeller).toFixed(2)}</strong></span>}
                {vComm !== undefined && <span>Comm: <strong style={{ color: '#6366f1' }}>₹{Number(vComm).toFixed(2)}</strong></span>}
                {vCust !== undefined && <span>Final: <strong style={{ color: '#10b981' }}>₹{Number(vCust).toFixed(2)}</strong></span>}
              </div>
            </div>
          );
        })}
      </div>
    );
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600 }}>{product.name}</span>
                          {product.isProductVisible === false && (
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
                              gap: '4px'
                            }}>
                              <EyeOff size={10} /> HIDDEN
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>#{product._id.slice(-8).toUpperCase()}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {product.sellerName || 'Zudo Official'}
                    </div>
                    {product.isProductVisible === false && (
                      <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 700, display: 'inline-block', marginTop: '2px' }}>
                        (Seller Hidden)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '14px' }}>{product.categoryId?.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{product.subCategoryId?.name || 'No Subcategory'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', minWidth: '260px' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      fontSize: '11.5px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid var(--glass-border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>1. Product Unit Size:</span>
                        <strong style={{ color: 'var(--text-main)' }}>1 {info.packagingType} = {info.unitSize} {info.productMeasurementUnit}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>2. Seller Unit Price:</span>
                        <strong style={{ color: 'var(--text-main)' }}>₹{info.sellerPricePerProductUnit.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>3. Admin Commission / Unit:</span>
                        <span style={{ color: '#6366f1', fontWeight: 600 }}>
                          {info.isFlat ? `₹${info.adminCommissionPerBaseUnit.toFixed(2)} / ${info.productMeasurementUnit}` : `${info.adminCommissionPerBaseUnit}%`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>4. Total Commission:</span>
                        <strong style={{ color: '#6366f1' }}>₹{info.commissionPerProductUnit.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px dashed var(--glass-border)', paddingTop: '4px' }}>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>5. Customer Base Price:</span>
                        <strong style={{ color: 'var(--text-main)' }}>₹{info.customerUnitBasePrice.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>6. GST Percentage:</span>
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>{info.gstPercent}%{info.isGstInclusive ? ' (incl)' : ''}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)' }}>7. GST Amount:</span>
                        <span style={{ color: '#f59e0b' }}>₹{info.gstAmountPerProductUnit.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '4px', marginTop: '2px' }}>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>8. Customer Final Price:</span>
                        <strong style={{ color: '#10b981', fontSize: '13px' }}>₹{info.customerFinalPricePerProductUnit.toFixed(2)}</strong>
                      </div>

                      {!info.isCompatible && (
                        <div style={{ marginTop: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', fontSize: '10.5px', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                          ⚠️ {info.validationMessage || 'Incompatible or missing measurement basis'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', minWidth: '130px' }}>{renderVariants(product.b2c, product.measurementUnit || product.unit, product.packagingType || product.unit, info.adminCommissionPerBaseUnit, info)}</td>
                  <td style={{ padding: '16px 24px', minWidth: '140px' }}>{renderVariants(product.b2b, product.measurementUnit || product.unit, product.packagingType || product.unit, info.adminCommissionPerBaseUnit, info)}</td>
                  <td style={{ padding: '16px 24px' }}>{product.gstPercent || 0}%</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-block',
                      background: info.availableStock <= 10 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: info.availableStock <= 10 ? '#ef4444' : '#22c55e'
                    }}>
                      {info.availableStock <= 0 ? 'Out of Stock (0)' : `${info.availableStock} packs`}
                    </span>
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

        // Step 1: Seller Price Per Product Unit (Bag)
        // Step 2: Commission Per Product Unit (Bag)
        // Step 3: Customer Unit Base Price
        // Step 4: Total Seller Amount = sellerPricePerProductUnit * currentQty
        const simSellerAmount = Math.round(info.sellerPricePerProductUnit * currentQty * 100) / 100;
        // Step 5: Total Commission = commissionPerProductUnit * currentQty
        const simComm = Math.round(info.commissionPerProductUnit * currentQty * 100) / 100;
        // Step 6: Subtotal = Total Seller Amount + Total Commission
        const simSubtotal = Math.round((simSellerAmount + simComm) * 100) / 100;
        // Step 7: GST
        const simGst = info.isGstInclusive
          ? Math.round((simSubtotal - (simSubtotal / (1 + info.gstPercent / 100))) * 100) / 100
          : Math.round(simSubtotal * (info.gstPercent / 100) * 100) / 100;
        // Step 8: Final Customer Amount = Subtotal + GST
        const simTotal = info.isGstInclusive ? simSubtotal : Math.round((simSubtotal + simGst) * 100) / 100;
        const simTotalWeight = Math.round(info.unitSize * currentQty * 100) / 100;

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
                        Product Unit Commission & Pricing Simulator
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
                      <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                        1 {info.packagingType} = {info.unitSize} {info.productMeasurementUnit}
                      </span>
                      <span>•</span>
                      <span>Available Stock: <strong style={{ color: info.availableStock <= 10 ? '#ef4444' : '#10b981' }}>{info.availableStock} packs</strong></span>
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
                {/* Step-by-Step Pricing Breakdown Overview Cards */}
                <div className="simulator-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))' }}>
                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      1. Product Unit Size
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>
                      1 {info.packagingType} = {info.unitSize} {info.productMeasurementUnit}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      2. Seller Unit Price
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>
                      ₹{info.sellerPricePerProductUnit.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      3. Admin Commission / Unit
                    </span>
                    <strong style={{ fontSize: '14px', color: '#6366f1', fontWeight: 700 }}>
                      {info.isFlat ? `₹${info.adminCommissionPerBaseUnit.toFixed(2)} / ${info.productMeasurementUnit}` : `${info.adminCommissionPerBaseUnit}%`}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      4. Total Commission
                    </span>
                    <strong style={{ fontSize: '14px', color: '#6366f1', fontWeight: 700 }}>
                      ₹{info.commissionPerProductUnit.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      5. Customer Base Price
                    </span>
                    <strong style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>
                      ₹{info.customerUnitBasePrice.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      6. GST %
                    </span>
                    <strong style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 700 }}>
                      {info.gstPercent}%
                    </strong>
                  </div>

                  <div className="simulator-stat-card">
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                      7. GST Amount
                    </span>
                    <strong style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 700 }}>
                      ₹{info.gstAmountPerProductUnit.toFixed(2)}
                    </strong>
                  </div>

                  <div className="simulator-stat-card highlight">
                    <span style={{ fontSize: '10px', color: '#10b981', display: 'block', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                      8. Customer Final Price
                    </span>
                    <strong style={{ fontSize: '15px', color: '#10b981', fontWeight: 800 }}>
                      ₹{info.customerFinalPricePerProductUnit.toFixed(2)}
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
                      Simulate Ordered {info.packagingType}s / Quantity:
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
                        {info.packagingType}s ({simTotalWeight} {info.productMeasurementUnit})
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
                          <span>{preset} {info.packagingType}{preset > 1 ? 's' : ''}</span>
                          {isFullStock && (
                            <span style={{ fontSize: '10px', opacity: 0.85, fontWeight: 700 }}>
                              (Full Stock)
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
                          Order Quantity
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px' }}>
                          Total Weight / Size
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Seller Amount (₹)
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Total Comm (₹)
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Subtotal (₹)
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          GST ({info.gstPercent}%)
                        </th>
                        <th style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600, fontSize: '12px', textAlign: 'right' }}>
                          Final Amount (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniquePresets.map(q => {
                        const rowSellerAmount = Math.round(info.sellerPricePerProductUnit * q * 100) / 100;
                        const rowComm = Math.round(info.commissionPerProductUnit * q * 100) / 100;
                        const rowSubtotal = Math.round((rowSellerAmount + rowComm) * 100) / 100;
                        const rowGst = info.isGstInclusive
                          ? Math.round((rowSubtotal - (rowSubtotal / (1 + info.gstPercent / 100))) * 100) / 100
                          : Math.round(rowSubtotal * (info.gstPercent / 100) * 100) / 100;
                        const rowTotal = info.isGstInclusive ? rowSubtotal : Math.round((rowSubtotal + rowGst) * 100) / 100;
                        const rowWeight = Math.round(info.unitSize * q * 100) / 100;
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
                                <span>{q} {q === 1 ? 'pack' : 'packs'}</span>
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
                            <td style={{ padding: '12px 18px', color: 'var(--text-dim)', fontWeight: 600 }}>
                              {rowWeight} {simulatorProduct.unit || 'units'}
                            </td>
                            <td style={{ padding: '12px 18px', textAlign: 'right', fontWeight: isSelected ? 700 : 400 }}>
                              ₹{rowSellerAmount.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', color: '#6366f1', fontWeight: 700, textAlign: 'right' }}>
                              ₹{rowComm.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', color: 'var(--text-main)', fontWeight: 700, textAlign: 'right' }}>
                              ₹{rowSubtotal.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 18px', color: '#f59e0b', fontWeight: 600, textAlign: 'right' }}>
                              ₹{rowGst.toFixed(2)}
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
                      Live Calculation Formula (for {currentQty} {currentQty === 1 ? 'pack' : 'packs'} = {simTotalWeight} {info.productMeasurementUnit || 'units'}):
                    </span>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                      lineHeight: '1.6'
                    }}>
                      <span>₹{info.sellerPricePerProductUnit.toFixed(2)} × {currentQty} = <strong style={{ color: 'var(--text-main)' }}>₹{simSellerAmount.toFixed(2)} Seller</strong></span>
                      <span style={{ color: 'var(--text-dim)' }}>+</span>
                      <span style={{ background: 'rgba(99, 102, 241, 0.12)', padding: '4px 10px', borderRadius: '6px', color: '#6366f1', fontWeight: 700 }}>
                        {info.isFlat 
                          ? `(₹${info.adminCommissionPerBaseUnit.toFixed(2)}/${info.productMeasurementUnit} × ${info.unitSize} ${info.productMeasurementUnit} = ₹${info.commissionPerProductUnit.toFixed(2)}/pack) × ${currentQty} = ₹${simComm.toFixed(2)} Comm`
                          : `(${info.adminCommissionPerBaseUnit}% = ₹${info.commissionPerProductUnit.toFixed(2)}/pack) × ${currentQty} = ₹${simComm.toFixed(2)} Comm`}
                      </span>
                      <span style={{ color: 'var(--text-dim)' }}>=</span>
                      <strong style={{ color: 'var(--text-main)' }}>₹{simSubtotal.toFixed(2)} Subtotal</strong>
                      <span style={{ color: 'var(--text-dim)' }}>+</span>
                      <span style={{ background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: '6px', color: '#f59e0b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        ₹{simGst.toFixed(2)} GST ({info.gstPercent}%)
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
                      Final Customer Amount
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

