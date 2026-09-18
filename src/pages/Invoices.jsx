import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { 
  Receipt, Printer, Search, Filter, Calendar, CheckCircle2, FileText, X, ChevronDown, Edit2, Download
} from 'lucide-react';

const Invoices = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [productGstMap, setProductGstMap] = useState({});
  
  // Filters
  const [invoiceType, setInvoiceType] = useState('order'); // 'order', 'purchase', or 'seller_generated'
  const [segmentType, setSegmentType] = useState('All'); // 'B2B', 'B2C', 'All'
  const [searchTerm, setSearchTerm] = useState(''); // Seller or Buyer name
  const [dateFilter, setDateFilter] = useState('All Time');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });
  const [collation, setCollation] = useState('All'); // 'Collated', 'Uncollated', 'All'

  // Print Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewOrders, setPreviewOrders] = useState([]);
  const [pageSize, setPageSize] = useState('A5');
  const iframeRef = useRef(null);

  const numberToWords = (num) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanOneThousand = (n) => {
      if (n === 0) return '';
      let temp = '';
      if (n >= 100) {
        temp += a[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        temp += b[Math.floor(n / 10)] + ' ';
        n %= 10;
      }
      if (n > 0) {
        temp += a[n] + ' ';
      }
      return temp.trim();
    };

    if (num === 0) return 'Zero';
    
    let integerPart = Math.floor(num);
    let words = '';

    if (integerPart >= 10000000) {
      words += convertLessThanOneThousand(Math.floor(integerPart / 10000000)) + ' Crore ';
      integerPart %= 10000000;
    }
    if (integerPart >= 100000) {
      words += convertLessThanOneThousand(Math.floor(integerPart / 100000)) + ' Lakh ';
      integerPart %= 100000;
    }
    if (integerPart >= 1000) {
      words += convertLessThanOneThousand(Math.floor(integerPart / 1000)) + ' Thousand ';
      integerPart %= 1000;
    }
    if (integerPart > 0) {
      words += convertLessThanOneThousand(integerPart);
    }

    return words.trim() + ' Only';
  };

  const generateBarcode = (text) => {
    const hash = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let bars = '';
    let x = 10;
    for (let i = 0; i < 60; i++) {
      const width = ((hash + i * 7) % 3 === 0) ? 3 : 1.2;
      const spacing = ((hash + i * 13) % 2 === 0) ? 1.5 : 2.5;
      bars += `<rect x="${x}" y="2" width="${width}" height="28" fill="black" />`;
      x += width + spacing;
    }
    return `
      <svg width="${x + 10}" height="32" viewBox="0 0 ${x + 10} 32" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
        ${bars}
      </svg>
    `;
  };

  // Edit Pricing State
  // Map of orderId -> itemIndex -> newPrice
  const [customPrices, setCustomPrices] = useState({});

  const [sellerInvoices, setSellerInvoices] = useState([]);

  useEffect(() => {
    if (invoiceType === 'seller_generated') {
      if (sellerInvoices.length === 0) fetchSellerInvoices();
    } else {
      if (orders.length === 0) fetchOrders();
    }
  }, [invoiceType]);

  const fetchSellerInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/seller-invoices/admin/all');
      setSellerInvoices(data);
    } catch (err) {
      console.error('Failed to fetch seller invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to mark this invoice as cleared?')) return;
    try {
      await api.put(`/seller-invoices/admin/${id}/clear`);
      setSellerInvoices(sellerInvoices.map(inv => inv._id === id ? { ...inv, status: 'Cleared' } : inv));
    } catch (err) {
      alert('Failed to clear invoice');
    }
  };

  const handleDownloadInvoice = async (id) => {
    try {
      const response = await api.get(`/seller-invoices/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Seller_Invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download invoice');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        api.get('/orders/admin/all'),
        api.get('/products')
      ]);
      const productMap = {};
      if (productsRes && productsRes.data) {
        productsRes.data.forEach(p => {
          productMap[p._id] = p.gstPercent || 0;
        });
      }
      setProductGstMap(productMap);
      setOrders(ordersRes.data);
      setFilteredOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [invoiceType, segmentType, searchTerm, dateFilter, customDate, collation, orders]);

  const applyFilters = () => {
    let result = [...orders];

    // Segment Filter
    if (segmentType !== 'All') {
      result = result.filter(o => (o.userId?.role?.toUpperCase() || 'B2C') === segmentType);
    }

    // Search Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o => {
        const buyerName = o.userId?.name?.toLowerCase() || '';
        const sellerName = o.sellerId?.name?.toLowerCase() || o.sellerId?.companyName?.toLowerCase() || '';
        return buyerName.includes(term) || sellerName.includes(term);
      });
    }

    // Date Filter
    const today = new Date();
    if (dateFilter === 'Today') {
      result = result.filter(o => new Date(o.createdAt).toDateString() === today.toDateString());
    } else if (dateFilter === 'This Week') {
      const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
      result = result.filter(o => new Date(o.createdAt) >= firstDay);
    } else if (dateFilter === 'This Month') {
      result = result.filter(o => new Date(o.createdAt).getMonth() === new Date().getMonth() && new Date(o.createdAt).getFullYear() === new Date().getFullYear());
    } else if (dateFilter === 'Custom' && customDate.start && customDate.end) {
      result = result.filter(o => {
        const oDate = new Date(o.createdAt);
        return oDate >= new Date(customDate.start) && oDate <= new Date(customDate.end);
      });
    }

    // Collation is UI only for now unless specified
    if (collation === 'Collated') {
      // Mock logic or actual logic if exists
    } else if (collation === 'Uncollated') {
      // Mock logic
    }

    setFilteredOrders(result);
  };

  const handlePriceChange = (orderId, itemIndex, newPrice) => {
    setCustomPrices(prev => ({
      ...prev,
      [`${orderId}_${itemIndex}`]: Number(newPrice)
    }));
  };

  const calculateItemPrice = (orderId, itemIndex, originalPrice) => {
    const key = `${orderId}_${itemIndex}`;
    return customPrices[key] !== undefined ? customPrices[key] : originalPrice;
  };

  const handlePreview = (selectedOrders = filteredOrders) => {
    setPreviewOrders(selectedOrders);
    setShowPreview(true);
  };

  const generatePrintHTML = () => {
    let pagesHtml = '';

    const ordersToRender = collation === 'Collated' ? [{
      _id: 'COLLATED-' + new Date().getTime().toString().slice(-6),
      createdAt: new Date(),
      shippingAddress: previewOrders[0]?.shippingAddress,
      userId: previewOrders[0]?.userId,
      sellerId: previewOrders[0]?.sellerId,
      paymentMethod: 'Multiple',
      items: previewOrders.flatMap(o => o.items.map((it, idx) => ({ ...it, parentOrderId: o._id, itemIndex: idx })))
    }] : previewOrders;

    pagesHtml = ordersToRender.map((order, orderIndex) => {
      const pageBreakClass = orderIndex > 0 ? 'page-break' : '';
      let totalQty = 0;
      let totalTaxableValue = 0;
      let totalSgst = 0;
      let totalCgst = 0;
      let grandTotal = 0;

      const itemsHtml = order.items.map((item, i) => {
        const rawPrice = item.price || 0;
        const currentPrice = calculateItemPrice(item.parentOrderId || order._id, item.itemIndex !== undefined ? item.itemIndex : i, rawPrice);
        const itemTotal = currentPrice * item.quantity;
        
        const gstPercent = item.gstPercent || item.productId?.gstPercent || item.product?.gstPercent || productGstMap[item.productId?._id || item.productId] || 0;
        const halfGstPercent = gstPercent / 2;
        
        const taxableValue = itemTotal / (1 + gstPercent / 100);
        const cgst = taxableValue * (halfGstPercent / 100);
        const sgst = taxableValue * (halfGstPercent / 100);
        
        totalQty += item.quantity;
        totalTaxableValue += taxableValue;
        totalCgst += cgst;
        totalSgst += sgst;
        grandTotal += itemTotal;

        const hsnCode = item.hsn || item.productId?.hsn || item.product?.hsn || '25010090';
        const unitLabel = item.unit || item.productId?.unit || 'Pack';

        return `
          <tr class="item-row">
            <td style="text-align: center; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">${i + 1}</td>
            <td style="text-align: left; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">
              <div style="font-weight: 700; color: #000; font-size: 9px; line-height: 1.1;">${item.name}</div>
              <div style="font-size: 7.5px; color: #555; margin-top: 1px;">HSN:${hsnCode}</div>
            </td>
            <td style="text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">${item.quantity}</td>
            <td style="text-align: left; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">${unitLabel}</td>
            <td style="text-align: right; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">${currentPrice.toFixed(2)}</td>
            <td style="text-align: right; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">${taxableValue.toFixed(2)}</td>
            <td style="text-align: right; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">
              <div>${sgst > 0 ? sgst.toFixed(3) : '-'}</div>
              ${sgst > 0 ? `<div style="font-size: 7px; color: #555;">${halfGstPercent}%</div>` : ''}
            </td>
            <td style="text-align: right; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">
              <div>${cgst > 0 ? cgst.toFixed(3) : '-'}</div>
              ${cgst > 0 ? `<div style="font-size: 7px; color: #555;">${halfGstPercent}%</div>` : ''}
            </td>
            <td style="text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join('');

      const invNo = order.invoiceNumber || `BYJS/${order._id.slice(-8).toUpperCase()}`;
      const invDate = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const orderNo = order.orderNumber || order._id.slice(-8).toUpperCase();
      const barcodeValue = `${order._id.slice(-8)}-${order.userId?._id?.slice(-8) || '00000000'}-${orderNo}`;

      const sellerName = order.sellerId?.companyName || order.sellerId?.name || 'SNB TRADING.CO';
      const sellerGst = order.sellerId?.gstNumber || '29BQHPG3242G1ZYNO';
      const sellerAddress = order.sellerId?.address || '307 ashrya layout vishweshwaria 7th block kodigehalli post opp cii institute magadi main road bangalore 560091';

      const buyerName = order.shippingAddress?.name || order.userId?.name || 'Customer';
      const buyerAddress = order.shippingAddress?.address || order.userId?.address || 'No, 123 Main Street, Bengaluru, Karnataka';
      const buyerPhone = order.shippingAddress?.phone || order.userId?.phone || '';

      const netPayableInWords = numberToWords(Math.round(grandTotal));

      return `
        <div class="invoice-page-container ${pageBreakClass}">
          <div class="invoice-page">
            <!-- Header Grid -->
            <div class="header-section">
              <div class="header-left">
                <div class="tax-invoice-title">Tax Invoice</div>
                <div class="seller-info">
                  <strong>${sellerName}</strong><br/>
                  <strong>GSTIN:${sellerGst}</strong><br/>
                  ${sellerAddress}
                </div>
              </div>
              <div class="header-right">
                <table class="inv-meta-table">
                  <tr>
                    <td class="meta-label">Inv. No. -</td>
                    <td class="meta-val">${invNo}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Order #</td>
                    <td class="meta-val">${orderNo}</td>
                  </tr>
                  <tr>
                    <td class="meta-label">Inv. Date</td>
                    <td class="meta-val">${invDate}</td>
                  </tr>
                  <tr>
                    <td colspan="2" class="meta-doc-type">ORIGINAL FOR RECIPIENT</td>
                  </tr>
                </table>
                <div class="barcode-container">
                  ${generateBarcode(barcodeValue)}
                  <div class="barcode-text">${barcodeValue}</div>
                </div>
              </div>
            </div>

            <div class="divider-line"></div>

            <!-- Bill To/Ship To Section -->
            <div class="bill-to-section">
              <div class="bill-to-title">BILL TO/SHIP TO</div>
              <div class="buyer-info">
                <strong>${buyerName.toUpperCase()}</strong><br/>
                ${buyerAddress} ${buyerPhone ? `<br/>Phone: ${buyerPhone}` : ''}
              </div>
            </div>

            <!-- Items Table -->
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 4%;">SNo.</th>
                  <th style="width: 32%;">Item(s)</th>
                  <th style="width: 8%; text-align: right;">Quantity</th>
                  <th style="width: 8%;">Units</th>
                  <th style="width: 8%; text-align: right;">Rate(Rs.)</th>
                  <th style="width: 10%; text-align: right;">Taxable Value(Rs.)</th>
                  <th style="width: 10%; text-align: right;">SGST/UTGST(Rs.)</th>
                  <th style="width: 10%; text-align: right;">CGST(Rs.)</th>
                  <th style="width: 10%; text-align: right;">TOTAL(Rs.)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                <tr class="total-row">
                  <td colspan="2" style="font-weight: 700; text-align: left; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;">INVOICE TOTAL</td>
                  <td style="font-weight: 700; text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;">${totalQty}</td>
                  <td style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;"></td>
                  <td style="border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;"></td>
                  <td style="font-weight: 700; text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;">${totalTaxableValue.toFixed(2)}</td>
                  <td style="font-weight: 700; text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;">${totalSgst.toFixed(3)}</td>
                  <td style="font-weight: 700; text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;">${totalCgst.toFixed(3)}</td>
                  <td style="font-weight: 700; text-align: right; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; padding: 6px;">${grandTotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <!-- Bottom Summary Section -->
            <div class="bottom-section">
              <div class="net-payable-row">
                <span class="net-payable-label">Net Payable</span>
                <span class="net-payable-value">Rs. ${grandTotal.toFixed(2)}</span>
              </div>
              <div class="divider-line-short"></div>
              <div class="words-row">
                Rupees ${netPayableInWords}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoices</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          @page {
            size: ${pageSize};
            margin: 4mm 6mm;
          }
          body {
            font-family: 'Outfit', 'Inter', sans-serif;
            color: #000;
            background: #e2e8f0;
            margin: 0;
            padding: 20px;
            font-size: ${pageSize === 'A5' ? '8.5px' : '11px'};
            line-height: 1.3;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            body { background: #fff; padding: 0; margin: 0; }
            .invoice-page-container { margin: 0; box-shadow: none; border-radius: 0; width: 100%; min-height: auto; padding: 0; }
          }
          .page-break { page-break-before: always; }
          .invoice-page-container {
            background: white;
            width: ${pageSize === 'A4' ? '210mm' : '148mm'};
            min-height: ${pageSize === 'A4' ? '297mm' : '210mm'};
            box-shadow: 0 5px 15px rgba(0,0,0,0.15);
            padding: 12px;
            margin: 0 auto 15px auto;
            box-sizing: border-box;
          }
          .invoice-page { width: 100%; box-sizing: border-box; }
          
          .header-section { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
          .header-left { width: 60%; }
          .header-right { width: 38%; text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
          
          .tax-invoice-title { font-size: ${pageSize === 'A5' ? '18px' : '24px'}; font-weight: 800; color: #000; margin-bottom: 4px; }
          .seller-info { font-size: ${pageSize === 'A5' ? '8px' : '10px'}; color: #111; line-height: 1.3; font-weight: 500; }
          
          .inv-meta-table { font-size: ${pageSize === 'A5' ? '8px' : '10px'}; border-collapse: collapse; margin-bottom: 4px; width: 100%; }
          .inv-meta-table td { padding: 1px 0; }
          .meta-label { font-weight: 500; color: #444; text-align: right; padding-right: 6px !important; }
          .meta-val { font-weight: 700; color: #000; text-align: left; }
          .meta-doc-type { font-weight: 800; color: #000; text-align: right; padding-top: 4px; font-size: ${pageSize === 'A5' ? '9px' : '11px'}; }
          
          .barcode-container { text-align: center; margin-top: 4px; }
          .barcode-text { font-size: 7px; font-weight: 700; color: #000; margin-top: 2px; letter-spacing: 0.5px; }
          
          .divider-line { border-top: 1.5px solid #000; margin: 6px 0; }
          
          .bill-to-section { margin-bottom: 8px; }
          .bill-to-title { font-weight: 800; font-size: ${pageSize === 'A5' ? '8px' : '10px'}; text-transform: uppercase; margin-bottom: 2px; color: #000; }
          .buyer-info { font-size: ${pageSize === 'A5' ? '8.5px' : '10.5px'}; color: #000; line-height: 1.3; }
          
          .items-table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px; }
          .items-table th { 
            border-top: 1px solid #000; 
            border-bottom: 1px solid #000; 
            padding: 4px 6px; 
            font-size: ${pageSize === 'A5' ? '7.5px' : '9.5px'}; 
            font-weight: 700; 
            color: #000; 
            text-transform: uppercase; 
            text-align: left;
          }
          .items-table th:nth-child(3),
          .items-table th:nth-child(5),
          .items-table th:nth-child(6),
          .items-table th:nth-child(7),
          .items-table th:nth-child(8),
          .items-table th:nth-child(9) {
            text-align: right;
          }
          
          .total-row td { 
            font-size: ${pageSize === 'A5' ? '8.5px' : '10.5px'}; 
            padding: 6px;
          }
          
          .bottom-section { display: flex; flex-direction: column; align-items: flex-end; margin-top: 10px; }
          .net-payable-row { display: flex; justify-content: space-between; width: 45%; font-size: ${pageSize === 'A5' ? '11px' : '14px'}; font-weight: 800; color: #000; }
          .divider-line-short { border-top: 1.5px solid #000; width: 45%; margin: 3px 0; }
          .words-row { width: 45%; font-weight: 700; font-size: ${pageSize === 'A5' ? '9px' : '11px'}; color: #000; text-align: right; line-height: 1.2; }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(generatePrintHTML());
      doc.close();
      iframeRef.current.contentWindow.focus();
      setTimeout(() => {
        iframeRef.current.contentWindow.print();
      }, 500);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] m-0">Invoices Hub</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">Generate and customize print-ready invoices</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          
          <div>
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Invoice Type</label>
            <select className="input-field" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}>
              <option value="order">Order Invoice</option>
              <option value="purchase">Purchase (Seller) Invoice</option>
              <option value="seller_generated">Seller Generated Invoices</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Segment</label>
            <select className="input-field" value={segmentType} onChange={e => setSegmentType(e.target.value)}>
              <option value="All">All Segments</option>
              <option value="B2B">B2B Only</option>
              <option value="B2C">B2C Only</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input 
                type="text" 
                placeholder="Buyer or Seller Name" 
                className="input-field pl-9" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Date Range</label>
            <select className="input-field" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom">Custom Duration</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Collation</label>
            <select className="input-field" value={collation} onChange={e => setCollation(e.target.value)}>
              <option value="All">All</option>
              <option value="Collated">Collated</option>
              <option value="Uncollated">Uncollated</option>
            </select>
          </div>
        </div>

        {dateFilter === 'Custom' && (
          <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <div style={{ flex: 1 }}>
              <label className="text-xs font-bold text-[var(--text-dim)] mb-2 block">Start Date</label>
              <input type="date" className="input-field" value={customDate.start} onChange={e => setCustomDate({...customDate, start: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-xs font-bold text-[var(--text-dim)] mb-2 block">End Date</label>
              <input type="date" className="input-field" value={customDate.end} onChange={e => setCustomDate({...customDate, end: e.target.value})} />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-[var(--glass-border)] pt-6 mt-2">
          <div className="text-sm font-semibold text-[var(--text-main)]">
            Found {filteredOrders.length} matching records
          </div>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={() => handlePreview(filteredOrders)}
            disabled={filteredOrders.length === 0 || invoiceType === 'seller_generated'}
            style={{ opacity: invoiceType === 'seller_generated' ? 0.5 : 1 }}
          >
            <FileText size={18} />
            <span>Preview & Generate All ({filteredOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {invoiceType === 'seller_generated' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                  <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>SELLER</th>
                  <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>PERIOD</th>
                  <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>AMOUNT / ORDERS</th>
                  <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px', fontWeight: 600 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                      <div className="animate-spin" style={{ display: 'inline-block' }}><Receipt size={24} /></div>
                    </td>
                  </tr>
                ) : sellerInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No seller invoices generated yet.
                    </td>
                  </tr>
                ) : sellerInvoices.map((inv) => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover hover-row">
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                        {inv.sellerId?.businessName || inv.sellerId?.name || 'Unknown Seller'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {inv.sellerId?.email || ''}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-dim)' }}>
                        <Calendar size={14} />
                        {new Date(inv.startDate).toLocaleDateString()} - {new Date(inv.endDate).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Generated: {new Date(inv.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '15px' }}>₹{inv.totalAmount}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{inv.orderCount} Orders</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ 
                        padding: '6px 12px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: 700,
                        background: inv.status === 'Cleared' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color: inv.status === 'Cleared' ? '#22c55e' : '#eab308'
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleDownloadInvoice(inv._id)}
                          className="btn-primary"
                          style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: 'none' }}
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        {inv.status !== 'Cleared' && (
                          <button 
                            onClick={() => handleClearInvoice(inv._id)}
                            className="btn-primary"
                            style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'none' }}
                            title="Mark as Cleared"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--card-bg)' }}>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>ORDER ID</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>CUSTOMER / SELLER</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>DATE</th>
                  <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>AMOUNT</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '12px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.slice(0, 50).map(order => (
                  <tr key={order._id} className="border-b border-[var(--glass-border)] hover:bg-white/5">
                    <td style={{ padding: '16px 24px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                      #{order._id.slice(-8).toUpperCase()}
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{order.userId?.role?.toUpperCase() || 'B2C'}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{order.shippingAddress?.name || order.userId?.name || 'Customer'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Seller: {order.sellerId?.name || 'Zudo Admin'}</div>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--text-dim)' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{order.totalAmount}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handlePreview([order])}
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: 'none' }}
                      >
                        Preview Single
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length > 50 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                      Showing first 50 results. Use filters to narrow down or "Preview All" to print all.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
          <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)' }}>
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold m-0 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Printer size={24} style={{ color: 'var(--primary)' }} />
                Invoice Print Preview
              </h2>
              <div className="flex gap-4 ml-8">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-dim)' }}>Page Size:</label>
                  <select 
                    className="input-field" 
                    style={{ padding: '6px 12px', minHeight: 'auto', fontSize: '13px', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                    value={pageSize}
                    onChange={e => setPageSize(e.target.value)}
                  >
                    <option value="A4">A4 (Standard)</option>
                    <option value="A5">A5 (Half Size)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handlePrint}
                className="btn-primary flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}
              >
                <Download size={18} />
                <span>Download / Print PDF</span>
              </button>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '8px' }}>
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflow: 'auto', padding: '32px', display: 'flex', gap: '32px' }}>
            {/* Editor Sidebar */}
            <div style={{ width: '350px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <h3 className="text-sm font-bold border-b pb-2 m-0 flex items-center gap-2" style={{ color: 'var(--text-main)', borderColor: 'var(--glass-border)' }}>
                <Edit2 size={16} /> Edit Pricing
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Modify the product prices specifically for this invoice printout. This does not change the actual database price.</p>
              
              <div className="flex flex-col gap-6">
                {previewOrders.map(order => (
                  <div key={order._id} className="p-4 rounded-xl border" style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)' }}>
                    <div className="text-xs font-bold mb-3" style={{ color: 'var(--primary)' }}>Order #{order._id.slice(-8).toUpperCase()}</div>
                    <div className="flex flex-col gap-3">
                      {order.items.map((item, index) => {
                        const rawPrice = item.price || 0;
                        const currentPrice = calculateItemPrice(order._id, index, rawPrice);
                        return (
                          <div key={index} className="flex flex-col gap-1">
                            <span className="text-xs truncate" style={{ color: 'var(--text-main)' }}>{item.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs line-through" style={{ color: 'var(--text-dim)' }}>₹{rawPrice.toFixed(2)}</span>
                              <input 
                                type="number" 
                                className="input-field flex-1"
                                style={{ padding: '6px', fontSize: '13px', minHeight: 'auto' }}
                                value={currentPrice}
                                onChange={e => handlePriceChange(order._id, index, e.target.value)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Document */}
            <div style={{ flex: 1, background: 'var(--glass-bg)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
              <div 
                style={{ width: '100%' }}
                dangerouslySetInnerHTML={{ __html: generatePrintHTML() }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hidden Iframe for actual printing */}
      <iframe ref={iframeRef} style={{ display: 'none' }} title="Print Frame" />
    </div>
  );
};

export default Invoices;
