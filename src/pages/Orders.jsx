import React, { useState, useEffect } from 'react';
import axios, { getImageUrl } from '../utils/api';
import { 
  Package, Truck, CheckCircle, XCircle, Clock, MapPin, MapPinOff, RefreshCw,
  Phone, User, Send, Loader2, Search, Filter, DollarSign, 
  Download, RefreshCcw, ShieldCheck, AlertTriangle, Printer,
  Edit, Plus, Trash2, X
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverModalType, setDriverModalType] = useState('delivery');
  const [showCashModal, setShowCashModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const user = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');
  const [activeType, setActiveType] = useState(user.targetSegment && user.targetSegment !== 'Both' ? user.targetSegment : 'All');
  const [cashStats, setCashStats] = useState({ b2b: 0, b2c: 0 });
  const [cashCollectors, setCashCollectors] = useState([]);
  const [daysFilter, setDaysFilter] = useState('All');

  // Manual Order Creation & Editing States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditItemsModal, setShowEditItemsModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);

  // Create Order Form States
  const [coSegment, setCoSegment] = useState(''); // 'b2b' or 'b2c'
  const [categories, setCategories] = useState([]);
  const [coCategoryId, setCoCategoryId] = useState('');
  const [coSubCategoryId, setCoSubCategoryId] = useState('');
  const [coUserId, setCoUserId] = useState('');
  const [coAddress, setCoAddress] = useState({ name: '', phone: '', address: '', city: '', pincode: '', state: '' });
  const [coItems, setCoItems] = useState([]);
  const [coSelectedProductId, setCoSelectedProductId] = useState('');
  const [coSelectedQty, setCoSelectedQty] = useState(1);
  const [coPaymentMethod, setCoPaymentMethod] = useState('COD');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [coProductFocused, setCoProductFocused] = useState(false);
  const [coUserFocused, setCoUserFocused] = useState(false);
  const [coErrors, setCoErrors] = useState({});

  // Edit Order Items Form States
  const [eoItems, setEoItems] = useState([]);
  const [eoSelectedProductId, setEoSelectedProductId] = useState('');
  const [eoSelectedQty, setEoSelectedQty] = useState(1);
  const [eoProductSearchTerm, setEoProductSearchTerm] = useState('');
  const [eoCategoryId, setEoCategoryId] = useState('');
  const [eoSubCategoryId, setEoSubCategoryId] = useState('');
  const [eoProductFocused, setEoProductFocused] = useState(false);

  // Driver Live Tracking States
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingDriver, setTrackingDriver] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const statuses = ['All', 'Pending', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returns'];

  const fetchDriverLocation = async (driverId) => {
    setLoadingLocation(true);
    setLocationError(null);
    try {
      const { data } = await axios.get(`/drivers/${driverId}/location`);
      setDriverLocation(data);
    } catch (err) {
      console.error('Failed to fetch driver live location', err);
      setLocationError(err.response?.data?.message || 'Driver live location is not available right now.');
      setDriverLocation(null);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleTrackDriver = (driver) => {
    setTrackingDriver(driver);
    setShowTrackingModal(true);
    fetchDriverLocation(driver._id);
  };

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchCashStats();
    fetchCashCollectors();
    fetchUsers();
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (editingOrder) {
      setEoItems(editingOrder.items.map(item => ({
        productId: item.productId?._id || item.productId || item.product,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })));
    } else {
      setEoItems([]);
    }
    setEoCategoryId('');
    setEoSubCategoryId('');
    setEoSelectedProductId('');
    setEoProductSearchTerm('');
    setEoProductFocused(false);
  }, [editingOrder]);

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await axios.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get('/products');
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get('/orders/admin/all');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data } = await axios.get('/drivers');
      setDrivers(data.filter(d => d.status === 'active'));
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchCashStats = async () => {
    try {
      const { data } = await axios.get('/cash');
      const b2bTotal = data.filter(t => t.type === 'B2B').reduce((sum, t) => sum + (t.amount || 0), 0);
      const b2cTotal = data.filter(t => t.type === 'B2C' || t.type === 'B2C (Driver)').reduce((sum, t) => sum + (t.amount || 0), 0);
      setCashStats({ b2b: b2bTotal, b2c: b2cTotal });
    } catch (err) {
      console.error('Failed to fetch cash stats', err);
    }
  };

  const fetchCashCollectors = async () => {
    try {
      const collectors = [];
      const seen = new Set();

      // Fetch Transaction History (Manual Collectors)
      try {
        const { data } = await axios.get('/cash');
        if (Array.isArray(data)) {
          data.forEach(t => {
            if (!t.name) return;
            const key = `trans-${t.name}-${t.phone || ''}`;
            if (!seen.has(key)) {
              seen.add(key);
              collectors.push({
                _id: t._id,
                name: t.name,
                phone: t.phone,
                email: t.email || t.phone,
                type: t.type,
                isTransactionRef: true
              });
            }
          });
        }
      } catch (err) {
        console.warn('Could not fetch manual collectors:', err);
      }

      setCashCollectors(collectors);
    } catch (error) {
      console.error('Final error in fetchCashCollectors:', error);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    if (!window.confirm(`Are you sure you want to change order status to ${status}?`)) return;
    try {
      await axios.put(`/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const handleReturnAction = async (orderId, action) => {
    try {
      const endpoint = action === 'approve' ? 'return-approve' : 'return-reject';
      await axios.put(`/orders/${orderId}/${endpoint}`);
      fetchOrders();
    } catch (error) {
      alert(`Failed to ${action} return`);
    }
  };

  const handleItemReturnAction = async (orderId, itemId, status) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/items/${itemId}/return-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders();
      } else {
        alert('Failed to update return status');
      }
    } catch (e) {
      alert('Error updating return status');
    }
  };

  const handleAssignReturnDriver = async (orderId) => {
    const driverId = prompt('Enter Driver ID for return pickup:');
    if (!driverId) return;
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/assign-return-driver`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ driverId })
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert('Failed: ' + data.message);
      }
    } catch (e) {
      alert('Error assigning return driver');
    }
  };


  const handleOtpVerify = async (orderId) => {
    if (otp === '1234') { // Dummy OTP for demo
      try {
        await axios.put(`/orders/${orderId}/verify-payment`);
        alert('Payment Verified & Collected!');
        setShowOtpModal(false);
        setOtp('');
        fetchOrders();
      } catch (err) {
        alert('Verification failed on server');
      }
    } else {
      alert('Invalid OTP');
    }
  };

  const exportOrders = () => {
    const exportData = filteredOrders.map(o => ({
      ID: o._id,
      Customer: o.userId?.name || 'Guest',
      Type: o.userId?.role || 'B2C',
      Amount: o.totalAmount,
      Status: o.orderStatus,
      Payment: o.paymentMethod,
      Date: new Date(o.createdAt).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "Zudo_Orders_Report.xlsx");
  };

  const printManifest = (order) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    const itemsHtml = order.items.map((item, index) => `
      <tr>
        <td style="text-align: center; border: 1px solid #e2e8f0; padding: 4px;">${index + 1}</td>
        <td style="border: 1px solid #e2e8f0; padding: 4px;">
          <div style="font-weight: 600;">${item.name}</div>
        </td>
        <td style="text-align: center; border: 1px solid #e2e8f0; padding: 4px;">${item.quantity}</td>
        <td style="text-align: right; border: 1px solid #e2e8f0; padding: 4px;">₹${Number(item.price || 0).toFixed(2)}</td>
        <td style="text-align: right; border: 1px solid #e2e8f0; padding: 4px;">₹${Number((item.price || 0) * (item.quantity || 0)).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manifest #${order._id.slice(-8).toUpperCase()}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
          @page {
            size: A5 portrait;
            margin: 6mm;
          }
          body {
            font-family: 'Outfit', 'Inter', sans-serif;
            color: #1e293b;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.3;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .manifest-container {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          .brand-title {
            font-size: 20px;
            font-weight: 800;
            color: #6366f1;
            letter-spacing: -0.5px;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 8px;
            color: #64748b;
            margin: 0;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .manifest-badge {
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .divider {
            height: 1px;
            background: #e2e8f0;
            margin: 6px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 6px;
          }
          .info-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 8px;
            background: #f8fafc;
          }
          .info-title {
            font-size: 8px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .info-value {
            font-size: 10px;
            font-weight: 600;
            color: #0f172a;
          }
          .info-subvalue {
            font-size: 9px;
            color: #475569;
            margin-top: 1px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
          }
          .items-table th {
            background: #f1f5f9;
            color: #475569;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 4px 6px;
            border: 1px solid #e2e8f0;
            text-align: left;
          }
          .text-right {
            text-align: right !important;
          }
          .text-center {
            text-align: center !important;
          }
          .total-row {
            font-weight: 700;
            background: #f8fafc;
          }
          .total-row td {
            border-top: 1.5px solid #cbd5e1;
            font-size: 11px;
            color: #0f172a;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 12px;
          }
          .signature-box {
            border-top: 1px dashed #cbd5e1;
            text-align: center;
            padding-top: 4px;
            font-size: 8px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="manifest-container">
          <table class="header-table">
            <tr>
              <td>
                <h1 class="brand-title">ZUDO</h1>
                <p class="brand-subtitle">Hyperlocal B2B & B2C Logistics</p>
              </td>
              <td class="text-right" style="vertical-align: top;">
                <div class="manifest-badge" style="display: inline-block;">DELIVERY MANIFEST</div>
              </td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="info-grid">
            <div class="info-box">
              <div class="info-title">Manifest Metadata</div>
              <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; width: 45%;">Order Ref:</td>
                  <td class="info-value">#${order._id.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Date & Time:</td>
                  <td class="info-value">${new Date(order.createdAt).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Fulfillment:</td>
                  <td class="info-value"><span style="color: ${(order.userId?.role || 'b2c') === 'b2b' ? '#6366f1' : '#ec4899'}; font-weight: 700;">${(order.userId?.role || 'b2c').toUpperCase()} Segment</span></td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Payment Mode:</td>
                  <td class="info-value">${order.paymentMethod} (${order.paymentStatus === 'Completed' ? 'PAID' : 'COD/PENDING'})</td>
                </tr>
              </table>
            </div>
            
            <div class="info-box">
              <div class="info-title">Delivery Consignee</div>
              <div class="info-value">${order.shippingAddress.name}</div>
              <div class="info-subvalue">📞 ${order.shippingAddress.phone}</div>
              <div class="info-subvalue" style="margin-top: 3px; font-size: 8px; line-height: 1.2;">📍 ${order.shippingAddress.address}, ${order.shippingAddress.city}</div>
            </div>
          </div>

          <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="info-box" style="padding: 4px 8px;">
              <div class="info-title">Assigned Courier</div>
              <div style="font-size: 9px; font-weight: 600;">${order.driverId?.name || 'Unassigned Logistics Agent'}</div>
              ${order.driverId?.phone ? '<div style="font-size: 8px; color: #64748b;">📞 ' + order.driverId.phone + '</div>' : ''}
            </div>
            <div class="info-box" style="padding: 4px 8px;">
              <div class="info-title">Assigned Cash Collector</div>
              <div style="font-size: 9px; font-weight: 600;">${order.cashPersonId?.name || 'Unassigned Cash Agent'}</div>
              ${order.cashPersonId?.phone ? '<div style="font-size: 8px; color: #64748b;">📞 ' + order.cashPersonId.phone + '</div>' : ''}
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">#</th>
                <th style="width: 55%;">Product Specification</th>
                <th style="width: 10%; text-align: center;">Qty</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 15%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="border: none; background: transparent;"></td>
                <td style="text-align: right; border: 1px solid #e2e8f0; padding: 4px;">Grand Total:</td>
                <td style="text-align: right; border: 1px solid #e2e8f0; padding: 4px; font-weight: 800; color: #6366f1;">₹${Number(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="signatures">
            <div class="signature-box" style="margin-top: 10px;">Security Verification</div>
            <div class="signature-box" style="margin-top: 10px;">Logistics Handover</div>
            <div class="signature-box" style="margin-top: 10px;">Consignee Stamp/Sign</div>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const printTodayManifest = () => {
    const today = new Date();
    
    // Filter orders created today (local calendar date)
    let todayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.toDateString() === today.toDateString();
    });

    // Fallback: If no orders are found for today's date, fetch orders created in the last 24 hours
    if (todayOrders.length === 0) {
      todayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const diffDays = (today - orderDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 1;
      });
    }

    if (todayOrders.length === 0) {
      alert("No orders found for today to generate manifest.");
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();

    // Map each order to its own separate A5 sheet
    const pagesHtml = todayOrders.map((order, index) => {
      const pageBreakClass = index > 0 ? 'page-break' : '';
      
      const itemsHtml = order.items.map(item => `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 4px 6px; font-size: 9.5px; font-weight: 600; color: #0f172a;">${item.name}</td>
          <td style="border: 1px solid #e2e8f0; padding: 4px 6px; font-size: 9.5px; font-weight: 700; text-align: center; color: #0f172a;">${item.quantity}</td>
        </tr>
      `).join('');

      return `
        <div class="manifest-container ${pageBreakClass}" style="padding-top: 10px;">
          <table class="header-table">
            <tr>
              <td>
                <h1 class="brand-title">ZUDO</h1>
                <p class="brand-subtitle">Hyperlocal B2B & B2C Logistics</p>
              </td>
              <td class="text-right" style="vertical-align: top;">
                <div class="manifest-badge" style="display: inline-block;">DELIVERY MANIFEST</div>
                <div style="font-size: 8px; color: #64748b; margin-top: 2px;">Order ${index + 1} of ${todayOrders.length}</div>
              </td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="info-grid">
            <div class="info-box">
              <div class="info-title">Manifest Metadata</div>
              <table style="width: 100%; font-size: 9px; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; width: 45%;">Order Ref:</td>
                  <td class="info-value">#${order._id.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Date & Time:</td>
                  <td class="info-value">${new Date(order.createdAt).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Fulfillment:</td>
                  <td class="info-value"><span style="color: ${(order.userId?.role || 'b2c') === 'b2b' ? '#6366f1' : '#ec4899'}; font-weight: 700;">${(order.userId?.role || 'b2c').toUpperCase()} Segment</span></td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Payment Mode:</td>
                  <td class="info-value">${order.paymentMethod} (${order.paymentStatus === 'Completed' ? 'PAID' : 'COD/PENDING'})</td>
                </tr>
              </table>
            </div>
            
            <div class="info-box">
              <div class="info-title">Delivery Consignee</div>
              <div class="info-value">${order.shippingAddress.name}</div>
              <div class="info-subvalue">📞 ${order.shippingAddress.phone}</div>
              <div class="info-subvalue" style="margin-top: 3px; font-size: 8px; line-height: 1.2;">📍 ${order.shippingAddress.address}, ${order.shippingAddress.city}</div>
            </div>
          </div>

          <div class="info-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 10px;">
            <div class="info-box" style="padding: 6px 8px;">
              <div class="info-title">Assigned Courier</div>
              <div style="font-size: 9px; font-weight: 600;">${order.driverId?.name || 'Unassigned Logistics Agent'}</div>
              ${order.driverId?.phone ? '<div style="font-size: 8px; color: #64748b;">📞 ' + order.driverId.phone + '</div>' : ''}
            </div>
            <div class="info-box" style="padding: 6px 8px;">
              <div class="info-title">Assigned Cash Collector</div>
              <div style="font-size: 9px; font-weight: 600;">${order.cashPersonId?.name || 'Unassigned Cash Agent'}</div>
              ${order.cashPersonId?.phone ? '<div style="font-size: 8px; color: #64748b;">📞 ' + order.cashPersonId.phone + '</div>' : ''}
            </div>
          </div>

          <!-- Items Table (Product Name and Qty Only) -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 80%;">Product Specification</th>
                <th style="width: 20%; text-align: center;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="info-box" style="padding: 8px 12px; background: rgba(99, 102, 241, 0.03); border: 1.5px solid rgba(99, 102, 241, 0.15); display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">Total Shipment Amount:</span>
            <span style="font-size: 15px; font-weight: 800; color: #6366f1;">₹${Number(order.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          
          <div class="signatures" style="margin-top: 24px;">
            <div class="signature-box">Security Verification</div>
            <div class="signature-box">Logistics Handover</div>
            <div class="signature-box">Consignee Stamp/Sign</div>
          </div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Dispatch Manifest - ${today.toLocaleDateString()}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
          @page {
            size: A5 portrait;
            margin: 6mm;
          }
          body {
            font-family: 'Outfit', 'Inter', sans-serif;
            color: #1e293b;
            background: #fff;
            margin: 0;
            padding: 0;
            font-size: 10px;
            line-height: 1.3;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break {
            page-break-before: always;
          }
          .manifest-container {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          .brand-title {
            font-size: 22px;
            font-weight: 800;
            color: #6366f1;
            letter-spacing: -0.5px;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 8px;
            color: #64748b;
            margin: 0;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .manifest-badge {
            background: #0f172a;
            color: #ffffff;
            font-size: 9px;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .divider {
            height: 1px;
            background: #e2e8f0;
            margin: 6px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 6px;
          }
          .info-box {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 8px;
            background: #f8fafc;
          }
          .info-title {
            font-size: 8px;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .info-value {
            font-size: 10px;
            font-weight: 600;
            color: #0f172a;
          }
          .info-subvalue {
            font-size: 9px;
            color: #475569;
            margin-top: 1px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 10px;
          }
          .items-table th {
            background: #f1f5f9;
            color: #475569;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 4px 6px;
            border: 1px solid #e2e8f0;
            text-align: left;
          }
          .items-table td {
            border: 1px solid #e2e8f0;
            padding: 4px 6px;
            font-size: 9px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-top: 24px;
          }
          .signature-box {
            border-top: 1px dashed #cbd5e1;
            text-align: center;
            padding-top: 4px;
            font-size: 8px;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `;

    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };

  const getStatusBadge = (status, returnStatus) => {
    if (returnStatus && returnStatus !== 'None') {
      const returnStyles = {
        'Requested': { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', text: 'Return Requested' },
        'Approved': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', text: 'Return Approved' },
        'Rejected': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', text: 'Return Rejected' },
        'Completed': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', text: 'Return Completed' }
      };
      const style = returnStyles[returnStatus];
      return (
        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: style.bg, color: style.color }}>
          {style.text}
        </span>
      );
    }

    const styles = {
      'Pending': { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308' },
      'Packed': { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
      'Shipped': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
      'Out for Delivery': { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' },
      'Delivered': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
      'Cancelled': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
    };
    const style = styles[status] || { bg: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-dim)' };
    return (
      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: style.bg, color: style.color, textTransform: 'uppercase' }}>
        {status}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    const statusMatch = activeTab === 'All' 
      ? true 
      : activeTab === 'Returns' 
        ? (order.returnStatus && order.returnStatus !== 'None') || (order.items && order.items.some(i => i.returnStatus && i.returnStatus !== 'None'))
        : order.orderStatus === activeTab;
    
    const typeMatch = activeType === 'All' || (order.userId?.role || 'b2c').toUpperCase() === activeType;

    let daysMatch = true;
    if (daysFilter !== 'All') {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
      daysMatch = diffDays <= Number(daysFilter);
    }

    return statusMatch && typeMatch && daysMatch;
  });

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
      <div style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Fetching Live Orders...</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header & Main Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Order Command Center</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>Unified B2B & B2C fulfillment management</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportOrders} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} /> Export
          </button>
          <button onClick={fetchOrders} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCcw size={18} /> Refresh
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', color: 'var(--text-main)' }}
          >
            <Plus size={18} /> Create Order
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: '12px', background: 'var(--glass-bg)', padding: '6px', borderRadius: '16px', border: '1px solid var(--glass-border)', overflowX: 'auto' }}>
        {statuses.map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            style={{
              padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer',
              background: activeTab === status ? 'var(--primary)' : 'transparent',
              color: activeTab === status ? 'white' : 'var(--text-dim)',
              whiteSpace: 'nowrap', transition: '0.2s'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Secondary Filters: Type & Split Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(!user.targetSegment || user.targetSegment === 'Both') && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {['All', 'B2C', 'B2B'].map(type => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  style={{
                    padding: '8px 20px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    background: activeType === type ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)',
                    color: activeType === type ? 'var(--primary)' : 'var(--text-dim)',
                    border: `1px solid ${activeType === type ? 'var(--primary)' : 'var(--glass-border)'}`
                  }}
                >
                  {type === 'All' ? 'Combined View' : `${type} Segment`}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timeframe:</span>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              style={{
                padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                background: 'var(--glass-bg)', color: 'var(--text-main)',
                border: '1px solid var(--glass-border)', outline: 'none'
              }}
            >
              <option value="All" style={{ background: 'var(--card-bg)' }}>All Time</option>
              <option value="1" style={{ background: 'var(--card-bg)' }}>Last 1 Day</option>
              <option value="7" style={{ background: 'var(--card-bg)' }}>Last 7 Days</option>
              <option value="30" style={{ background: 'var(--card-bg)' }}>Last 30 Days</option>
            </select>
            <button
              onClick={printTodayManifest}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'var(--glass-bg)',
                color: 'var(--text-main)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.background = 'var(--glass-bg)';
              }}
            >
              <Printer size={14} style={{ color: 'var(--primary)' }} />
              Manifest
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>B2B Volume</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: '#10b981' }}>₹{cashStats.b2b.toLocaleString()}</p>
          </div>
          <div style={{ width: '1px', background: 'var(--glass-border)' }}></div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>B2C Volume</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: '#ec4899' }}>₹{cashStats.b2c.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredOrders.length === 0 ? (
          <div className="glass-card" style={{ padding: '80px', textAlign: 'center', borderRadius: '32px' }}>
            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dim)' }}>No orders match the selected criteria</h3>
          </div>
        ) : filteredOrders.map(order => (
          <div key={order._id} className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
            {/* Order Header */}
            <div style={{ padding: '20px 24px', background: 'var(--card-bg)', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Order Ref</span>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>#{order._id.slice(-8).toUpperCase()}</span>
                </div>
                <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }}></div>
                <div>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Category</span>
                  <span style={{ 
                    fontSize: '10px', fontWeight: 800, color: (order.userId?.role || 'b2c') === 'b2b' ? 'var(--primary)' : '#ec4899',
                    background: (order.userId?.role || 'b2c') === 'b2b' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                    padding: '2px 8px', borderRadius: '6px'
                  }}>{(order.userId?.role || 'b2c').toUpperCase()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Grand Total</span>
                  <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--primary)' }}>₹{order.totalAmount.toLocaleString()}</span>
                </div>
                {getStatusBadge(order.orderStatus, order.returnStatus)}
              </div>
            </div>

            {/* Order Content */}
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              {/* Customer Intel */}
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={12} /> Customer Intel
                </p>
                <div style={{ padding: '16px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                  <p style={{ fontWeight: 700, marginBottom: '4px' }}>{order.userId?.name || 'Guest'}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {order.shippingAddress.phone}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '12px', lineHeight: '1.4' }}>{order.shippingAddress.address}, {order.shippingAddress.city}</p>
                </div>
              </div>

              {/* Items Manifest */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Package size={12} /> Manifest
                    <button
                      onClick={() => {
                        setEditingOrder(order);
                        setShowEditItemsModal(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        transition: '0.2s',
                        marginLeft: '4px'
                      }}
                      title="Edit Products in Order"
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Edit size={12} />
                    </button>
                  </p>
                  <button
                    onClick={() => printManifest(order)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      color: '#6366f1',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    }}
                  >
                    <Download size={12} /> Download A5
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {order.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'var(--card-bg)', borderRadius: '12px' }}>
                      <img src={item.image} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} alt="" />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600 }}>{item.name}</p>
                        <p style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{item.quantity} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logistics & Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={12} /> Fulfillment
                </p>
                
                {(order.returnStatus === 'Requested') || (order.items && order.items.some(i => i.returnStatus === 'Return Requested')) ? (
                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed #f59e0b', padding: '16px', borderRadius: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>Return Requested</p>
                    
                    {(() => {
                      const returnedItemWithBank = order.items?.find(i => i.refundAccountNumber);
                      if (returnedItemWithBank) {
                        return (
                          <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Bank Details for Refund:</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Name: {returnedItemWithBank.refundAccountName}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Bank: {returnedItemWithBank.refundBankName}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>A/C: {returnedItemWithBank.refundAccountNumber}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>IFSC: {returnedItemWithBank.refundIfscCode}</p>
                          </div>
                        );
                      } else if (order.userId?.bankDetails && order.userId.bankDetails.accountNumber) {
                        return (
                          <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255,255,255,0.5)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>Bank Details for Refund (From Profile):</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Name: {order.userId.bankDetails.accountName}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>A/C: {order.userId.bankDetails.accountNumber}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>IFSC: {order.userId.bankDetails.ifscCode}</p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {order.items?.filter(i => i.returnStatus === 'Return Requested').map((item, idx) => (
                      <div key={idx} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <p style={{ fontSize: '11px', fontWeight: 700 }}>{item.name}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Reason: "{item.returnReason || 'No reason provided'}"</p>
                        {item.returnComment && <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Comment: "{item.returnComment}"</p>}
                        
                        {item.refundBankName && (
                          <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700 }}>Refund Bank Details (From App):</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Bank: {item.refundBankName}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>A/C Name: {item.refundAccountName}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>A/C No: {item.refundAccountNumber}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>IFSC: {item.refundIfscCode}</p>
                          </div>
                        )}
                        
                        {item.returnImage && (
                          <a href={getImageUrl(item.returnImage)} target="_blank" rel="noopener noreferrer">
                            <img src={getImageUrl(item.returnImage)} alt="Return proof" style={{ width: '60px', height: '60px', borderRadius: '8px', marginTop: '4px', objectFit: 'cover' }} />
                          </a>
                        )}
                      </div>
                    ))}
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleReturnAction(order._id, 'approve')} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '11px', background: '#10b981' }}>Approve</button>
                      <button onClick={() => handleReturnAction(order._id, 'reject')} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '11px', background: '#ef4444' }}>Reject</button>
                    </div>
                  </div>
                ) : (order.returnStatus === 'Approved') || (order.items && order.items.some(i => ['Return Approved', 'Picked Up from Customer', 'Returned to Seller'].includes(i.returnStatus))) ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed #10b981', padding: '16px', borderRadius: '16px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', marginBottom: '12px' }}>Return Approved</p>
                    <button 
                      onClick={() => { setSelectedOrderId(order._id); setDriverModalType('return'); setShowDriverModal(true); }} 
                      className="btn-primary" 
                      style={{ width: '100%', padding: '10px', background: order.returnDriverId ? 'rgba(99, 102, 241, 0.1)' : '#10b981', color: order.returnDriverId ? 'var(--primary)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Truck size={14} /> {order.returnDriverId ? `Return Driver: ${order.returnDriverId.name || 'Assigned'}` : 'Assign Return Driver'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Dynamic Status Dropdown */}
                    <div style={{ position: 'relative' }}>
                      <select 
                        value={order.orderStatus}
                        onChange={(e) => handleUpdateStatus(order._id, e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: '12px', background: 'var(--glass-bg)', 
                          border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                        }}
                      >
                        {['Pending', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {order.orderStatus === 'Pending' && (
                      <button onClick={() => handleUpdateStatus(order._id, 'Packed')} className="btn-primary" style={{ width: '100%', padding: '12px' }}>Mark as Packed</button>
                    )}
                    
                    {['Packed', 'Out for Delivery'].includes(order.orderStatus) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                          <button 
                            onClick={() => { setSelectedOrderId(order._id); setDriverModalType('delivery'); setShowDriverModal(true); }} 
                            className="btn-primary" 
                            style={{ flex: 1, padding: '10px', background: order.driverId ? 'rgba(99, 102, 241, 0.1)' : 'var(--primary)', color: order.driverId ? 'var(--primary)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Truck size={14} /> {order.driverId ? `Driver: ${order.driverId.name}` : 'Assign Driver'}
                          </button>
                          
                          {order.driverId && (
                            <button
                              onClick={() => handleTrackDriver(order.driverId)}
                              style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#22c55e',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontWeight: 700,
                                fontSize: '12px',
                                transition: 'all 0.2s'
                              }}
                              title="Track driver live coordinates"
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <MapPin size={14} style={{ filter: 'drop-shadow(0 0 4px #22c55e)' }} />
                              Track Live
                            </button>
                          )}
                        </div>

                        <button 
                          onClick={() => { setSelectedOrderId(order._id); setShowCashModal(true); }} 
                          className="btn-primary" 
                          style={{ width: '100%', padding: '10px', background: order.cashPersonId ? 'rgba(16, 185, 129, 0.1)' : 'var(--primary)', color: order.cashPersonId ? '#10b981' : 'white' }}
                        >
                          <DollarSign size={14} /> {order.cashPersonId ? `Cash: ${order.cashPersonId.name}` : 'Assign Cash Collector'}
                        </button>
                      </div>
                    )}

                    {order.orderStatus === 'Delivered' && order.paymentMethod === 'COD' && order.paymentStatus !== 'Completed' && (
                      <button onClick={() => { setSelectedOrderId(order._id); setShowOtpModal(true); }} className="btn-primary" style={{ width: '100%', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981' }}>
                        <ShieldCheck size={16} /> Collect Payment (OTP)
                      </button>
                    )}
                    {['Pending', 'Packed'].includes(order.orderStatus) && (
                      <button onClick={() => handleUpdateStatus(order._id, 'Cancelled')} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>Cancel Order</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', width: '320px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Verify Collection</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '24px' }}>Enter the 4-digit OTP from the customer to verify cash collection.</p>
            <input 
              type="text" 
              maxLength="4" 
              placeholder="0000" 
              value={otp} 
              onChange={e => setOtp(e.target.value)}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', textAlign: 'center', fontSize: '24px', fontWeight: 800, marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowOtpModal(false)} className="btn-primary" style={{ flex: 1, background: 'var(--glass-bg)', color: 'var(--text-main)' }}>Cancel</button>
              <button onClick={() => handleOtpVerify(selectedOrderId)} className="btn-primary" style={{ flex: 2 }}>Verify & Mark Paid</button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Collector Selection Modal */}
      {showCashModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', borderRadius: '32px' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Cash Collection Team</h3>
              <button onClick={() => setShowCashModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>
            <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cashCollectors.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>No cash collectors found</p>
              ) : cashCollectors.map(collector => (
                <button
                  key={collector._id}
                  onClick={async () => {
                    await axios.put(`/orders/${selectedOrderId}/assign-cash`, { cashPersonId: collector._id });
                    setShowCashModal(false);
                    fetchOrders();
                  }}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '20px', 
                    background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer',
                    transition: '0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                >
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', 
                    background: collector.role ? 'var(--primary)' : '#10b981', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' 
                  }}>
                    {collector.name[0]}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p style={{ fontWeight: 700, fontSize: '15px', margin: 0 }}>{collector.name}</p>
                      <span style={{ 
                        fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                        background: collector.isDriver ? 'rgba(168, 85, 247, 0.1)' : collector.role ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: collector.isDriver ? '#a855f7' : collector.role ? 'var(--primary)' : '#10b981'
                      }}>
                        {collector.isDriver ? 'DRIVER' : collector.role ? collector.role.replace('_', ' ').toUpperCase() : 'B2B COLLECTOR'}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: '2px 0 0' }}>{collector.phone || collector.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Driver Selection Modal */}
      {showDriverModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', borderRadius: '32px' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Dispatch Hub</h3>
              <button onClick={() => setShowDriverModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>
            <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {drivers.map(driver => (
                <button
                  key={driver._id}
                  onClick={async () => {
                    try {
                      if (driverModalType === 'return') {
                        await axios.put(`/orders/${selectedOrderId}/assign-return-driver`, { driverId: driver._id });
                      } else {
                        await axios.put(`/orders/${selectedOrderId}/ship`, { driverId: driver._id });
                      }
                      setShowDriverModal(false);
                      fetchOrders();
                    } catch (error) {
                      alert('Failed to assign driver');
                    }
                  }}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '20px', 
                    background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer' 
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{driver.name[0]}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontWeight: 700, fontSize: '15px' }}>{driver.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{driver.vehicleDetails}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Driver Tracking Modal */}
      {showTrackingModal && trackingDriver && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '450px', borderRadius: '32px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Driver Tracking</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{trackingDriver.name} • {trackingDriver.phone}</span>
              </div>
              <button onClick={() => setShowTrackingModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><XCircle size={24} /></button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Telemetry Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>GPS Telemetry Feed</span>
                </div>
                <button 
                  onClick={() => fetchDriverLocation(trackingDriver._id)}
                  disabled={loadingLocation}
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: '#6366f1',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                  }}
                >
                  <RefreshCw size={12} className={loadingLocation ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {loadingLocation ? (
                <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                  <Loader2 className="animate-spin" style={{ color: '#6366f1' }} size={24} />
                </div>
              ) : locationError ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  background: 'var(--card-bg)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'inset 0 0 12px rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '16px', 
                      background: 'rgba(239, 68, 68, 0.08)', 
                      border: '1.5px dashed rgba(239, 68, 68, 0.3)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#ef4444',
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
                      animation: 'pulse 2s infinite'
                    }}>
                      <MapPinOff size={28} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', letterSpacing: '0.5px' }}>TELEMETRY BEACON OFFLINE</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '280px', lineHeight: 1.5, margin: 0 }}>
                      {locationError.includes('disabled') 
                        ? 'The driver has no active picked-up shipments. Location streams only when a package is out for delivery.' 
                        : locationError}
                    </p>
                  </div>

                  {/* Pipeline Tracker */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#22c55e', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>✓</div>
                      <span style={{ fontSize: '10px', color: 'var(--text-main)', fontWeight: 600 }}>1. Assigned</span>
                    </div>
                    
                    <div style={{ height: '2px', background: 'var(--glass-border)', flex: 1, margin: '0 8px', alignSelf: 'center', marginTop: '-12px' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--input-bg)', border: '1.5px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-dim)' }}>2</div>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>2. Picked Up</span>
                    </div>
                    
                    <div style={{ height: '2px', background: 'var(--glass-border)', flex: 1, margin: '0 8px', alignSelf: 'center', marginTop: '-12px' }} />

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1.5px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#ef4444' }}>📡</div>
                      <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>3. Live GPS</span>
                    </div>
                  </div>
                </div>
              ) : driverLocation && driverLocation.lat != null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Map frame */}
                  <div style={{ 
                    overflow: 'hidden', 
                    borderRadius: '24px', 
                    border: '1.5px solid var(--glass-border)', 
                    background: '#090d16', 
                    position: 'relative', 
                    height: '280px',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.15), 0 0 20px rgba(99, 102, 241, 0.1)'
                  }}>
                    <iframe
                      title="Driver Live Location"
                      width="100%"
                      height="100%"
                      style={{ border: 'none', filter: 'brightness(0.95) contrast(1.05)' }}
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${driverLocation.lng - 0.005}%2C${driverLocation.lat - 0.005}%2C${driverLocation.lng + 0.005}%2C${driverLocation.lat + 0.005}&layer=mapnik&marker=${driverLocation.lat}%2C${driverLocation.lng}`}
                    />
                    
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(9, 13, 22, 0.85)',
                      backdropFilter: 'blur(8px)',
                      padding: '6px 12px',
                      borderRadius: '30px',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '1px'
                    }}>
                      <span className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
                      <span style={{ color: '#22c55e' }}>GPS SIGNAL SYNCED</span>
                    </div>

                    {/* HUD Coordinates info */}
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '12px',
                      right: '12px',
                      background: 'rgba(9, 13, 22, 0.9)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#f8fafc' }}>
                          {driverLocation.lat.toFixed(6)}°N, {driverLocation.lng.toFixed(6)}°E
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '10px', color: '#f8fafc', fontWeight: 700 }}>
                          {new Date(driverLocation.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Statuses and Navigate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Broadcasting • Active Delivery
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${driverLocation.lat},${driverLocation.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'var(--text-main)',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <MapPin size={12} />
                      Google Maps
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  background: 'var(--card-bg)',
                  borderRadius: '24px',
                  padding: '24px',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'inset 0 0 12px rgba(255,255,255,0.02)'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '16px', 
                      background: 'var(--input-bg)', 
                      border: '1.5px dashed var(--glass-border)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--text-dim)',
                      boxShadow: '0 0 20px rgba(255, 255, 255, 0.05)'
                    }}>
                      <MapPinOff size={28} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', letterSpacing: '0.5px' }}>TELEMETRY BEACON OFFLINE</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '280px', lineHeight: 1.5, margin: 0 }}>
                      No GPS coordinates registered for this driver yet.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '750px', borderRadius: '32px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Create Custom Order</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0' }}>Manually add a shipment consignee to the dashboard</p>
              </div>
              <button 
                onClick={() => {
                  setShowCreateModal(false);
                  setCoSegment('');
                  setCoUserId('');
                  setCoAddress({ name: '', phone: '', address: '', city: '', pincode: '', state: '' });
                  setCoItems([]);
                  setCoCategoryId('');
                  setCoSubCategoryId('');
                  setCoErrors({});
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Content */}
            {!coSegment ? (
              <div style={{ padding: '40px 32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '0.5px' }}>SELECT CLIENT SEGMENT</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '8px 0 0' }}>Configure manual order parameters for B2B or B2C trade channels</p>
                </div>
                
                <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '600px', flexWrap: 'wrap' }}>
                  {/* B2B Card */}
                  <button
                    onClick={() => setCoSegment('b2b')}
                    style={{
                      flex: '1 1 240px',
                      padding: '32px 24px',
                      borderRadius: '24px',
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(99, 102, 241, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.25), inset 0 0 12px rgba(99, 102, 241, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                      e.currentTarget.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '20px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2)'
                    }}>
                      🏢
                    </div>
                    <div>
                      <h5 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' }}>B2B Segment</h5>
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>Wholesale merchant channels with tiered bulk pricing and tax invoicing</p>
                    </div>
                  </button>

                  {/* B2C Card */}
                  <button
                    onClick={() => setCoSegment('b2c')}
                    style={{
                      flex: '1 1 240px',
                      padding: '32px 24px',
                      borderRadius: '24px',
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(236, 72, 153, 0.05)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                      textAlign: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-6px)';
                      e.currentTarget.style.borderColor = '#ec4899';
                      e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(236, 72, 153, 0.25), inset 0 0 12px rgba(236, 72, 153, 0.15)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.background = 'rgba(236, 72, 153, 0.05)';
                      e.currentTarget.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '20px',
                      background: 'rgba(236, 72, 153, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      boxShadow: '0 8px 24px rgba(236, 72, 153, 0.2)'
                    }}>
                      🛍️
                    </div>
                    <div>
                      <h5 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' }}>B2C Segment</h5>
                      <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>Direct retail customer channels with standard retail catalog pricing</p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Scrollable Form Content */}
                <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px', flex: 1 }}>
                  {/* Channel Header Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: coSegment === 'b2b' ? 'var(--primary)' : '#ec4899', background: coSegment === 'b2b' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)', padding: '4px 10px', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {coSegment === 'b2b' ? '🏢 B2B Merchant Channel' : '🛍️ B2C Retail Channel'}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setCoSegment('');
                        setCoUserId('');
                        setCoAddress({ name: '', phone: '', address: '', city: '', pincode: '', state: '' });
                        setCoItems([]);
                        setCoCategoryId('');
                        setCoSubCategoryId('');
                      }}
                      style={{ background: 'transparent', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: '8px', color: 'var(--text-main)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                    >
                      ← Change Segment
                    </button>
                  </div>

                  {/* 1. Customer Intel Section */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', margin: '0 0 12px' }}>1. Customer Selection</h4>
                    <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '16px', top: '16px', color: 'var(--text-dim)' }} />
                        <input 
                          type="text" 
                          placeholder={`Search ${coSegment.toUpperCase()} customers by name, phone or email...`}
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          onFocus={() => setCoUserFocused(true)}
                          onBlur={() => setTimeout(() => setCoUserFocused(false), 200)}
                          style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '14px', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px' }}
                        />
                      </div>

                      {(userSearchTerm || coUserFocused) && (
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', maxHeight: '160px', overflowY: 'auto', padding: '6px' }}>
                          {users.filter(u => 
                            (u.role || '').toLowerCase() === coSegment.toLowerCase() && (
                              !userSearchTerm ||
                              u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                              u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                              u.phone?.includes(userSearchTerm)
                            )
                          ).map(u => (
                            <button
                              key={u._id}
                              onClick={() => {
                                setCoUserId(u._id);
                                setUserSearchTerm('');
                                // Auto populate address if available
                                const defaultAddr = (u.savedAddresses && u.savedAddresses.length > 0)
                                  ? (u.savedAddresses.find(addr => addr.isDefault) || u.savedAddresses[0])
                                  : null;

                                setCoAddress({
                                  name: u.name || '',
                                  phone: defaultAddr ? (defaultAddr.phone || u.phone || '') : (u.phone || ''),
                                  address: defaultAddr ? (defaultAddr.address || u.address || '') : (u.address || ''),
                                  city: defaultAddr ? (defaultAddr.city || u.city || '') : (u.city || ''),
                                  pincode: defaultAddr ? (defaultAddr.pincode || u.pincode || '') : (u.pincode || ''),
                                  state: defaultAddr ? (defaultAddr.state || u.state || '') : (u.state || '')
                                });
                              }}
                              style={{ width: '100%', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', borderRadius: '10px', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div>
                                <p style={{ fontWeight: 700, fontSize: '13px', margin: 0 }}>{u.name}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>{u.email} • {u.phone || 'No phone'}</p>
                              </div>
                              <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: u.role === 'b2b' ? 'rgba(99,102,241,0.1)' : 'rgba(236,72,153,0.1)', color: u.role === 'b2b' ? 'var(--primary)' : '#ec4899' }}>
                                {u.role?.toUpperCase()}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {coUserId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '12px 16px', borderRadius: '14px' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Selected Customer ({coSegment.toUpperCase()})</span>
                            <p style={{ fontWeight: 700, margin: '2px 0 0', fontSize: '14px' }}>
                              {users.find(u => u._id === coUserId)?.name}
                            </p>
                          </div>
                          <button 
                            onClick={() => {
                              setCoUserId('');
                              setCoAddress({ name: '', phone: '', address: '', city: '', pincode: '', state: '' });
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Shipping Address details */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', margin: '0 0 12px' }}>2. Dispatch Consignee Details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)' }}>Recipient Name</label>
                        <input 
                          type="text" 
                          id="co-recipient-name"
                          value={coAddress.name} 
                          onChange={(e) => {
                            setCoAddress({ ...coAddress, name: e.target.value });
                            if (coErrors.name) setCoErrors({ ...coErrors, name: false });
                          }}
                          style={{ 
                            padding: '12px', 
                            borderRadius: '12px', 
                            border: coErrors.name ? '1.5px solid #ef4444' : '1px solid var(--glass-border)', 
                            background: 'var(--input-bg)', 
                            color: 'var(--text-main)', 
                            fontSize: '13px',
                            boxShadow: coErrors.name ? '0 0 8px rgba(239, 68, 68, 0.25)' : 'none',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {coUserId && (
                        coAddress.address ? (
                          // Customer has resolved address: show premium read-only summary
                          <div style={{
                            background: 'rgba(99, 102, 241, 0.02)',
                            border: '1.5px dashed var(--glass-border)',
                            borderRadius: '16px',
                            padding: '16px 20px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            boxShadow: 'inset 0 0 12px rgba(255,255,255,0.01)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📍 Auto-Resolved Shipping Address
                              </span>
                              <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                Active
                              </span>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: '12px', color: 'var(--text-main)' }}>
                              <div>
                                <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Address: </span>
                                {coAddress.address}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                  <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>City/State: </span>
                                  {coAddress.city || 'N/A'}{coAddress.state ? `, ${coAddress.state}` : ''}
                                </div>
                                <div>
                                  <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Pincode: </span>
                                  {coAddress.pincode || 'N/A'}
                                </div>
                              </div>
                              {coAddress.phone && (
                                <div>
                                  <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>Phone: </span>
                                  {coAddress.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Customer has no address: show warning and manual phone input option
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{
                              background: 'rgba(239, 68, 68, 0.05)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '14px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              color: '#ef4444',
                              fontSize: '12px'
                            }}>
                              <span style={{ fontSize: '16px' }}>⚠️</span>
                              <div style={{ flex: 1, fontWeight: 500 }}>
                                This customer has no registered saved address.
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)' }}>
                                Phone Number <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(Add manually for consignee)</span>
                              </label>
                              <input 
                                type="text" 
                                value={coAddress.phone} 
                                onChange={(e) => setCoAddress({ ...coAddress, phone: e.target.value })}
                                placeholder="Enter manual contact number..."
                                style={{ 
                                  padding: '12px', 
                                  borderRadius: '12px', 
                                  border: '1px solid var(--glass-border)', 
                                  background: 'var(--input-bg)', 
                                  color: 'var(--text-main)', 
                                  fontSize: '13px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* 3. Product selector */}
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', margin: '0 0 12px' }}>3. Add Products</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      {/* Category & Subcategory Dropdowns */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)' }}>Filter by Category</label>
                          <select 
                            value={coCategoryId}
                            onChange={(e) => {
                              setCoCategoryId(e.target.value);
                              setCoSubCategoryId(''); 
                              setCoSelectedProductId('');
                              setProductSearchTerm('');
                            }}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                          >
                            <option value="">All Categories</option>
                            {categories.map(c => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)' }}>Filter by Subcategory</label>
                          <select 
                            value={coSubCategoryId}
                            onChange={(e) => {
                              setCoSubCategoryId(e.target.value);
                              setCoSelectedProductId('');
                              setProductSearchTerm('');
                            }}
                            disabled={!coCategoryId}
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', opacity: coCategoryId ? 1 : 0.6 }}
                          >
                            <option value="">All Subcategories</option>
                            {categories.find(c => c._id === coCategoryId)?.subCategories?.map(sub => (
                              <option key={sub._id} value={sub._id}>{sub.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Product search and selection */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <input 
                            type="text" 
                            placeholder={coCategoryId ? "Click to view or search products..." : "Search products by specification name..."}
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            onFocus={() => setCoProductFocused(true)}
                            onBlur={() => setTimeout(() => setCoProductFocused(false), 200)}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px' }}
                          />
                          {(productSearchTerm || coProductFocused) && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: '48px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', maxHeight: '160px', overflowY: 'auto', padding: '6px', zIndex: 10 }}>
                              {products.filter(p => {
                                const matchSearch = !productSearchTerm || p.name?.toLowerCase().includes(productSearchTerm.toLowerCase());
                                const matchCategory = !coCategoryId || (p.categoryId?._id || p.categoryId) === coCategoryId;
                                const matchSubCategory = !coSubCategoryId || (p.subCategoryId?._id || p.subCategoryId) === coSubCategoryId;
                                return matchSearch && matchCategory && matchSubCategory;
                              }).map(p => (
                                <button
                                  key={p._id}
                                  onClick={() => {
                                    setCoSelectedProductId(p._id);
                                    setProductSearchTerm(p.name);
                                  }}
                                  style={{ width: '100%', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center', background: 'transparent', border: 'none', borderRadius: '10px', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
                                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                  <img src={p.imageUrl} style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 700, fontSize: '12px', margin: 0 }}>{p.name}</p>
                                    <p style={{ fontSize: '10px', color: 'var(--text-dim)', margin: 0 }}>
                                      ₹{coSegment === 'b2b' ? (p.b2bPrice || p.price) : p.price} • Stock: {p.stock}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ width: '100px' }}>
                          <input 
                            type="number" 
                            min="1"
                            value={coSelectedQty}
                            onChange={(e) => setCoSelectedQty(Number(e.target.value))}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px', textAlign: 'center' }}
                          />
                        </div>

                        <button 
                          onClick={() => {
                            const prod = products.find(p => p._id === coSelectedProductId);
                            if (!prod) {
                              alert('Please select a valid product first');
                              return;
                            }
                            // Check if already in list
                            if (coItems.some(item => item.productId === prod._id)) {
                              alert('Product already added');
                              return;
                            }
                            setCoItems([...coItems, {
                              productId: prod._id,
                              name: prod.name,
                              quantity: coSelectedQty,
                              price: coSegment === 'b2b' ? (prod.b2bPrice || prod.price) : prod.price
                            }]);
                            setCoSelectedProductId('');
                            setProductSearchTerm('');
                            setCoSelectedQty(1);
                          }}
                          className="btn-primary" 
                          style={{ padding: '12px 20px', background: 'var(--primary)', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px' }}
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>

                      {/* Added Items List Table */}
                      {coItems.length > 0 && (
                        <div style={{ border: '1px solid var(--glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-dim)' }}>Product Name</th>
                                <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--text-dim)', width: '100px' }}>Quantity</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-dim)', width: '120px' }}>Est. Price</th>
                                <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--text-dim)', width: '60px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {coItems.map((item, index) => (
                                <tr key={index} style={{ borderBottom: index < coItems.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.name}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>₹{(item.price * item.quantity).toLocaleString()}</td>
                                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                    <button 
                                      onClick={() => setCoItems(coItems.filter((_, i) => i !== index))}
                                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment selection & total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', background: 'var(--card-bg)', padding: '20px 24px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Payment Mode:</span>
                      <select 
                        value={coPaymentMethod}
                        onChange={(e) => setCoPaymentMethod(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '10px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }}
                      >
                        <option value="COD">COD (Cash on Delivery)</option>
                        <option value="UPI">UPI / Online</option>
                      </select>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Estimated Grand Total</span>
                      <span style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                        ₹{coItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div style={{ padding: '20px 32px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setCoSegment('');
                      setCoUserId('');
                      setCoAddress({ name: '', phone: '', address: '', city: '', pincode: '', state: '' });
                      setCoItems([]);
                      setCoCategoryId('');
                      setCoSubCategoryId('');
                      setCoErrors({});
                    }} 
                    className="btn-primary" 
                    style={{ background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      if (!coUserId) {
                        alert('Please select a customer first');
                        return;
                      }
                      if (coItems.length === 0) {
                        alert('Please add at least one product');
                        return;
                      }
                      
                      const errors = {};
                      if (!coAddress.name) errors.name = true;

                      if (Object.keys(errors).length > 0) {
                        setCoErrors(errors);
                        alert("Please fill out the recipient name.");
                        document.getElementById('co-recipient-name')?.focus();
                        return;
                      }

                      try {
                        await axios.post('/orders/admin/create', {
                          userId: coUserId,
                          items: coItems,
                          shippingAddress: coAddress,
                          paymentMethod: coPaymentMethod
                        });
                        alert('Manual order successfully created!');
                        setShowCreateModal(false);
                        setCoSegment('');
                        setCoUserId('');
                        setCoAddress({ name: '', phone: '', address: '', city: '', pincode: '', state: '' });
                        setCoItems([]);
                        setCoCategoryId('');
                        setCoSubCategoryId('');
                        setCoErrors({});
                        fetchOrders();
                      } catch (err) {
                        alert('Failed to manually create order: ' + (err.response?.data?.message || err.message));
                      }
                    }}
                    className="btn-primary"
                  >
                    Create Order
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Order Items Modal */}
      {showEditItemsModal && editingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '650px', borderRadius: '32px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Edit Order Products</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0' }}>Edit quantities or add new products to Order #{editingOrder._id.slice(-8).toUpperCase()}</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditItemsModal(false);
                  setEditingOrder(null);
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
              {/* Product Selector */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', margin: '0 0 12px' }}>Add New Product</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Category & Subcategory Dropdowns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)' }}>Filter by Category</label>
                      <select 
                        value={eoCategoryId}
                        onChange={(e) => {
                          setEoCategoryId(e.target.value);
                          setEoSubCategoryId(''); 
                          setEoSelectedProductId('');
                          setEoProductSearchTerm('');
                        }}
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)' }}>Filter by Subcategory</label>
                      <select 
                        value={eoSubCategoryId}
                        onChange={(e) => {
                          setEoSubCategoryId(e.target.value);
                          setEoSelectedProductId('');
                          setEoProductSearchTerm('');
                        }}
                        disabled={!eoCategoryId}
                        style={{ padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px', outline: 'none', opacity: eoCategoryId ? 1 : 0.6 }}
                      >
                        <option value="">All Subcategories</option>
                        {categories.find(c => c._id === eoCategoryId)?.subCategories?.map(sub => (
                          <option key={sub._id} value={sub._id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Product Search Input */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder={eoCategoryId ? "Click to view or search products..." : "Search products by specification name..."}
                        value={eoProductSearchTerm}
                        onChange={(e) => setEoProductSearchTerm(e.target.value)}
                        onFocus={() => setEoProductFocused(true)}
                        onBlur={() => setTimeout(() => setEoProductFocused(false), 200)}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontSize: '13px' }}
                      />
                      {(eoProductSearchTerm || eoProductFocused) && (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: '48px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', maxHeight: '160px', overflowY: 'auto', padding: '6px', zIndex: 10 }}>
                          {products.filter(p => {
                            const matchSearch = !eoProductSearchTerm || p.name?.toLowerCase().includes(eoProductSearchTerm.toLowerCase());
                            const matchCategory = !eoCategoryId || (p.categoryId?._id || p.categoryId) === eoCategoryId;
                            const matchSubCategory = !eoSubCategoryId || (p.subCategoryId?._id || p.subCategoryId) === eoSubCategoryId;
                            return matchSearch && matchCategory && matchSubCategory;
                          }).map(p => (
                            <button
                              key={p._id}
                              onClick={() => {
                                setEoSelectedProductId(p._id);
                                setEoProductSearchTerm(p.name);
                              }}
                              style={{ width: '100%', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center', background: 'transparent', border: 'none', borderRadius: '10px', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left' }}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <img src={p.imageUrl} style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                              <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: '12px', margin: 0 }}>{p.name}</p>
                                <p style={{ fontSize: '10px', color: 'var(--text-dim)', margin: 0 }}>
                                  ₹{editingOrder.userId?.role === 'b2b' ? (p.b2bPrice || p.price) : p.price} • Stock: {p.stock}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ width: '100px' }}>
                      <input 
                        type="number" 
                        min="1"
                        value={eoSelectedQty}
                        onChange={(e) => setEoSelectedQty(Number(e.target.value))}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '13px', textAlign: 'center' }}
                      />
                    </div>

                    <button 
                      onClick={() => {
                        const prod = products.find(p => p._id === eoSelectedProductId);
                        if (!prod) {
                          alert('Please select a valid product first');
                          return;
                        }
                        if (eoItems.some(item => item.productId === prod._id)) {
                          alert('Product already in list');
                          return;
                        }
                        const userRole = editingOrder.userId?.role || 'b2c';
                        setEoItems([...eoItems, {
                          productId: prod._id,
                          name: prod.name,
                          quantity: eoSelectedQty,
                          price: userRole === 'b2b' ? (prod.b2bPrice || prod.price) : prod.price
                        }]);
                        setEoSelectedProductId('');
                        setEoProductSearchTerm('');
                        setEoSelectedQty(1);
                      }}
                      className="btn-primary" 
                      style={{ padding: '12px 20px', background: 'var(--primary)', border: 'none', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '12px' }}
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Current Items List */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary)', margin: '0 0 12px' }}>Current Products</h4>
                <div style={{ border: '1px solid var(--glass-border)', borderRadius: '16px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-dim)' }}>Product</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--text-dim)', width: '120px' }}>Quantity</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-dim)', width: '120px' }}>Estimated Price</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--text-dim)', width: '60px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {eoItems.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>No products in this order. Add one above.</td>
                        </tr>
                      ) : eoItems.map((item, index) => (
                        <tr key={index} style={{ borderBottom: index < eoItems.length - 1 ? '1px solid var(--glass-border)' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.name}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                              <button 
                                onClick={() => {
                                  if (item.quantity > 1) {
                                    const updated = [...eoItems];
                                    updated[index].quantity -= 1;
                                    setEoItems(updated);
                                  }
                                }}
                                style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 700, width: '30px', display: 'inline-block', textAlign: 'center' }}>{item.quantity}</span>
                              <button 
                                onClick={() => {
                                  const updated = [...eoItems];
                                  updated[index].quantity += 1;
                                  setEoItems(updated);
                                }}
                                style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>₹{(item.price * item.quantity).toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button 
                              onClick={() => setEoItems(eoItems.filter((_, i) => i !== index))}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', background: 'var(--card-bg)', padding: '16px 24px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Recalculated Order Total</span>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                    ₹{eoItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ padding: '20px 32px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => {
                  setShowEditItemsModal(false);
                  setEditingOrder(null);
                }} 
                className="btn-primary" 
                style={{ background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (eoItems.length === 0) {
                    alert('Order must have at least one product');
                    return;
                  }

                  try {
                    await axios.put(`/orders/admin/${editingOrder._id}/items`, {
                      items: eoItems
                    });
                    alert('Order products successfully updated!');
                    setShowEditItemsModal(false);
                    setEditingOrder(null);
                    fetchOrders();
                  } catch (err) {
                    alert('Failed to update order products: ' + (err.response?.data?.message || err.message));
                  }
                }}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
