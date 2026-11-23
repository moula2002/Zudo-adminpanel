import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import api, { getImageUrl } from '../utils/api';
import { 
  Receipt, Printer, Search, Filter, Calendar, CheckCircle2, FileText, X, ChevronDown, Edit2, Download, Table, Eye,
  RefreshCcw, Copy, Check, ChevronLeft, ChevronRight, Building2, MapPin, Phone, Mail, LayoutGrid, ShieldCheck, AlertCircle, IndianRupee, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [cityFilter, setCityFilter] = useState('All');
  const [printStatusFilter, setPrintStatusFilter] = useState('All');

  // Print Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewOrders, setPreviewOrders] = useState([]);
  const [pageSize, setPageSize] = useState('A5');
  const [printCopyType, setPrintCopyType] = useState('ORIGINAL FOR RECIPIENT');
  const iframeRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [customItemNames, setCustomItemNames] = useState({});
  const [customItemQuantities, setCustomItemQuantities] = useState({});
  
  const [customInvoiceNumbers, setCustomInvoiceNumbers] = useState({});
  // Calculate or retrieve consistent sequential invoice and order reference numbers
  const getInvoiceSequence = (order) => {
    if (order.invoiceSequence && typeof order.invoiceSequence === 'number') {
      return order.invoiceSequence;
    }
    // Fallback: calculate chronological index (oldest order = 1)
    const sorted = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const idx = sorted.findIndex(o => o._id === order._id);
    return idx >= 0 ? idx + 1 : 1;
  };

  const getOrderRef = (order) => {
    if (customOrderNumbers[order._id]) return customOrderNumbers[order._id];
    const seq = getInvoiceSequence(order);
    return String(seq);
  };

  const getInvoiceNumber = (order) => {
    if (customInvoiceNumbers[order._id]) return String(customInvoiceNumbers[order._id]).split('/')[0];
    if (order.invoiceNumber) return String(order.invoiceNumber).split('/')[0];
    if (order.orderRef) return String(order.orderRef).split('/')[0];
    const seq = getInvoiceSequence(order);
    return `SNB-${700 + seq}`;
  };

  const [customOrderNumbers, setCustomOrderNumbers] = useState({});

  const [sellerInvoices, setSellerInvoices] = useState([]);
  const [filteredSellerInvoices, setFilteredSellerInvoices] = useState([]);
  const [sellerInvoicePreviewUrl, setSellerInvoicePreviewUrl] = useState('');
  const [previewingSellerInvoiceId, setPreviewingSellerInvoiceId] = useState(null);
  const [selectedSellerInvoice, setSelectedSellerInvoice] = useState(null);
  const [showSellerInvoiceModal, setShowSellerInvoiceModal] = useState(false);
  const [sellerImageBlobs, setSellerImageBlobs] = useState({});
  const [sellerImageLoading, setSellerImageLoading] = useState({});
  const [imageModalUrl, setImageModalUrl] = useState('');

  useEffect(() => {
    if (!sellerInvoicePreviewUrl) return undefined;
    return () => URL.revokeObjectURL(sellerInvoicePreviewUrl);
  }, [sellerInvoicePreviewUrl]);

  useEffect(() => {
    return () => {
      Object.values(sellerImageBlobs).forEach(obj => {
        if (typeof obj === 'object' && obj !== null) {
          Object.values(obj).forEach(url => {
            if (url && typeof url === 'string' && url.startsWith('blob:')) {
              URL.revokeObjectURL(url);
            }
          });
        }
      });
    };
  }, []);

  const loadAuthenticatedImageById = async (invoiceId, imageId) => {
    const key = `${invoiceId}_${imageId}`;
    if (!invoiceId || !imageId || sellerImageBlobs[invoiceId]?.[imageId] || sellerImageLoading[key]) return;

    setSellerImageLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.get(`/seller-invoices/${invoiceId}/images/${imageId}`, {
        responseType: 'blob'
      });
      const blobUrl = URL.createObjectURL(res.data);
      setSellerImageBlobs(prev => ({
        ...prev,
        [invoiceId]: { ...(prev[invoiceId] || {}), [imageId]: blobUrl }
      }));
    } catch (err) {
      console.warn(`Could not load image ${imageId} for invoice ${invoiceId}:`, err.message);
    } finally {
      setSellerImageLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const openSellerInvoiceModal = async (inv) => {
    setSelectedSellerInvoice(inv);
    setShowSellerInvoiceModal(true);

    try {
      const { data } = await api.get(`/seller-invoices/${inv._id}/images`);
      if (Array.isArray(data)) {
        setSelectedSellerInvoice(prev => ({ ...prev, detailedImages: data }));
        data.forEach(img => {
          loadAuthenticatedImageById(inv._id, img._id);
        });
      }
    } catch (e) {
      console.warn('Could not fetch detailed images for modal:', e.message);
    }
  };

  const fetchSellerInvoices = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/seller-invoices/admin/all', { skipCache: true });
      setSellerInvoices(data || []);
      setFilteredSellerInvoices(data || []);
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
      toast.error('Failed to clear invoice');
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
      toast.error('Failed to download invoice');
    }
  };

  const handlePreviewSellerInvoice = async (id) => {
    setPreviewingSellerInvoiceId(id);
    try {
      const response = await api.get(`/seller-invoices/${id}/download`, { responseType: 'blob' });
      setSellerInvoicePreviewUrl(URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' })
      ));
    } catch {
      toast.error('Failed to preview invoice');
    } finally {
      setPreviewingSellerInvoiceId(null);
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
    if (invoiceType === 'seller_generated') {
      fetchSellerInvoices();
    } else if (orders.length === 0) {
      fetchOrders();
    }
  }, [invoiceType]);

  useEffect(() => {
    applyFilters();
  }, [invoiceType, segmentType, searchTerm, dateFilter, customDate, collation, cityFilter, orders, sellerInvoices]);

  const applyFilters = () => {
    // 1. Filter Orders (for 'order' and 'purchase' modes)
    let result = [...orders];

    // Invoice Type Filter
    if (invoiceType === 'purchase') {
      result = result.filter(o => o.sellerId);
    }

    // Print Status Filter
    if (printStatusFilter === 'Printed') {
      result = result.filter(o => o.isPrinted);
    } else if (printStatusFilter === 'Unprinted') {
      result = result.filter(o => !o.isPrinted);
    }

    // City Filter
    if (cityFilter !== 'All') {
      result = result.filter(o => o.locationId?.city === cityFilter);
    }

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

    setFilteredOrders(result);

    // 2. Filter Seller Invoices (for 'seller_generated' mode)
    let sellerResult = [...sellerInvoices];

    // Segment Filter for Seller Invoices
    if (segmentType !== 'All') {
      sellerResult = sellerResult.filter(inv => {
        const primaryOrder = inv.orderId || (inv.orders && inv.orders[0]);
        const userRole = (primaryOrder?.userId?.role || '').toUpperCase() || 'B2C';
        return userRole === segmentType;
      });
    }

    // Search Filter for Seller Invoices
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      sellerResult = sellerResult.filter(inv => {
        const primaryOrder = inv.orderId || (inv.orders && inv.orders[0]);
        const buyerName = (
          primaryOrder?.userId?.businessName ||
          primaryOrder?.userId?.companyName ||
          primaryOrder?.userId?.name ||
          primaryOrder?.shippingAddress?.name ||
          ''
        ).toLowerCase();
        const sellerName = (
          inv.sellerName ||
          inv.sellerId?.businessName ||
          inv.sellerId?.storeName ||
          inv.sellerId?.name ||
          ''
        ).toLowerCase();
        const invoiceNum = (inv.invoiceNumber || '').toLowerCase();
        const orderNum = String(inv.orderNumber || primaryOrder?.orderNumber || primaryOrder?.orderId || '').toLowerCase();
        return buyerName.includes(term) || sellerName.includes(term) || invoiceNum.includes(term) || orderNum.includes(term);
      });
    }

    // Date Filter for Seller Invoices
    const now = new Date();
    if (dateFilter === 'Today') {
      sellerResult = sellerResult.filter(inv => new Date(inv.createdAt).toDateString() === now.toDateString());
    } else if (dateFilter === 'This Week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      sellerResult = sellerResult.filter(inv => new Date(inv.createdAt) >= firstDay);
    } else if (dateFilter === 'This Month') {
      sellerResult = sellerResult.filter(inv => new Date(inv.createdAt).getMonth() === new Date().getMonth() && new Date(inv.createdAt).getFullYear() === new Date().getFullYear());
    } else if (dateFilter === 'Custom' && customDate.start && customDate.end) {
      sellerResult = sellerResult.filter(inv => {
        const invDate = new Date(inv.createdAt);
        return invDate >= new Date(customDate.start) && invDate <= new Date(customDate.end);
      });
    }

    setFilteredSellerInvoices(sellerResult);
  };

  const handlePriceChange = (orderId, itemIndex, newPrice) => {
    setCustomPrices(prev => ({
      ...prev,
      [`${orderId}_${itemIndex}`]: Number(newPrice)
    }));
  };

  const handleInvoiceNumberChange = (orderId, newInvNo) => {
    setCustomInvoiceNumbers(prev => ({
      ...prev,
      [orderId]: newInvNo
    }));
  };

  const handleOrderNumberChange = (orderId, newOrdNo) => {
    setCustomOrderNumbers(prev => ({
      ...prev,
      [orderId]: newOrdNo
    }));
  };

  const handleItemNameChange = (orderId, itemIndex, newName) => {
    setCustomItemNames(prev => ({
      ...prev,
      [`${orderId}_${itemIndex}`]: newName
    }));
  };

  const handleItemQuantityChange = (orderId, itemIndex, newQty) => {
    setCustomItemQuantities(prev => ({
      ...prev,
      [`${orderId}_${itemIndex}`]: Number(newQty)
    }));
  };

  const calculateItemPrice = (orderId, itemIndex, originalPrice) => {
    const key = `${orderId}_${itemIndex}`;
    return customPrices[key] !== undefined ? customPrices[key] : originalPrice;
  };

  const calculateItemName = (orderId, itemIndex, originalName) => {
    const key = `${orderId}_${itemIndex}`;
    return customItemNames[key] !== undefined ? customItemNames[key] : originalName;
  };

  const calculateItemQuantity = (orderId, itemIndex, originalQty) => {
    const key = `${orderId}_${itemIndex}`;
    return customItemQuantities[key] !== undefined ? customItemQuantities[key] : originalQty;
  };

  const handleDirectBulkPrint = async (selectedOrders = filteredOrders) => {
    if (selectedOrders.length === 0) return;
    if (iframeRef.current) {
      const html = generatePrintHTML(selectedOrders);
      const doc = iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      iframeRef.current.contentWindow.focus();
      setTimeout(() => {
        iframeRef.current.contentWindow.print();
        const orderIds = selectedOrders.map(o => o._id);
        api.post('/orders/bulk-print-status', { orderIds }).then(() => {
          toast.success('Orders marked as printed successfully');
          setOrders(prev => prev.map(o => orderIds.includes(o._id) ? { ...o, isPrinted: true } : o));
        }).catch(err => {
          console.error(err);
          toast.error('Failed to update print status on server');
        });
      }, 500);
    }
  };

  const handlePreview = (selectedOrders = filteredOrders) => {
    setPreviewOrders(selectedOrders);
    setShowPreview(true);
  };

  const handleBulkExcelDownload = () => {
    if (invoiceType === 'seller_generated') {
      if (filteredSellerInvoices.length === 0) return;
      const excelData = filteredSellerInvoices.map(inv => {
        const primaryOrder = inv.orderId || (inv.orders && inv.orders[0]);
        const orderIdVal = inv.orderNumber 
          ? `#${String(inv.orderNumber).padStart(5, '0')}`
          : (primaryOrder?.orderNumber ? `#${String(primaryOrder.orderNumber).padStart(5, '0')}` : (inv.invoiceNumber || '—'));
        const customerName = primaryOrder?.userId?.businessName || primaryOrder?.userId?.companyName || primaryOrder?.shippingAddress?.name || primaryOrder?.userId?.name || 'Customer';
        const sellerName = inv.sellerName || inv.sellerId?.businessName || inv.sellerId?.storeName || inv.sellerId?.name || 'Seller';

        return {
          'Invoice ID': inv.invoiceNumber || orderIdVal,
          'Seller': sellerName,
          'Customer / Buyer': customerName,
          'Invoice Date': new Date(inv.createdAt).toLocaleDateString(),
          'Start Date': new Date(inv.startDate).toLocaleDateString(),
          'End Date': new Date(inv.endDate).toLocaleDateString(),
          'Order ID': orderIdVal,
          'Amount': `₹${inv.totalAmount || 0}`,
          'Invoice Type': 'Seller Generated Invoice',
          'Status': inv.status || 'Pending',
          'Attached Images': inv.imageCount || (inv.hasInvoiceImage ? 1 : 0)
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Seller Invoices");
      XLSX.writeFile(wb, `Seller_Invoices_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }

    if (filteredOrders.length === 0) return;
    const excelData = filteredOrders.map(order => ({
      'Invoice No': getInvoiceNumber(order),
      'Order No': getOrderRef(order),
      'Date': new Date(order.createdAt).toLocaleDateString(),
      'Buyer Name': order.userId?.businessName || order.userId?.companyName || order.shippingAddress?.companyName || order.shippingAddress?.businessName || order.shippingAddress?.name || order.userId?.name || 'Customer',
      'Buyer Phone': order.shippingAddress?.phone || order.userId?.phone || '',
      'Buyer City': order.locationId?.city || '',
      'Seller Name': order.sellerId?.companyName || order.sellerId?.name || 'Zudo Admin',
      'Total Amount': order.totalAmount,
      'Payment Method': order.paymentMethod || 'Prepaid',
      'Status': order.status
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, `Invoices_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generatePrintHTML = (ordersList = previewOrders) => {
    let pagesHtml = '';

    const ordersToRender = collation === 'Collated' ? [{
      _id: 'COLLATED-' + new Date().getTime().toString().slice(-6),
      createdAt: new Date(),
      shippingAddress: ordersList[0]?.shippingAddress,
      userId: ordersList[0]?.userId,
      sellerId: ordersList[0]?.sellerId,
      paymentMethod: 'Multiple',
      items: ordersList.flatMap(o => o.items.map((it, idx) => ({ ...it, parentOrderId: o._id, itemIndex: idx })))
    }] : ordersList;

    pagesHtml = ordersToRender.map((order, orderIndex) => {
      const pageBreakClass = orderIndex > 0 ? 'page-break' : '';
      let totalQty = 0;
      let totalTaxableValue = 0;
      let totalSgst = 0;
      let totalCgst = 0;
      let grandTotal = 0;

      const itemsHtml = order.items.map((item, i) => {
        const itemIdentifier = item.itemIndex !== undefined ? item.itemIndex : i;
        const orderIdentifier = item.parentOrderId || order._id;

        const rawPrice = item.price || 0;
        const rawName = item.name || 'Unknown Item';
        const rawQty = item.quantity || 1;

        const currentPrice = calculateItemPrice(orderIdentifier, itemIdentifier, rawPrice);
        const currentName = calculateItemName(orderIdentifier, itemIdentifier, rawName);
        const currentQty = calculateItemQuantity(orderIdentifier, itemIdentifier, rawQty);

        const itemTotal = currentPrice * currentQty;
        
        const gstPercent = item.gstPercent || item.productId?.gstPercent || item.product?.gstPercent || productGstMap[item.productId?._id || item.productId] || 0;
        const halfGstPercent = gstPercent / 2;
        
        const taxableValue = itemTotal / (1 + gstPercent / 100);
        const cgst = taxableValue * (halfGstPercent / 100);
        const sgst = taxableValue * (halfGstPercent / 100);
        
        totalQty += currentQty;
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
              <div style="font-weight: 700; color: #000; font-size: 9px; line-height: 1.1;">${currentName}</div>
              <div style="font-size: 7.5px; color: #555; margin-top: 1px;">HSN:${hsnCode}</div>
            </td>
            <td style="text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding: 4px 6px;">${currentQty}</td>
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

      const invNo = getInvoiceNumber(order);
      const invDate = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const orderNo = getOrderRef(order);
      const barcodeValue = `${getInvoiceSequence(order)}-${order.userId?._id?.slice(-8) || '00000000'}-${orderNo}`;

      const isPurchase = invoiceType === 'purchase';
      const adminName = 'SNB TRADING.CO';
      const adminGst = '29BQHPG3242G1ZYNO';
      const adminAddress = '307 ashrya layout vishweshwaria 7th block kodigehalli post opp cii institute magadi main road bangalore 560091';

      const sellerName = order.sellerId?.companyName || order.sellerId?.name || adminName;
      const sellerGst = order.sellerId?.gstNumber || adminGst;
      const sellerAddress = order.sellerId?.address || adminAddress;

      const buyerName = isPurchase ? adminName : (order.userId?.businessName || order.userId?.companyName || order.shippingAddress?.companyName || order.shippingAddress?.businessName || order.shippingAddress?.name || order.userId?.name || 'Customer');
      const buyerAddress = isPurchase ? adminAddress : (order.shippingAddress?.address || order.userId?.address || 'No, 123 Main Street, Bengaluru, Karnataka');
      const buyerPhone = isPurchase ? '' : (order.shippingAddress?.phone || order.userId?.phone || '');

      const netPayableInWords = numberToWords(Math.round(grandTotal));

      return `
        <div class="invoice-page-container ${pageBreakClass}">
          <div class="invoice-page">
            <!-- Header Grid -->
            <div class="header-section">
              <div class="header-left">
                <div class="tax-invoice-title">${isPurchase ? 'Purchase Invoice' : 'Tax Invoice'}</div>
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
                    <td colspan="2" class="meta-doc-type">${printCopyType}</td>
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
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px; width: 100%;">
              <div style="flex: 1; display: flex; align-items: flex-end; gap: 12px; padding-top: 5px;">
                ${(() => {
                  const orderSeller = order.sellerId || (order.items && order.items[0] && order.items[0].seller && order.items[0].seller.sellerId);
                  const qrCodeDoc = orderSeller?.qrCodeDoc || order.qrCodeDoc;
                  const qrOption = orderSeller?.qrOption || order.qrOption;
                  return qrCodeDoc ? `
                  <img src="${getImageUrl(qrCodeDoc)}" alt="QR" style="width: ${pageSize === 'A5' ? '60px' : '80px'}; height: ${pageSize === 'A5' ? '60px' : '80px'}; border: 1px solid #ccc; padding: 2px; border-radius: 6px; object-fit: contain; background: #fff;" />
                  <div style="font-size: ${pageSize === 'A5' ? '9px' : '11px'}; color: #111; font-weight: 700; display: flex; flex-direction: column; gap: 4px;">
                    <span style="color: #666; font-size: ${pageSize === 'A5' ? '7px' : '9px'}; text-transform: uppercase;">Scan to Pay</span>
                    ${qrOption ? `<span>${qrOption}</span>` : ''}
                  </div>
                ` : `<div style="font-size: ${pageSize === 'A5' ? '9px' : '11px'}; color: #666; font-weight: 600;">QR Code Not Available</div>`;
                })()}
              </div>
              <div class="bottom-section" style="margin-top: 0; width: 50%;">
                <div class="net-payable-row" style="width: 100%;">
                  <span class="net-payable-label">Net Payable</span>
                  <span class="net-payable-value">Rs. ${grandTotal.toFixed(2)}</span>
                </div>
                <div class="divider-line-short" style="width: 100%;"></div>
                <div class="words-row" style="width: 100%;">
                  Rupees ${netPayableInWords}
                </div>
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

  const [viewMode, setViewMode] = useState('table');
  const [rowsPerPage, setRowsPerPage] = useState('25');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  const isAnyFilterActive = useMemo(() => {
    return segmentType !== 'All' || searchTerm.trim() !== '' || dateFilter !== 'All Time' || collation !== 'All' || cityFilter !== 'All' || printStatusFilter !== 'All';
  }, [segmentType, searchTerm, dateFilter, collation, cityFilter, printStatusFilter]);

  const clearAllFilters = () => {
    setSegmentType('All');
    setSearchTerm('');
    setDateFilter('All Time');
    setCustomDate({ start: '', end: '' });
    setCollation('All');
    setCityFilter('All');
    setPrintStatusFilter('All');
    setCurrentPage(1);
  };

  const handleRefreshData = async () => {
    try {
      if (invoiceType === 'seller_generated') {
        await fetchSellerInvoices();
      } else {
        await fetchOrders();
      }
      toast.success('Invoices updated');
    } catch (err) {
      toast.error('Failed to refresh data');
    }
  };

  const copyToClipboard = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedInvoiceId(id);
    toast.success('Invoice number copied!');
    setTimeout(() => setCopiedInvoiceId(null), 2000);
  };

  const toggleOrderPrintStatus = async (orderId, currentStatus) => {
    try {
      const updatedStatus = !currentStatus;
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, isPrinted: updatedStatus } : o));
      setFilteredOrders(prev => prev.map(o => o._id === orderId ? { ...o, isPrinted: updatedStatus } : o));
      if (selectedOrderDetails?._id === orderId) {
        setSelectedOrderDetails(prev => prev ? { ...prev, isPrinted: updatedStatus } : null);
      }
      toast.success(updatedStatus ? 'Marked as Printed' : 'Marked as Unprinted');
      await api.patch(`/orders/${orderId}`, { isPrinted: updatedStatus }).catch(() => {});
    } catch (err) {
      toast.error('Failed to update print status');
    }
  };

  const totalOrderPages = rowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filteredOrders.length / (Number(rowsPerPage) || 25)));
  const totalSellerPages = rowsPerPage === 'All' ? 1 : Math.max(1, Math.ceil(filteredSellerInvoices.length / (Number(rowsPerPage) || 25)));

  const paginatedOrders = useMemo(() => {
    if (rowsPerPage === 'All') return filteredOrders;
    const size = Number(rowsPerPage) || 25;
    const start = (currentPage - 1) * size;
    return filteredOrders.slice(start, start + size);
  }, [filteredOrders, rowsPerPage, currentPage]);

  const paginatedSellerInvoices = useMemo(() => {
    if (rowsPerPage === 'All') return filteredSellerInvoices;
    const size = Number(rowsPerPage) || 25;
    const start = (currentPage - 1) * size;
    return filteredSellerInvoices.slice(start, start + size);
  }, [filteredSellerInvoices, rowsPerPage, currentPage]);

  const calculateOrderTaxBreakdown = (order) => {
    let totalQty = 0;
    let totalTaxableValue = 0;
    let totalSgst = 0;
    let totalCgst = 0;
    let grandTotal = 0;

    const items = (order?.items || []).map((item, i) => {
      const itemIdentifier = item.itemIndex !== undefined ? item.itemIndex : i;
      const orderIdentifier = item.parentOrderId || order?._id;

      const rawPrice = item.price || 0;
      const rawName = item.name || 'Unknown Item';
      const rawQty = item.quantity || 1;

      const currentPrice = calculateItemPrice(orderIdentifier, itemIdentifier, rawPrice);
      const currentName = calculateItemName(orderIdentifier, itemIdentifier, rawName);
      const currentQty = calculateItemQuantity(orderIdentifier, itemIdentifier, rawQty);

      const itemTotal = currentPrice * currentQty;
      const gstPercent = item.gstPercent || item.productId?.gstPercent || item.product?.gstPercent || productGstMap[item.productId?._id || item.productId] || 0;
      const halfGstPercent = gstPercent / 2;

      const taxableValue = itemTotal / (1 + gstPercent / 100);
      const cgst = taxableValue * (halfGstPercent / 100);
      const sgst = taxableValue * (halfGstPercent / 100);

      totalQty += currentQty;
      totalTaxableValue += taxableValue;
      totalCgst += cgst;
      totalSgst += sgst;
      grandTotal += itemTotal;

      const hsnCode = item.hsn || item.productId?.hsn || item.product?.hsn || '25010090';
      const unitLabel = item.unit || item.productId?.unit || 'Pack';

      return {
        index: i + 1,
        name: currentName,
        hsn: hsnCode,
        qty: currentQty,
        unit: unitLabel,
        rate: currentPrice,
        taxableValue,
        sgst,
        cgst,
        halfGstPercent,
        itemTotal
      };
    });

    return {
      totalQty,
      totalTaxableValue,
      totalSgst,
      totalCgst,
      totalTax: totalSgst + totalCgst,
      grandTotal: grandTotal || order?.totalAmount || 0,
      items
    };
  };

  const availableCities = ['All', ...new Set(orders.map(o => o.locationId?.city).filter(Boolean))];

  return (
    <div className="flex flex-col gap-6" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="text-3xl font-extrabold text-[var(--text-main)] m-0" style={{ fontSize: isMobile ? '22px' : '28px' }}>Invoices Hub</h1>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
              {invoiceType === 'seller_generated' ? 'Seller Accounts' : 'Tax Invoices'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-dim)] mt-1">Generate, review, and customize print-ready GST invoices</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            type="button"
            onClick={handleRefreshData}
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '9px 16px',
              fontSize: '13px',
              background: 'var(--card-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              flex: isMobile ? 1 : 'none'
            }}
            title="Refresh Invoices and Orders Data"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} style={{ color: 'var(--primary)' }} />
            <span>Refresh</span>
          </button>

          {invoiceType === 'order' && (
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'var(--glass-bg)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              flex: isMobile ? 1 : 'none'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  flex: isMobile ? 1 : 'none',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: viewMode === 'table' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: viewMode === 'table' ? '#ffffff' : 'var(--text-dim)',
                  boxShadow: viewMode === 'table' ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
                title="Table View"
              >
                <Table size={14} /> Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  flex: isMobile ? 1 : 'none',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: viewMode === 'cards' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: viewMode === 'cards' ? '#ffffff' : 'var(--text-dim)',
                  boxShadow: viewMode === 'cards' ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                  transition: 'all 0.2s'
                }}
                title="Cards View"
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter Card */}
      <div className="glass-card" style={{ padding: isMobile ? '16px' : '24px', borderRadius: '24px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: isMobile ? '14px' : '20px', marginBottom: '20px' }}>
          
          <div>
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Invoice Type</label>
            <select className="input-field" value={invoiceType} onChange={e => setInvoiceType(e.target.value)}>
              <option value="order">Order Tax Invoice</option>
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

          {invoiceType === 'order' && (
            <div>
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Print Status</label>
              <select className="input-field" value={printStatusFilter} onChange={e => setPrintStatusFilter(e.target.value)}>
                <option value="All">All Invoices</option>
                <option value="Printed">Printed Only</option>
                <option value="Unprinted">Unprinted Only</option>
              </select>
            </div>
          )}

          {invoiceType === 'order' && (
            <div>
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">City / Branch</label>
              <select className="input-field" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
                {availableCities.map(city => (
                  <option key={city} value={city}>{city === 'All' ? 'All Locations' : city}</option>
                ))}
              </select>
            </div>
          )}

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
            <label className="text-xs font-bold text-[var(--text-dim)] uppercase mb-2 block">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
              <input 
                type="text" 
                placeholder="Buyer, Seller, Inv #, Phone..." 
                className="input-field" 
                style={{ paddingLeft: '36px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {dateFilter === 'Custom' && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="text-xs font-bold text-[var(--text-dim)] mb-2 block">Start Date</label>
              <input type="date" className="input-field" value={customDate.start} onChange={e => setCustomDate({...customDate, start: e.target.value})} />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="text-xs font-bold text-[var(--text-dim)] mb-2 block">End Date</label>
              <input type="date" className="input-field" value={customDate.end} onChange={e => setCustomDate({...customDate, end: e.target.value})} />
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="text-sm font-semibold text-[var(--text-main)]">
              Found {invoiceType === 'seller_generated' ? filteredSellerInvoices.length : filteredOrders.length} records
            </span>
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={12} /> Clear Filters
              </button>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
              <span>Show:</span>
              <select
                value={rowsPerPage}
                onChange={e => {
                  setRowsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{ padding: '4px 8px', minHeight: 'auto', fontSize: '12px', width: 'auto' }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="All">All</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            <button 
              className="btn-primary"
              onClick={handleBulkExcelDownload}
              disabled={(invoiceType === 'seller_generated' ? filteredSellerInvoices.length === 0 : filteredOrders.length === 0)}
              style={{
                flex: isMobile ? '1 1 calc(50% - 5px)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                fontSize: '12.5px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                opacity: (invoiceType === 'seller_generated' ? (filteredSellerInvoices.length === 0 ? 0.5 : 1) : (filteredOrders.length === 0 ? 0.5 : 1))
              }}
              title="Download Excel Spreadsheet of Filtered Records"
            >
              <Table size={16} />
              <span>Excel Export</span>
            </button>
            
            <button 
              className="btn-primary"
              onClick={() => handlePreview(filteredOrders)}
              disabled={filteredOrders.length === 0 || invoiceType === 'seller_generated'}
              style={{
                flex: isMobile ? '1 1 calc(50% - 5px)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                fontSize: '12.5px',
                opacity: (invoiceType === 'seller_generated' || filteredOrders.length === 0) ? 0.5 : 1
              }}
              title="Preview and customize all filtered invoices"
            >
              <FileText size={16} />
              <span>Preview All ({filteredOrders.length})</span>
            </button>

            <button 
              className="btn-primary"
              onClick={() => handleDirectBulkPrint(filteredOrders)}
              disabled={filteredOrders.length === 0 || invoiceType === 'seller_generated'}
              style={{
                flex: isMobile ? '1 1 100%' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 14px',
                fontSize: '12.5px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                opacity: (invoiceType === 'seller_generated' || filteredOrders.length === 0) ? 0.5 : 1
              }}
              title="Send all filtered invoices directly to printer frame"
            >
              <Printer size={16} />
              <span>Bulk Print Page ({filteredOrders.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        {invoiceType === 'seller_generated' ? (
          <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
                  <th style={{ padding: '18px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>INVOICE / ORDER</th>
                  <th style={{ padding: '18px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>CUSTOMER / SELLER</th>
                  <th style={{ padding: '18px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>DATE</th>
                  <th style={{ padding: '18px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>AMOUNT / TYPE</th>
                  <th style={{ padding: '18px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '18px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '60px', textAlign: 'center' }}>
                      <div className="animate-spin" style={{ display: 'inline-block', color: 'var(--primary)' }}><Receipt size={28} /></div>
                      <div style={{ marginTop: '10px', color: 'var(--text-dim)', fontSize: '13px' }}>Loading seller invoices...</div>
                    </td>
                  </tr>
                ) : paginatedSellerInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No seller invoices match the selected filter criteria.
                    </td>
                  </tr>
                ) : paginatedSellerInvoices.map((inv) => {
                  const primaryOrder = inv.orderId || (inv.orders && inv.orders[0]);
                  const customerName = primaryOrder?.userId?.businessName || 
                    primaryOrder?.userId?.companyName || 
                    primaryOrder?.shippingAddress?.name || 
                    primaryOrder?.userId?.name || 
                    'Customer';
                  const sellerName = inv.sellerName || 
                    inv.sellerId?.businessName || 
                    inv.sellerId?.storeName || 
                    inv.sellerId?.name || 
                    'Unknown Seller';
                  const orderDisplayId = inv.orderNumber 
                    ? `#${String(inv.orderNumber).padStart(5, '0')}`
                    : (primaryOrder?.orderNumber ? `#${String(primaryOrder.orderNumber).padStart(5, '0')}` : (inv.invoiceNumber ? `#${inv.invoiceNumber}` : '—'));
                  const imageCount = inv.detailedImages?.length || inv.images?.length || inv.imageCount || (inv.hasInvoiceImage ? 1 : 0);

                  return (
                    <tr key={inv._id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover hover-row">
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {inv.invoiceNumber || orderDisplayId}
                        </div>
                        {inv.invoiceNumber && (
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            Order: {orderDisplayId}
                          </div>
                        )}
                        {imageCount > 0 && (
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px', 
                            marginTop: '4px',
                            fontSize: '10px', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            color: '#3b82f6',
                            fontWeight: 700
                          }}>
                            {imageCount} {imageCount === 1 ? 'image' : 'images'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>
                          {customerName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Seller: {sellerName}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-dim)' }}>
                          <Calendar size={14} />
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                          {new Date(inv.startDate).toLocaleDateString()} - {new Date(inv.endDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '15px' }}>
                          ₹{Number(inv.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Seller Generated Invoice</div>
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
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => openSellerInvoiceModal(inv)}
                            className="btn-primary"
                            style={{ padding: '8px 12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: 'none', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            title="Preview Details & Images"
                          >
                            <Eye size={15} />
                            <span>Details</span>
                          </button>
                          <button 
                            onClick={() => handleDownloadInvoice(inv._id)}
                            className="btn-primary"
                            style={{ padding: '8px 10px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: 'none' }}
                            title="Download PDF"
                          >
                            <Download size={15} />
                          </button>
                          {inv.status !== 'Cleared' && (
                            <button 
                              onClick={() => handleClearInvoice(inv._id)}
                              className="btn-primary"
                              style={{ padding: '8px 10px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'none' }}
                              title="Mark as Cleared"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'table' ? (
          <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>INVOICE & ORDER REF</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>CUSTOMER / BUYER</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>SELLER</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>DATE & TIME</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700 }}>AMOUNT</th>
                  <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '60px', textAlign: 'center' }}>
                      <div className="animate-spin" style={{ display: 'inline-block', color: 'var(--primary)' }}><Receipt size={28} /></div>
                      <div style={{ marginTop: '10px', color: 'var(--text-dim)', fontSize: '13px' }}>Loading invoices...</div>
                    </td>
                  </tr>
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      No orders match the selected invoice criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const invNo = getInvoiceNumber(order);
                    const ordRef = getOrderRef(order);
                    const isB2B = (order.userId?.role || 'b2c').toLowerCase() === 'b2b';
                    const buyerName = order.userId?.businessName || order.userId?.companyName || order.shippingAddress?.companyName || order.shippingAddress?.businessName || order.shippingAddress?.name || order.userId?.name || 'Customer';
                    const buyerPhone = order.shippingAddress?.phone || order.userId?.phone || '';
                    const buyerCity = order.locationId?.city || order.shippingAddress?.city || '';
                    const sellerName = order.sellerId?.companyName || order.sellerId?.name || 'Zudo Admin';

                    return (
                      <tr key={order._id} className="border-b border-[var(--glass-border)] hover:bg-white/5" style={{ transition: 'background 0.2s' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)', fontFamily: 'monospace' }}>
                              {invNo}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(invNo, order._id)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                              title="Copy Invoice Number"
                            >
                              {copiedInvoiceId === order._id ? <Check size={14} color="#10b981" /> : <Copy size={13} />}
                            </button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                              Ref #{ordRef}
                            </span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isB2B ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                              color: isB2B ? 'var(--primary)' : '#ec4899'
                            }}>
                              {isB2B ? 'B2B' : 'B2C'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleOrderPrintStatus(order._id, order.isPrinted)}
                              style={{
                                cursor: 'pointer',
                                border: 'none',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '9.5px',
                                fontWeight: 700,
                                background: order.isPrinted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.12)',
                                color: order.isPrinted ? '#10b981' : 'var(--text-dim)'
                              }}
                              title="Click to toggle Print Status"
                            >
                              {order.isPrinted ? '✓ Printed' : '○ Unprinted'}
                            </button>
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {buyerName}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {buyerPhone && <span>{buyerPhone}</span>}
                            {buyerPhone && buyerCity && <span>•</span>}
                            {buyerCity && <span>{buyerCity}</span>}
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {sellerName}
                          </div>
                          {order.sellerId?.gstNumber && (
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                              GSTIN: {order.sellerId.gstNumber}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '16px 24px', fontSize: '12.5px', color: 'var(--text-dim)' }}>
                          <div>{new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--text-main)' }}>
                            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {order.paymentMethod || 'Prepaid'}
                          </div>
                        </td>

                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button 
                              type="button"
                              onClick={() => setSelectedOrderDetails(order)}
                              className="btn-primary"
                              style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="View full itemized invoice breakdown"
                            >
                              <Eye size={15} />
                              <span>View Details</span>
                            </button>

                            <button 
                              type="button"
                              onClick={() => handlePreview([order])}
                              className="btn-primary"
                              style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                background: 'var(--card-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--glass-border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="Open Print & PDF Customization Preview"
                            >
                              <Printer size={15} />
                              <span>Print / PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards View */
          <div style={{ padding: isMobile ? '12px' : '20px' }}>
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div className="animate-spin" style={{ display: 'inline-block', color: 'var(--primary)' }}><Receipt size={28} /></div>
                <div style={{ marginTop: '10px', color: 'var(--text-dim)', fontSize: '13px' }}>Loading invoices...</div>
              </div>
            ) : paginatedOrders.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                No orders match the selected invoice criteria.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {paginatedOrders.map((order) => {
                  const invNo = getInvoiceNumber(order);
                  const ordRef = getOrderRef(order);
                  const isB2B = (order.userId?.role || 'b2c').toLowerCase() === 'b2b';
                  const buyerName = order.userId?.businessName || order.userId?.companyName || order.shippingAddress?.companyName || order.shippingAddress?.businessName || order.shippingAddress?.name || order.userId?.name || 'Customer';
                  const sellerName = order.sellerId?.companyName || order.sellerId?.name || 'Zudo Admin';

                  return (
                    <div 
                      key={order._id}
                      style={{
                        padding: '16px',
                        background: 'var(--glass-bg)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--primary)', fontFamily: 'monospace' }}>
                              {invNo}
                            </span>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isB2B ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                              color: isB2B ? 'var(--primary)' : '#ec4899'
                            }}>
                              {isB2B ? 'B2B' : 'B2C'}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                            Order Ref #{ordRef}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleOrderPrintStatus(order._id, order.isPrinted)}
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            background: order.isPrinted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: order.isPrinted ? '#10b981' : 'var(--text-dim)'
                          }}
                        >
                          {order.isPrinted ? '✓ Printed' : '○ Unprinted'}
                        </button>
                      </div>

                      <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{buyerName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Seller: {sellerName}</div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Total Amount</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                            ₹{Number(order.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Items</span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                            {order.items?.length || 0} Products
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderDetails(order)}
                          className="btn-primary"
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '12px',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Eye size={14} /> Details
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePreview([order])}
                          className="btn-primary"
                          style={{
                            flex: 1,
                            padding: '8px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <Printer size={14} /> Print
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pagination Bar */}
        {((invoiceType === 'order' && filteredOrders.length > 0) || (invoiceType === 'seller_generated' && filteredSellerInvoices.length > 0)) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderTop: '1px solid var(--glass-border)',
            background: 'var(--card-bg)',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
              {invoiceType === 'order' ? (
                rowsPerPage === 'All' ? (
                  `Showing all ${filteredOrders.length} records`
                ) : (
                  `Showing ${(currentPage - 1) * Number(rowsPerPage) + 1} to ${Math.min(currentPage * Number(rowsPerPage), filteredOrders.length)} of ${filteredOrders.length} records`
                )
              ) : (
                rowsPerPage === 'All' ? (
                  `Showing all ${filteredSellerInvoices.length} records`
                ) : (
                  `Showing ${(currentPage - 1) * Number(rowsPerPage) + 1} to ${Math.min(currentPage * Number(rowsPerPage), filteredSellerInvoices.length)} of ${filteredSellerInvoices.length} records`
                )
              )}
            </div>

            {rowsPerPage !== 'All' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', padding: '0 4px' }}>
                  Page {currentPage} of {invoiceType === 'order' ? totalOrderPages : totalSellerPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, (invoiceType === 'order' ? totalOrderPages : totalSellerPages)))}
                  disabled={currentPage === (invoiceType === 'order' ? totalOrderPages : totalSellerPages)}
                  className="btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    opacity: currentPage === (invoiceType === 'order' ? totalOrderPages : totalSellerPages) ? 0.4 : 1,
                    cursor: currentPage === (invoiceType === 'order' ? totalOrderPages : totalSellerPages) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Invoice Details Modal */}
      {selectedOrderDetails && (() => {
        const order = selectedOrderDetails;
        const invNo = getInvoiceNumber(order);
        const ordRef = getOrderRef(order);
        const breakdown = calculateOrderTaxBreakdown(order);
        const isB2B = (order.userId?.role || 'b2c').toLowerCase() === 'b2b';

        const sellerName = order.sellerId?.companyName || order.sellerId?.name || 'SNB TRADING.CO';
        const sellerGst = order.sellerId?.gstNumber || '29BQHPG3242G1ZYNO';
        const sellerAddress = order.sellerId?.address || '307 ashrya layout vishweshwaria 7th block kodigehalli post opp cii institute magadi main road bangalore 560091';
        const sellerPhone = order.sellerId?.phone || '';

        const buyerName = order.userId?.businessName || order.userId?.companyName || order.shippingAddress?.companyName || order.shippingAddress?.businessName || order.shippingAddress?.name || order.userId?.name || 'Customer';
        const buyerAddress = order.shippingAddress?.address || order.userId?.address || 'No, 123 Main Street, Bengaluru, Karnataka';
        const buyerPhone = order.shippingAddress?.phone || order.userId?.phone || '';

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '10px' : '20px'
          }}>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '920px',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: isMobile ? '16px' : '28px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }} className="custom-scrollbar">
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)'
                  }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                        {invNo}
                      </h3>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isB2B ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                        color: isB2B ? 'var(--primary)' : '#ec4899'
                      }}>
                        {isB2B ? 'B2B INVOICE' : 'B2C INVOICE'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: order.isPrinted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                        color: order.isPrinted ? '#10b981' : 'var(--text-dim)'
                      }}>
                        {order.isPrinted ? 'PRINTED' : 'UNPRINTED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px' }}>
                      Order Ref #{ordRef} • Date: {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrderDetails(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '8px',
                    color: 'var(--text-dim)',
                    cursor: 'pointer'
                  }}
                  title="Close Invoice Details"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Financial KPI Summary Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Net Payable</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', marginTop: '2px', display: 'block' }}>
                    ₹{breakdown.grandTotal.toFixed(2)}
                  </span>
                </div>

                <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Taxable Value</span>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                    ₹{breakdown.totalTaxableValue.toFixed(2)}
                  </span>
                </div>

                <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Total Tax (GST)</span>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--primary)', marginTop: '2px', display: 'block' }}>
                    ₹{breakdown.totalTax.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '9.5px', color: 'var(--text-dim)' }}>
                    SGST: ₹{breakdown.totalSgst.toFixed(2)} | CGST: ₹{breakdown.totalCgst.toFixed(2)}
                  </span>
                </div>

                <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Products / Qty</span>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                    {order.items?.length || 0} items ({breakdown.totalQty} units)
                  </span>
                </div>

                <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Payment Method</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                    {order.paymentMethod || 'Prepaid'}
                  </span>
                  <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>
                    {order.paymentStatus || 'Completed'}
                  </span>
                </div>
              </div>

              {/* Billed By and Billed To Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                <div style={{ padding: '16px', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                    BILLED BY (SUPPLIER)
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {sellerName}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    <strong>GSTIN:</strong> {sellerGst}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px', lineHeight: '1.4' }}>
                    {sellerAddress}
                  </div>
                  {sellerPhone && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Phone: {sellerPhone}
                    </div>
                  )}
                </div>

                <div style={{ padding: '16px', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                    BILLED TO / SHIP TO (CUSTOMER)
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                    {buyerName}
                  </div>
                  {order.userId?.gstNumber && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      <strong>GSTIN:</strong> {order.userId.gstNumber}
                    </div>
                  )}
                  <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px', lineHeight: '1.4' }}>
                    {buyerAddress}
                  </div>
                  {buyerPhone && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Phone: {buyerPhone}
                    </div>
                  )}
                </div>
              </div>

              {/* Itemized Tax Breakdown Table */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Itemized Product & Tax Breakdown
                </span>
                <div style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--glass-border)' }} className="custom-scrollbar">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)', width: '30px' }}>#</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)' }}>Item & HSN</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>Unit Rate</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>Taxable Val</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>SGST</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>CGST</th>
                        <th style={{ padding: '10px 12px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right' }}>Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {breakdown.items.map((it) => (
                        <tr key={it.index} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-dim)' }}>{it.index}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-main)' }}>{it.name}</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>HSN: {it.hsn} • Unit: {it.unit}</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: 700, textAlign: 'right', color: 'var(--text-main)' }}>{it.qty}</td>
                          <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right', color: 'var(--text-dim)' }}>₹{it.rate.toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', fontSize: '12.5px', textAlign: 'right', color: 'var(--text-main)' }}>₹{it.taxableValue.toFixed(2)}</td>
                          <td style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'right', color: 'var(--text-dim)' }}>
                            <div>₹{it.sgst.toFixed(2)}</div>
                            <span style={{ fontSize: '9.5px', opacity: 0.75 }}>({it.halfGstPercent}%)</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12px', textAlign: 'right', color: 'var(--text-dim)' }}>
                            <div>₹{it.cgst.toFixed(2)}</div>
                            <span style={{ fontSize: '9.5px', opacity: 0.75 }}>({it.halfGstPercent}%)</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 800, textAlign: 'right', color: 'var(--text-main)' }}>
                            ₹{it.itemTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ background: 'rgba(99, 102, 241, 0.05)', fontWeight: 800 }}>
                        <td colSpan={2} style={{ padding: '12px', fontSize: '12px', color: 'var(--text-main)' }}>INVOICE TOTAL</td>
                        <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', color: 'var(--text-main)' }}>{breakdown.totalQty}</td>
                        <td style={{ padding: '12px' }}></td>
                        <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', color: 'var(--text-main)' }}>₹{breakdown.totalTaxableValue.toFixed(2)}</td>
                        <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', color: 'var(--text-main)' }}>₹{breakdown.totalSgst.toFixed(2)}</td>
                        <td style={{ padding: '12px', fontSize: '12px', textAlign: 'right', color: 'var(--text-main)' }}>₹{breakdown.totalCgst.toFixed(2)}</td>
                        <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right', color: '#10b981' }}>₹{breakdown.grandTotal.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Amount in words banner */}
              <div style={{ padding: '12px 16px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)', fontSize: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: 'var(--primary)' }}>Amount in Words:</strong> Rupees {breakdown.inWords}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => toggleOrderPrintStatus(order._id, order.isPrinted)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                >
                  {order.isPrinted ? 'Mark as Unprinted' : 'Mark as Printed'}
                </button>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderDetails(null);
                      handleDirectBulkPrint([order]);
                    }}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12.5px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={15} /> Quick Print PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderDetails(null);
                      handlePreview([order]);
                    }}
                    className="btn-primary"
                    style={{ padding: '8px 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Printer size={15} /> Open Print Preview & Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOrderDetails(null)}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '12.5px' }}
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {sellerInvoicePreviewUrl && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', zIndex: 10000 }}>
          <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)' }}>
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px' }}>Seller Invoice Preview</h2>
            <button onClick={() => setSellerInvoicePreviewUrl('')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }} aria-label="Close invoice preview">
              <X size={24} />
            </button>
          </div>
          <iframe
            src={sellerInvoicePreviewUrl}
            title="Seller invoice preview"
            style={{ flex: 1, width: '100%', border: 0, background: '#fff' }}
          />
        </div>
      )}

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
                  <label className="text-xs font-bold uppercase" style={{ color: 'var(--text-dim)' }}>Copy Type:</label>
                  <select 
                    className="input-field" 
                    style={{ padding: '6px 12px', minHeight: 'auto', fontSize: '13px', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                    value={printCopyType}
                    onChange={e => setPrintCopyType(e.target.value)}
                  >
                    <option value="ORIGINAL FOR RECIPIENT">Original for Recipient</option>
                    <option value="DUPLICATE FOR TRANSPORTER">Duplicate for Transporter</option>
                    <option value="TRIPLICATE FOR SUPPLIER">Triplicate for Supplier</option>
                  </select>
                </div>
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
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="text-xs font-bold" style={{ color: 'var(--primary)' }}>Invoice Number</div>
                      <input 
                        type="text" 
                        className="input-field w-full"
                        style={{ padding: '6px', fontSize: '13px', minHeight: 'auto' }}
                        value={getInvoiceNumber(order)}
                        onChange={e => handleInvoiceNumberChange(order._id, e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="text-xs font-bold" style={{ color: 'var(--primary)' }}>Order Serial Number</div>
                      <input 
                        type="text" 
                        className="input-field w-full"
                        style={{ padding: '6px', fontSize: '13px', minHeight: 'auto' }}
                        value={getOrderRef(order)}
                        onChange={e => handleOrderNumberChange(order._id, e.target.value)}
                      />
                    </div>
                    <div className="text-xs font-bold mb-3" style={{ color: 'var(--primary)' }}>Order Items</div>
                    <div className="flex flex-col gap-3">
                      {order.items.map((item, index) => {
                        const rawPrice = item.price || 0;
                        const currentPrice = calculateItemPrice(order._id, index, rawPrice);
                        const rawName = item.name || '';
                        const currentName = calculateItemName(order._id, index, rawName);
                        const rawQty = item.quantity || 1;
                        const currentQty = calculateItemQuantity(order._id, index, rawQty);

                        return (
                          <div key={index} className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-color)', border: '1px solid var(--glass-border)' }}>
                            <input 
                              type="text" 
                              className="input-field w-full text-xs"
                              style={{ padding: '6px 8px', minHeight: 'auto', background: 'var(--card-bg)' }}
                              value={currentName}
                              onChange={e => handleItemNameChange(order._id, index, e.target.value)}
                              placeholder="Item Name"
                            />
                            <div className="flex items-center gap-2">
                              <div className="text-xs line-through w-12" style={{ color: 'var(--text-dim)' }}>₹{rawPrice.toFixed(2)}</div>
                              <input 
                                type="number" 
                                className="input-field flex-1"
                                style={{ padding: '6px 8px', fontSize: '12px', minHeight: 'auto', background: 'var(--card-bg)' }}
                                value={currentPrice}
                                onChange={e => handlePriceChange(order._id, index, e.target.value)}
                                placeholder="Price"
                              />
                              <input 
                                type="number" 
                                className="input-field w-16"
                                style={{ padding: '6px 8px', fontSize: '12px', minHeight: 'auto', background: 'var(--card-bg)' }}
                                value={currentQty}
                                onChange={e => handleItemQuantityChange(order._id, index, e.target.value)}
                                placeholder="Qty"
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

      {/* Seller Invoice Details & Uploaded Images Modal */}
      {showSellerInvoiceModal && selectedSellerInvoice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--card-bg, #18181b)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '820px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6366f1', fontWeight: 800, letterSpacing: '0.5px' }}>
                  SELLER GENERATED INVOICE
                </span>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                  Invoice #{selectedSellerInvoice.invoiceNumber || selectedSellerInvoice._id?.slice(-6)?.toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowSellerInvoiceModal(false);
                  setSelectedSellerInvoice(null);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px',
                  color: 'var(--text-dim)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Seller Details</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {selectedSellerInvoice.sellerName || selectedSellerInvoice.sellerId?.businessName || selectedSellerInvoice.sellerId?.storeName || selectedSellerInvoice.sellerId?.name || 'Seller'}
                </div>
                {selectedSellerInvoice.sellerId?.phone && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Phone: {selectedSellerInvoice.sellerId.phone}
                  </div>
                )}
                {selectedSellerInvoice.sellerId?.email && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                    Email: {selectedSellerInvoice.sellerId.email}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Customer / Buyer</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {(selectedSellerInvoice.orderId?.userId?.businessName ||
                    selectedSellerInvoice.orderId?.userId?.companyName ||
                    selectedSellerInvoice.orderId?.shippingAddress?.name ||
                    selectedSellerInvoice.orderId?.userId?.name ||
                    (selectedSellerInvoice.orders && selectedSellerInvoice.orders[0]?.userId?.businessName) ||
                    (selectedSellerInvoice.orders && selectedSellerInvoice.orders[0]?.userId?.name) ||
                    'Customer')}
                </div>
                {(selectedSellerInvoice.orderId?.userId?.email || (selectedSellerInvoice.orders && selectedSellerInvoice.orders[0]?.userId?.email)) && (
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Email: {selectedSellerInvoice.orderId?.userId?.email || selectedSellerInvoice.orders[0]?.userId?.email}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Date Range & Order</span>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {new Date(selectedSellerInvoice.startDate).toLocaleDateString()} - {new Date(selectedSellerInvoice.endDate).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '2px', fontWeight: 600 }}>
                  Order #{String(selectedSellerInvoice.orderNumber || selectedSellerInvoice.orderId?.orderNumber || selectedSellerInvoice.orders?.[0]?.orderNumber || selectedSellerInvoice.orderId?.orderId || selectedSellerInvoice.invoiceNumber || '—').padStart(5, '0')}
                </div>
              </div>

              <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Total Amount & Status</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                  ₹{Number(selectedSellerInvoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span style={{ 
                  display: 'inline-block',
                  marginTop: '6px',
                  padding: '3px 10px', 
                  borderRadius: '12px', 
                  fontSize: '11px', 
                  fontWeight: 800,
                  background: selectedSellerInvoice.status === 'Cleared' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: selectedSellerInvoice.status === 'Cleared' ? '#22c55e' : '#eab308'
                }}>
                  {selectedSellerInvoice.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Uploaded Documents & Images Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Uploaded Invoice Images ({selectedSellerInvoice.detailedImages?.length || selectedSellerInvoice.images?.length || (selectedSellerInvoice.hasInvoiceImage ? 1 : 0)})
                </span>
                <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
                  Stored in MongoDB
                </span>
              </div>

              {((selectedSellerInvoice.detailedImages && selectedSellerInvoice.detailedImages.length > 0) || 
                (selectedSellerInvoice.images && selectedSellerInvoice.images.length > 0)) ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '16px'
                }}>
                  {(selectedSellerInvoice.detailedImages || selectedSellerInvoice.images).map((imgDoc, idx) => {
                    const imgBlobUrl = sellerImageBlobs[selectedSellerInvoice._id]?.[imgDoc._id];
                    const isLoading = sellerImageLoading[`${selectedSellerInvoice._id}_${imgDoc._id}`];

                    return (
                      <div 
                        key={imgDoc._id || idx}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          background: '#09090b',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        <div 
                          onClick={() => imgBlobUrl && setImageModalUrl(imgBlobUrl)}
                          style={{
                            height: '180px',
                            background: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: imgBlobUrl ? 'pointer' : 'default',
                            position: 'relative'
                          }}
                        >
                          {imgBlobUrl ? (
                            <>
                              <img 
                                src={imgBlobUrl} 
                                alt={imgDoc.originalName || `Document ${idx + 1}`} 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              />
                              <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0}
                              >
                                <Eye size={20} color="#fff" />
                              </div>
                            </>
                          ) : isLoading ? (
                            <Receipt size={24} className="animate-spin" style={{ color: '#6366f1' }} />
                          ) : (
                            <FileText size={28} style={{ color: 'var(--text-dim)' }} />
                          )}
                        </div>

                        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ overflow: 'hidden', paddingRight: '8px' }}>
                            <p style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }} title={imgDoc.originalName || imgDoc.filename}>
                              Doc #{idx + 1}: {imgDoc.originalName || imgDoc.filename || 'Invoice Image'}
                            </p>
                            {imgDoc.size > 0 && (
                              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                                {(imgDoc.size / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>

                          {imgBlobUrl && (
                            <button
                              type="button"
                              onClick={() => setImageModalUrl(imgBlobUrl)}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px', height: 'auto' }}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : selectedSellerInvoice.hasInvoiceImage ? (
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <FileText size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600, margin: '0 0 6px 0' }}>
                    1 Invoice Image Attached
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>
                    Image is embedded directly in the invoice PDF download.
                  </p>
                </div>
              ) : (
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
                  <FileText size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 8px', display: 'block' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                    No invoice images were uploaded for this seller record.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <button 
                onClick={() => {
                  setShowSellerInvoiceModal(false);
                  setSelectedSellerInvoice(null);
                }}
                className="btn-secondary"
                style={{ padding: '10px 20px' }}
              >
                Close
              </button>
              <button 
                onClick={() => handlePreviewSellerInvoice(selectedSellerInvoice._id)}
                className="btn-primary"
                style={{ padding: '10px 20px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', border: 'none' }}
                disabled={previewingSellerInvoiceId === selectedSellerInvoice._id}
              >
                <Eye size={16} />
                <span style={{ marginLeft: '6px' }}>
                  {previewingSellerInvoiceId === selectedSellerInvoice._id ? 'Generating Preview...' : 'Preview PDF'}
                </span>
              </button>
              <button 
                onClick={() => handleDownloadInvoice(selectedSellerInvoice._id)}
                className="btn-primary"
                style={{ padding: '10px 20px' }}
              >
                <Download size={16} />
                <span style={{ marginLeft: '6px' }}>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for Full-Size Image Preview */}
      {imageModalUrl && (
        <div 
          onClick={() => setImageModalUrl('')}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 11000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh' }}>
            <img 
              src={imageModalUrl} 
              alt="Seller Invoice Upload" 
              style={{ maxWidth: '100%', maxHeight: '92vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
