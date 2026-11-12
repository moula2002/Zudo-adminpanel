import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Wallet, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  History, 
  ArrowUpRight, 
  Activity,
  Users,
  Info,
  Download,
  Receipt,
  Calendar,
  FilePlus,
  CreditCard,
  Banknote,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Upload,
  Eye,
  Check,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

const safeFormatCurrency = (val, fractionDigits = 0) => {
  const num = Number(val);
  if (isNaN(num)) return fractionDigits > 0 ? '0.00' : '0';
  return fractionDigits > 0
    ? num.toLocaleString('en-IN', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
    : num.toLocaleString('en-IN');
};

const safeFormatDate = (dateVal, fallback = '—') => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
  } catch {
    return fallback;
  }
};

const safeFormatDateTime = (dateVal, fallback = '—') => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? fallback : d.toLocaleString();
  } catch {
    return fallback;
  }
};

const Payments = () => {
  // Navigation Tabs: 'sellers', 'cod', 'online', 'audit', 'invoices'
  const [activeTab, setActiveTab] = useState('sellers');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Data States
  const [dashboardStats, setDashboardStats] = useState({
    totalSellerSales: 0,
    totalCodSales: 0,
    totalOnlineSales: 0,
    totalSettledAmount: 0,
    totalPendingPayments: 0,
    totalOutstandingAmount: 0,
    totalCodCollection: 0,
    totalOnlineCollection: 0,
    partnerMerchantsCount: 0,
    deliveredOrdersCount: 0
  });

  const [merchants, setMerchants] = useState([]);
  const [codOrders, setCodOrders] = useState([]);
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [sellerInvoices, setSellerInvoices] = useState([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [selectedSellerFilter, setSelectedSellerFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [codCollectionFilter, setCodCollectionFilter] = useState('All');
  const [onlineVerificationFilter, setOnlineVerificationFilter] = useState('All');

  // Manual Settlement Modal States
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('Bank Transfer');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [settleRemarks, setSettleRemarks] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);

  // Seller Details / Ledger Modal States
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [sellerDetails, setSellerDetails] = useState(null);
  const [detailsTab, setDetailsTab] = useState('orders'); // 'orders', 'payouts', 'audit'

  // Action Modals for COD / Online Order Update
  const [showOrderActionModal, setShowOrderActionModal] = useState(false);
  const [selectedOrderAction, setSelectedOrderAction] = useState(null); // { order, type: 'cod' | 'online', action: string }
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionReference, setActionReference] = useState('');
  const [actionAmount, setActionAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Invoice Modal States
  const [showSellerInvoicesModal, setShowSellerInvoicesModal] = useState(false);
  const [generateStartDate, setGenerateStartDate] = useState('');
  const [generateEndDate, setGenerateEndDate] = useState('');
  const [generateInvoiceNumber, setGenerateInvoiceNumber] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  // Notification State
  const [notification, setNotification] = useState({ type: '', message: '' });

  // --------------------------------------------------------------------------
  // Data Fetching
  // --------------------------------------------------------------------------
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setStatsLoading(true);

      const [statsRes, sellersRes, codRes, onlineRes, auditRes, invoicesRes] = await Promise.all([
        api.get('/payments/dashboard-stats').catch(() => ({ data: {} })),
        api.get('/payments/sellers').catch(() => ({ data: [] })),
        api.get('/payments/cod-orders').catch(() => ({ data: [] })),
        api.get('/payments/online-orders').catch(() => ({ data: [] })),
        api.get('/payments/audit-logs').catch(() => ({ data: [] })),
        api.get('/seller-invoices/admin/all').catch(() => ({ data: [] }))
      ]);

      if (statsRes.data) setDashboardStats(statsRes.data);
      if (Array.isArray(sellersRes.data)) setMerchants(sellersRes.data);
      if (Array.isArray(codRes.data)) setCodOrders(codRes.data);
      if (Array.isArray(onlineRes.data)) setOnlineOrders(onlineRes.data);
      if (Array.isArray(auditRes.data)) setAuditLogs(auditRes.data);
      if (Array.isArray(invoicesRes.data)) setSellerInvoices(invoicesRes.data);
    } catch (err) {
      console.error('Failed to fetch payments data:', err);
      toast.error('Failed to load payment information.');
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --------------------------------------------------------------------------
  // Manual Settlement Handler
  // --------------------------------------------------------------------------
  const openSettleModal = (merchantData) => {
    setSelectedMerchant(merchantData);
    const outstanding = merchantData.outstandingBalance || 0;
    setSettleAmount(outstanding > 0 ? outstanding.toFixed(2) : '');
    setSettleMethod('Bank Transfer');
    setSettleDate(new Date().toISOString().split('T')[0]);
    setTransactionRef('');
    setSettleRemarks('');
    setProofFile(null);
    setShowSettleModal(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingProof(true);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const fileUrl = res.data.fileUrl || res.data.url;
      setProofFile(fileUrl);
      toast.success('Payment proof uploaded successfully!');
    } catch (err) {
      console.error('Proof upload error:', err);
      toast.error('Failed to upload payment proof');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleManualSettlementSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMerchant || !settleAmount || parseFloat(settleAmount) <= 0) {
      toast.error('Please enter a valid settlement amount.');
      return;
    }

    const numAmount = parseFloat(settleAmount);
    setSettleLoading(true);

    try {
      const res = await api.post('/payments/settle', {
        sellerId: selectedMerchant.seller._id,
        amount: numAmount,
        paymentMethod: settleMethod,
        transactionId: transactionRef,
        utrReference: transactionRef,
        proofUrl: proofFile,
        remarks: settleRemarks,
        paymentDate: settleDate
      });

      toast.success(res.data.message || 'Settlement recorded successfully!');
      setShowSettleModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Settlement error:', err);
      toast.error(err.response?.data?.message || 'Failed to process settlement.');
    } finally {
      setSettleLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Seller Details / Ledger Handler
  // --------------------------------------------------------------------------
  const openSellerDetailsModal = async (merchantData) => {
    setSelectedMerchant(merchantData);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    setDetailsTab('orders');

    try {
      const res = await api.get(`/payments/sellers/${merchantData.seller._id}/details`);
      setSellerDetails(res.data);
    } catch (err) {
      console.error('Fetch seller details error:', err);
      toast.error('Failed to load seller payment ledger.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // COD & Online Order Actions Handler
  // --------------------------------------------------------------------------
  const openOrderAction = (order, type, action) => {
    setSelectedOrderAction({ order, type, action });
    setActionRemarks('');
    setActionReference(order.codReference || order.transactionId || '');
    setActionAmount(order.codCollectedAmount || order.orderAmount || '');
    setShowOrderActionModal(true);
  };

  const handleOrderActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrderAction) return;

    const { order, type, action } = selectedOrderAction;
    setActionLoading(true);

    try {
      if (type === 'cod') {
        await api.put(`/payments/cod-orders/${order._id}/status`, {
          action,
          codCollectedAmount: actionAmount ? parseFloat(actionAmount) : undefined,
          codReference: actionReference,
          remarks: actionRemarks
        });
        toast.success(`COD order successfully updated: ${action.replace('_', ' ')}`);
      } else {
        await api.put(`/payments/online-orders/${order._id}/status`, {
          action,
          transactionId: actionReference,
          remarks: actionRemarks
        });
        toast.success(`Online order successfully updated: ${action.replace('_', ' ')}`);
      }

      setShowOrderActionModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Order action error:', err);
      toast.error(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Invoices Handlers (Preserving Existing Functionality)
  // --------------------------------------------------------------------------
  const handleClearInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to mark this invoice as cleared?')) return;
    try {
      await api.put(`/seller-invoices/admin/${id}/clear`);
      setSellerInvoices(sellerInvoices.map(inv => inv._id === id ? { ...inv, status: 'Cleared' } : inv));
      toast.success('Invoice marked as cleared');
    } catch (err) {
      toast.error('Failed to clear invoice');
    }
  };

  const handleDownloadInvoice = async (inv) => {
    try {
      const response = await api.get(`/seller-invoices/${inv._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Seller_Invoice_${inv.invoiceNumber || inv._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download invoice');
    }
  };

  const openSellerInvoicesModal = async (merchantData) => {
    setSelectedMerchant(merchantData);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 90);
    setGenerateStartDate(start.toISOString().split('T')[0]);
    setGenerateEndDate(end.toISOString().split('T')[0]);
    setGenerateInvoiceNumber('');
    setShowSellerInvoicesModal(true);

    try {
      const res = await api.get(`/seller-invoices/next-number?sellerId=${merchantData.seller._id}`);
      if (res.data?.nextExpectedNumber) {
        setGenerateInvoiceNumber(String(res.data.nextExpectedNumber));
      } else {
        setGenerateInvoiceNumber('1');
      }
    } catch (e) {
      setGenerateInvoiceNumber('1');
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!generateStartDate || !generateEndDate || !generateInvoiceNumber) {
      toast.error("Please fill all invoice generation fields.");
      return;
    }

    setGenerateLoading(true);
    try {
      await api.post('/seller-invoices/generate', {
        sellerId: selectedMerchant.seller._id,
        startDate: generateStartDate,
        endDate: generateEndDate,
        invoiceNumber: generateInvoiceNumber
      });
      toast.success('Invoice generated successfully!');
      const invoicesRes = await api.get('/seller-invoices/admin/all');
      setSellerInvoices(invoicesRes.data);
      setShowSellerInvoicesModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGenerateLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Excel Export Reports (Section 10)
  // --------------------------------------------------------------------------
  const exportReport = (reportType) => {
    let exportData = [];
    let filename = 'Zudo_Report.xlsx';

    if (reportType === 'sellers' || reportType === 'outstanding') {
      const list = reportType === 'outstanding' 
        ? filteredMerchants.filter(m => m.outstandingBalance > 0)
        : filteredMerchants;

      exportData = list.map(item => ({
        'Seller ID': item.seller._id,
        'Seller Name': item.seller.name,
        'Store / Business Name': item.seller.businessName || item.seller.storeName || 'N/A',
        'Phone': item.seller.phone || 'N/A',
        'Email': item.seller.email || 'N/A',
        'Total Delivered Sales (₹)': item.totalSales,
        'COD Sales (₹)': item.codSales,
        'Online Sales (₹)': item.onlineSales,
        'Platform Commission (₹)': item.totalCommission,
        'Net Seller Payable (₹)': item.sellerPayable,
        'Settled Amount (₹)': item.settledAmount,
        'Outstanding Balance (₹)': item.outstandingBalance,
        'Payment Method': item.paymentMethod,
        'Payment Status': item.paymentStatus,
        'Delivered Orders Count': item.orderCount,
        'Settlement Payouts Count': item.payoutCount
      }));
      filename = reportType === 'outstanding' ? 'Zudo_Seller_Outstanding_Balances.xlsx' : 'Zudo_Seller_Payments_Ledger.xlsx';
    } else if (reportType === 'cod') {
      exportData = filteredCodOrders.map(order => ({
        'Order ID': order._id,
        'Order Reference': order.orderRef,
        'Customer Name': order.customerName,
        'Customer Phone': order.customerPhone,
        'Sellers': order.sellerNames,
        'Order Amount (₹)': order.orderAmount,
        'Order Status': order.orderStatus,
        'Delivery Date': safeFormatDate(order.deliveryDate, 'N/A'),
        'Driver': order.driverName,
        'COD Collection Status': order.codCollectionStatus,
        'COD Collected Amount (₹)': order.codCollectedAmount,
        'Collection Reference': order.codReference || 'N/A',
        'Seller Settlement Status': order.sellerSettlementStatus,
        'Admin Remarks': order.codRemarks || 'N/A'
      }));
      filename = 'Zudo_COD_Collections_Report.xlsx';
    } else if (reportType === 'online') {
      exportData = filteredOnlineOrders.map(order => ({
        'Order ID': order._id,
        'Order Reference': order.orderRef,
        'Customer Name': order.customerName,
        'Customer Phone': order.customerPhone,
        'Sellers': order.sellerNames,
        'Payment Amount (₹)': order.onlinePaymentAmount,
        'Payment Gateway': order.paymentGateway,
        'Transaction ID': order.transactionId,
        'Payment Date': safeFormatDate(order.paymentDate, 'N/A'),
        'Payment Verification Status': order.paymentVerificationStatus,
        'Seller Settlement Status': order.sellerSettlementStatus,
        'Remarks': order.remarks || 'N/A'
      }));
      filename = 'Zudo_Online_Payments_Report.xlsx';
    } else if (reportType === 'audit') {
      exportData = auditLogs.map(log => ({
        'Date & Time': safeFormatDateTime(log.date || log.createdAt),
        'Action': log.action,
        'Seller': log.sellerName || 'N/A',
        'Order ID': log.orderId || 'N/A',
        'Previous Status': log.previousStatus || 'N/A',
        'Updated Status': log.updatedStatus || 'N/A',
        'Amount (₹)': log.amount || 0,
        'Payment Method': log.paymentMethod || 'N/A',
        'Reference / UTR': log.transactionReference || 'N/A',
        'Admin Name': log.adminName || 'Admin',
        'Remarks': log.remarks || 'N/A'
      }));
      filename = 'Zudo_Payments_Audit_Trail.xlsx';
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${filename} successfully!`);
  };

  // --------------------------------------------------------------------------
  // Filters & Search Logic
  // --------------------------------------------------------------------------
  const filteredMerchants = merchants.filter(m => {
    const matchesSearch = 
      m.seller.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (m.seller.businessName && m.seller.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.seller.phone && m.seller.phone.includes(searchQuery)) ||
      m.seller.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = paymentMethodFilter === 'All' || m.paymentMethod === paymentMethodFilter;
    const matchesStatus = paymentStatusFilter === 'All' || m.paymentStatus === paymentStatusFilter;
    const matchesSeller = selectedSellerFilter === 'All' || m.seller._id === selectedSellerFilter;

    return matchesSearch && matchesMethod && matchesStatus && matchesSeller;
  });

  const filteredCodOrders = codOrders.filter(order => {
    const matchesSearch = 
      (order.orderRef || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.sellerNames || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerPhone || '').includes(searchQuery) ||
      (order.driverName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCollection = codCollectionFilter === 'All' || order.codCollectionStatus === codCollectionFilter;
    const matchesSettlement = paymentStatusFilter === 'All' || order.sellerSettlementStatus === paymentStatusFilter;
    const matchesSeller = selectedSellerFilter === 'All' || order.sellers.some(s => s.sellerId === selectedSellerFilter);

    return matchesSearch && matchesCollection && matchesSettlement && matchesSeller;
  });

  const filteredOnlineOrders = onlineOrders.filter(order => {
    const matchesSearch = 
      (order.orderRef || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.sellerNames || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.transactionId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.paymentGateway || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVerification = onlineVerificationFilter === 'All' || order.paymentVerificationStatus === onlineVerificationFilter;
    const matchesSettlement = paymentStatusFilter === 'All' || order.sellerSettlementStatus === paymentStatusFilter;
    const matchesSeller = selectedSellerFilter === 'All' || order.sellers.some(s => s.sellerId === selectedSellerFilter);

    return matchesSearch && matchesVerification && matchesSettlement && matchesSeller;
  });

  // Status Pill Styles
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Settled':
      case 'Verified':
      case 'Collected':
      case 'Approved':
      case 'Completed':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' };
      case 'Partially Settled':
      case 'Processing':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
      case 'Pending':
      case 'Not Collected':
        return { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' };
      case 'Rejected':
      case 'Disputed':
      case 'Failed':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
      {/* -------------------------------------------------------------------- */}
      {/* HEADER & EXPORT ACTIONS */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Seller Payments & Settlement Management
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
            Unified control for COD collections, Online payments, manual settlements, and audit trails
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => exportReport(activeTab === 'cod' ? 'cod' : activeTab === 'online' ? 'online' : activeTab === 'audit' ? 'audit' : 'sellers')}
            className="btn-primary" 
            style={{ 
              background: 'var(--glass-bg)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--glass-border)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              height: '44px',
              padding: '0 20px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Download size={16} /> Export Current View
          </button>

          <button 
            onClick={() => exportReport('outstanding')}
            className="btn-primary" 
            style={{ 
              background: 'rgba(245, 158, 11, 0.15)', 
              color: '#f59e0b', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              height: '44px',
              padding: '0 20px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={16} /> Outstanding Report
          </button>

          <button 
            onClick={fetchAllData}
            style={{ 
              background: 'var(--glass-bg)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--glass-border)', 
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Refresh Data"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* 1. PAYMENTS DASHBOARD - 8 SUMMARY CARDS */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Total Seller Sales', value: `₹${safeFormatCurrency(dashboardStats.totalSellerSales)}`, icon: Activity, color: '#6366f1', sub: `${dashboardStats.deliveredOrdersCount || 0} delivered orders` },
          { label: 'Total COD Sales', value: `₹${safeFormatCurrency(dashboardStats.totalCodSales)}`, icon: Banknote, color: '#f59e0b', sub: 'Cash at Delivery' },
          { label: 'Total Online Sales', value: `₹${safeFormatCurrency(dashboardStats.totalOnlineSales)}`, icon: CreditCard, color: '#3b82f6', sub: 'Gateways & UPI' },
          { label: 'Total Settled Amount', value: `₹${safeFormatCurrency(dashboardStats.totalSettledAmount)}`, icon: CheckCircle2, color: '#22c55e', sub: 'Paid out to sellers' },
          { label: 'Total Pending Payments', value: `₹${safeFormatCurrency(dashboardStats.totalPendingPayments)}`, icon: AlertCircle, color: '#ef4444', sub: 'Awaiting settlement' },
          { label: 'Total Outstanding Amount', value: `₹${safeFormatCurrency(dashboardStats.totalOutstandingAmount)}`, icon: Wallet, color: '#ec4899', sub: 'Net balance due' },
          { label: 'Total COD Collection', value: `₹${safeFormatCurrency(dashboardStats.totalCodCollection)}`, icon: ShieldCheck, color: '#10b981', sub: 'Collected & verified' },
          { label: 'Total Online Collection', value: `₹${safeFormatCurrency(dashboardStats.totalOnlineCollection)}`, icon: ArrowUpRight, color: '#8b5cf6', sub: 'Gateway confirmed' },
        ].map((stat, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {stat.label}
              </span>
              <div style={{ padding: '8px', background: `${stat.color}15`, color: stat.color, borderRadius: '10px' }}>
                <stat.icon size={18} />
              </div>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* NAVIGATION TABS */}
      {/* -------------------------------------------------------------------- */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '4px', overflowX: 'auto' }}>
        {[
          { id: 'sellers', label: 'Seller Payments', count: merchants.length, icon: Users },
          { id: 'cod', label: 'COD Management', count: codOrders.length, icon: Banknote },
          { id: 'online', label: 'Online Management', count: onlineOrders.length, icon: CreditCard },
          { id: 'audit', label: 'Audit Trail', count: auditLogs.length, icon: History },
          { id: 'invoices', label: 'Seller Invoices', count: sellerInvoices.length, icon: Receipt },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '12px 12px 0 0',
              background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-dim)',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              borderRadius: '10px', 
              background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-dim)',
              fontWeight: 700
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: SELLER PAYMENTS OVERVIEW */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'sellers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Search sellers by name, business or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '40px', height: '42px', fontSize: '13px', borderRadius: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select 
                value={paymentMethodFilter} 
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="input-field"
                style={{ height: '42px', fontSize: '13px', borderRadius: '12px', padding: '0 12px' }}
              >
                <option value="All">All Methods (COD & Online)</option>
                <option value="COD">COD Only</option>
                <option value="Online">Online Only</option>
                <option value="Both">Both (COD & Online)</option>
              </select>

              <select 
                value={paymentStatusFilter} 
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="input-field"
                style={{ height: '42px', fontSize: '13px', borderRadius: '12px', padding: '0 12px' }}
              >
                <option value="All">All Payment Statuses</option>
                <option value="Pending">Pending Settlement</option>
                <option value="Partially Settled">Partially Settled</option>
                <option value="Settled">Fully Settled</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Seller / Store</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Sales</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>COD Sales</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Online Sales</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Settled Amount</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Outstanding Dues</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Method</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px auto' }} />
                        <div>Loading seller payments...</div>
                      </td>
                    </tr>
                  ) : filteredMerchants.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No seller payment records found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMerchants.map((item) => {
                      const statusStyle = getStatusBadge(item.paymentStatus);
                      return (
                        <tr key={item.seller?._id || item.sellerId || Math.random()} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ 
                                width: '38px', 
                                height: '38px', 
                                borderRadius: '12px', 
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                                color: '#fff', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 800,
                                fontSize: '14px'
                              }}>
                                {(item.seller?.name || item.sellerName || 'S').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                                  {item.seller?.name || item.sellerName || 'Unknown Seller'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                                  {item.seller?.businessName || item.seller?.storeName || item.seller?.phone || 'No Store Name'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>
                              ₹{safeFormatCurrency(item.totalSales, 2)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {item.orderCount} delivered orders
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#f59e0b' }}>
                              ₹{safeFormatCurrency(item.codSales, 2)}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#3b82f6' }}>
                              ₹{safeFormatCurrency(item.onlineSales, 2)}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#22c55e' }}>
                              ₹{safeFormatCurrency(item.settledAmount, 2)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {item.payoutCount} payout records
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ 
                              fontWeight: 800, 
                              fontSize: '14px', 
                              color: item.outstandingBalance > 0 ? '#f59e0b' : item.outstandingBalance < 0 ? '#ef4444' : '#22c55e' 
                            }}>
                              ₹{safeFormatCurrency(item.outstandingBalance, 2)}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              Payable: ₹{safeFormatCurrency(item.sellerPayable)}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              fontSize: '12px', 
                              fontWeight: 600,
                              background: item.paymentMethod === 'Both' ? 'rgba(168, 85, 247, 0.15)' : item.paymentMethod === 'COD' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: item.paymentMethod === 'Both' ? '#a855f7' : item.paymentMethod === 'COD' ? '#f59e0b' : '#3b82f6'
                            }}>
                              {item.paymentMethod}
                            </span>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              fontSize: '12px', 
                              fontWeight: 700,
                              background: statusStyle.bg,
                              color: statusStyle.text,
                              border: `1px solid ${statusStyle.border}`
                            }}>
                              {item.paymentStatus}
                            </span>
                          </td>

                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => openSellerDetailsModal(item)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '10px',
                                  background: 'rgba(99, 102, 241, 0.15)',
                                  color: 'var(--primary)',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                title="View Order Ledger"
                              >
                                <Eye size={14} /> View
                              </button>

                              <button
                                onClick={() => openSettleModal(item)}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '10px',
                                  background: 'var(--primary)',
                                  color: '#fff',
                                  border: 'none',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                                title="Manage Manual Settlement"
                              >
                                <Wallet size={14} /> Manage
                              </button>

                              <button
                                onClick={() => openSellerInvoicesModal(item)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '10px',
                                  background: 'var(--glass-bg)',
                                  color: 'var(--text-dim)',
                                  border: '1px solid var(--glass-border)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Seller Invoices"
                              >
                                <Receipt size={14} />
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
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: COD PAYMENT MANAGEMENT */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'cod' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Search COD orders by ID, customer, seller, driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '40px', height: '42px', fontSize: '13px', borderRadius: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select 
                value={codCollectionFilter} 
                onChange={(e) => setCodCollectionFilter(e.target.value)}
                className="input-field"
                style={{ height: '42px', fontSize: '13px', borderRadius: '12px', padding: '0 12px' }}
              >
                <option value="All">All Collection Statuses</option>
                <option value="Not Collected">Not Collected</option>
                <option value="Collected">Collected</option>
                <option value="Verified">Verified</option>
                <option value="Disputed">Disputed</option>
              </select>

              <select 
                value={paymentStatusFilter} 
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="input-field"
                style={{ height: '42px', fontSize: '13px', borderRadius: '12px', padding: '0 12px' }}
              >
                <option value="All">All Settlement Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Partially Settled">Partially Settled</option>
                <option value="Settled">Settled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* COD Orders Table */}
          <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Order Ref</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Seller(s)</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Delivery Date</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Driver</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>COD Collection</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Seller Settlement</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodOrders.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No COD orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredCodOrders.map((order) => {
                      const collBadge = getStatusBadge(order.codCollectionStatus);
                      const settBadge = getStatusBadge(order.sellerSettlementStatus);

                      return (
                        <tr key={order._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)' }}>
                              #{order.orderRef}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {order.orderStatus}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                              {order.sellerNames}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                              {order.customerName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {order.customerPhone}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                              ₹{safeFormatCurrency(order.orderAmount)}
                            </div>
                            {order.codCollectedAmount > 0 && order.codCollectedAmount !== order.orderAmount && (
                              <div style={{ fontSize: '11px', color: '#10b981' }}>
                                Coll: ₹{safeFormatCurrency(order.codCollectedAmount)}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                              {safeFormatDate(order.deliveryDate, 'Pending')}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>
                              {order.driverName}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              fontSize: '12px', 
                              fontWeight: 700,
                              background: collBadge.bg,
                              color: collBadge.text,
                              border: `1px solid ${collBadge.border}`
                            }}>
                              {order.codCollectionStatus}
                            </span>
                            {order.codReference && (
                              <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                                Ref: {order.codReference}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              fontSize: '12px', 
                              fontWeight: 700,
                              background: settBadge.bg,
                              color: settBadge.text,
                              border: `1px solid ${settBadge.border}`
                            }}>
                              {order.sellerSettlementStatus}
                            </span>
                          </td>

                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {order.codCollectionStatus !== 'Verified' && (
                                <button
                                  onClick={() => openOrderAction(order, 'cod', 'VERIFY_COLLECTION')}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                  title="Verify COD Collection"
                                >
                                  Verify
                                </button>
                              )}

                              {order.codCollectionStatus !== 'Collected' && order.codCollectionStatus !== 'Verified' && (
                                <button
                                  onClick={() => openOrderAction(order, 'cod', 'MARK_COLLECTED')}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    color: '#3b82f6',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                  title="Mark as Collected"
                                >
                                  Collect
                                </button>
                              )}

                              <button
                                onClick={() => openOrderAction(order, 'cod', 'APPROVE_SETTLEMENT')}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#a855f7',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Approve Settlement"
                              >
                                Approve
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
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 3: ONLINE PAYMENT MANAGEMENT */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'online' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '420px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input 
                type="text" 
                placeholder="Search online orders by ID, gateway, transaction ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '40px', height: '42px', fontSize: '13px', borderRadius: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select 
                value={onlineVerificationFilter} 
                onChange={(e) => setOnlineVerificationFilter(e.target.value)}
                className="input-field"
                style={{ height: '42px', fontSize: '13px', borderRadius: '12px', padding: '0 12px' }}
              >
                <option value="All">All Verification Statuses</option>
                <option value="Pending">Pending Verification</option>
                <option value="Verified">Verified</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>

              <select 
                value={paymentStatusFilter} 
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="input-field"
                style={{ height: '42px', fontSize: '13px', borderRadius: '12px', padding: '0 12px' }}
              >
                <option value="All">All Settlement Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Partially Settled">Partially Settled</option>
                <option value="Settled">Settled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Online Orders Table */}
          <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1050px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Order Ref</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Seller(s)</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Customer</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Amount</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Gateway & Txn</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Payment Date</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Gateway Status</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Seller Settlement</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOnlineOrders.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No online payment orders found.
                      </td>
                    </tr>
                  ) : (
                    filteredOnlineOrders.map((order) => {
                      const verBadge = getStatusBadge(order.paymentVerificationStatus);
                      const settBadge = getStatusBadge(order.sellerSettlementStatus);

                      return (
                        <tr key={order._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)' }}>
                              #{order.orderRef}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {order.orderStatus}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                              {order.sellerNames}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                              {order.customerName}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {order.customerPhone}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-main)' }}>
                              ₹{safeFormatCurrency(order.onlinePaymentAmount)}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#3b82f6' }}>
                              {order.paymentGateway}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                              {order.transactionId}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                              {safeFormatDate(order.paymentDate, 'N/A')}
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              fontSize: '12px', 
                              fontWeight: 700,
                              background: verBadge.bg,
                              color: verBadge.text,
                              border: `1px solid ${verBadge.border}`
                            }}>
                              {order.paymentVerificationStatus}
                            </span>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '8px', 
                              fontSize: '12px', 
                              fontWeight: 700,
                              background: settBadge.bg,
                              color: settBadge.text,
                              border: `1px solid ${settBadge.border}`
                            }}>
                              {order.sellerSettlementStatus}
                            </span>
                          </td>

                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {order.paymentVerificationStatus !== 'Verified' && (
                                <button
                                  onClick={() => openOrderAction(order, 'online', 'VERIFY_PAYMENT')}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                  title="Verify Payment"
                                >
                                  Verify
                                </button>
                              )}

                              <button
                                onClick={() => openOrderAction(order, 'online', 'APPROVE_SETTLEMENT')}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#a855f7',
                                  border: '1px solid rgba(168, 85, 247, 0.3)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                                title="Approve Seller Settlement"
                              >
                                Approve
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
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 4: AUDIT TRAIL */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Payment & Settlement Audit Log</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '4px 0 0 0' }}>Permanent, immutable ledger of all administrator settlement and verification actions</p>
              </div>
              <button 
                onClick={() => exportReport('audit')}
                className="btn-primary"
                style={{ 
                  background: 'var(--glass-bg)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--glass-border)',
                  fontSize: '12px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Download size={14} /> Export Audit Trail
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Timestamp</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Action</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Seller / Merchant</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Status Change</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Amount & Method</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Admin</th>
                    <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Remarks & Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No audit records captured yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)' }}>
                          {safeFormatDateTime(log.date || log.createdAt)}
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: 700,
                            background: log.action.includes('SETTLEMENT') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: log.action.includes('SETTLEMENT') ? 'var(--primary)' : '#22c55e'
                          }}>
                            {log.action}
                          </span>
                        </td>

                        <td style={{ padding: '14px 18px', fontWeight: 600, fontSize: '13px' }}>
                          {log.sellerName || 'General Platform'}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{log.previousStatus || '—'}</span>
                          <ArrowRight size={12} style={{ display: 'inline', margin: '0 6px', verticalAlign: 'middle' }} />
                          <span style={{ fontWeight: 700, color: '#22c55e' }}>{log.updatedStatus || '—'}</span>
                        </td>

                        <td style={{ padding: '14px 18px' }}>
                          {log.amount > 0 && (
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>
                              ₹{safeFormatCurrency(log.amount)}
                            </div>
                          )}
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {log.paymentMethod || 'System Update'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 600 }}>
                          {log.adminName || 'Admin'}
                        </td>

                        <td style={{ padding: '14px 18px', fontSize: '12px' }}>
                          <div style={{ color: 'var(--text-dim)' }}>
                            {log.remarks || '—'}
                          </div>
                          {log.proofUrl && (
                            <a 
                              href={log.proofUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontSize: '11px', marginTop: '4px', fontWeight: 600 }}
                            >
                              <ExternalLink size={12} /> View Proof
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 5: SELLER INVOICES (PRESERVED) */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Generated Commercial Invoices</h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '4px 0 0 0' }}>Official tax invoices created for merchant partners</p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Invoice No</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Seller</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Billing Period</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Orders</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Gross Sales</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Commission</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No generated invoices found.
                      </td>
                    </tr>
                  ) : (
                    sellerInvoices.map((inv) => (
                      <tr key={inv._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--primary)' }}>
                          #{inv.invoiceNumber}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                          {inv.sellerId?.name || 'Seller'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '12px', color: 'var(--text-dim)' }}>
                          {safeFormatDate(inv.startDate)} – {safeFormatDate(inv.endDate)}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                          {inv.orderCount || 0}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                          ₹{safeFormatCurrency(inv.totalAmount)}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#ec4899', fontWeight: 600 }}>
                          ₹{safeFormatCurrency(inv.totalCommission)}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            fontSize: '12px', 
                            fontWeight: 700,
                            background: inv.status === 'Cleared' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: inv.status === 'Cleared' ? '#22c55e' : '#eab308'
                          }}>
                            {inv.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleDownloadInvoice(inv)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'var(--glass-bg)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--glass-border)',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Download size={14} /> PDF
                            </button>

                            {inv.status !== 'Cleared' && (
                              <button
                                onClick={() => handleClearInvoice(inv._id)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  color: '#22c55e',
                                  border: '1px solid rgba(34, 197, 94, 0.3)',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                Mark Cleared
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 1: MANUAL SELLER PAYMENT SETTLEMENT (SECTION 5) */}
      {/* -------------------------------------------------------------------- */}
      {showSettleModal && selectedMerchant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '24px',
            padding: '28px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowSettleModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', borderRadius: '12px' }}>
                <Wallet size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Manual Seller Payment Settlement</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '2px 0 0 0' }}>
                  {selectedMerchant.seller.name} • {selectedMerchant.seller.businessName || 'Merchant'}
                </p>
              </div>
            </div>

            {/* Financial Summary Box */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL DELIVERED SALES</span>
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px' }}>
                  ₹{safeFormatCurrency(selectedMerchant?.totalSales, 2)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL SELLER PAYABLE</span>
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', color: '#6366f1' }}>
                  ₹{safeFormatCurrency(selectedMerchant?.sellerPayable, 2)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>PREVIOUSLY SETTLED</span>
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '2px', color: '#22c55e' }}>
                  ₹{safeFormatCurrency(selectedMerchant?.settledAmount, 2)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600 }}>CURRENT OUTSTANDING</span>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '2px', color: selectedMerchant.outstandingBalance > 0 ? '#f59e0b' : '#22c55e' }}>
                  ₹{safeFormatCurrency(selectedMerchant?.outstandingBalance, 2)}
                </div>
              </div>
            </div>

            {/* Settlement Form */}
            <form onSubmit={handleManualSettlementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>
                    SETTLEMENT AMOUNT (₹) *
                  </label>
                  {selectedMerchant.outstandingBalance > 0 && (
                    <button
                      type="button"
                      onClick={() => setSettleAmount(selectedMerchant.outstandingBalance.toFixed(2))}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Fill Outstanding (₹{safeFormatCurrency(selectedMerchant?.outstandingBalance)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="input-field"
                  style={{ height: '44px', fontSize: '15px', fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                    SETTLEMENT METHOD *
                  </label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value)}
                    className="input-field"
                    style={{ height: '44px', fontSize: '13px' }}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI Direct Payment</option>
                    <option value="COD">Cash On Delivery Adjustment</option>
                    <option value="Online">Online Gateway Payout</option>
                    <option value="Cheque">Commercial Cheque</option>
                    <option value="Cash">Physical Cash Settlement</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                    PAYMENT DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="input-field"
                    style={{ height: '44px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  TRANSACTION / UTR REFERENCE
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR128394829103 or UPI Reference ID"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="input-field"
                  style={{ height: '44px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  PAYMENT PROOF (OPTIONAL)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="input-field"
                    style={{ height: '44px', fontSize: '12px', padding: '8px' }}
                  />
                  {uploadingProof && <Loader2 className="animate-spin" size={18} color="var(--primary)" />}
                </div>
                {proofFile && (
                  <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px', fontWeight: 600 }}>
                    ✓ Proof uploaded: <a href={proofFile} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>View File</a>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  ADMIN REMARKS / NOTES
                </label>
                <textarea
                  placeholder="Add any internal remarks or audit notes regarding this payout..."
                  value={settleRemarks}
                  onChange={(e) => setSettleRemarks(e.target.value)}
                  className="input-field"
                  rows="3"
                  style={{ fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  style={{
                    flex: '1',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-dim)',
                    border: '1px solid var(--glass-border)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={settleLoading}
                  className="btn-primary"
                  style={{
                    flex: '2',
                    height: '46px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: settleLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {settleLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 2: SELLER DETAILS & ORDER LEDGER (SECTION 6) */}
      {/* -------------------------------------------------------------------- */}
      {showDetailsModal && selectedMerchant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '1000px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            padding: '28px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowDetailsModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              <X size={22} />
            </button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 800,
                fontSize: '18px'
              }}>
                {selectedMerchant.seller.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
                  {selectedMerchant.seller.name}
                </h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '2px 0 0 0' }}>
                  {selectedMerchant.seller.businessName || 'Business'} • Phone: {selectedMerchant.seller.phone || 'N/A'} • Email: {selectedMerchant.seller.email || 'N/A'}
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            {sellerDetails && sellerDetails.summary && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {[
                  { label: 'DELIVERED ORDERS', val: sellerDetails.summary.deliveredOrdersCount, color: '#6366f1' },
                  { label: 'GROSS SALES', val: `₹${safeFormatCurrency(sellerDetails?.summary?.totalSales)}`, color: 'var(--text-main)' },
                  { label: 'COD SALES', val: `₹${safeFormatCurrency(sellerDetails?.summary?.codSales)}`, color: '#f59e0b' },
                  { label: 'ONLINE SALES', val: `₹${safeFormatCurrency(sellerDetails?.summary?.onlineSales)}`, color: '#3b82f6' },
                  { label: 'COMMISSION DEDUCTED', val: `₹${safeFormatCurrency(sellerDetails?.summary?.totalCommission)}`, color: '#ec4899' },
                  { label: 'NET PAYABLE', val: `₹${safeFormatCurrency(sellerDetails?.summary?.totalSellerPayable)}`, color: '#6366f1' },
                  { label: 'SETTLED AMOUNT', val: `₹${safeFormatCurrency(sellerDetails?.summary?.settledAmount)}`, color: '#22c55e' },
                  { label: 'OUTSTANDING DUES', val: `₹${safeFormatCurrency(sellerDetails?.summary?.outstandingBalance)}`, color: sellerDetails.summary.outstandingBalance > 0 ? '#f59e0b' : '#22c55e' }
                ].map((s, idx) => (
                  <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)' }}>{s.label}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '4px', color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Inner Tabs */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '6px', marginBottom: '16px' }}>
              {[
                { id: 'orders', label: `Orders Ledger (${sellerDetails?.orders?.length || 0})` },
                { id: 'payouts', label: `Payout Records (${sellerDetails?.payouts?.length || 0})` },
                { id: 'audit', label: `Audit Trail (${sellerDetails?.auditLogs?.length || 0})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setDetailsTab(t.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: detailsTab === t.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: detailsTab === t.id ? 'var(--primary)' : 'var(--text-dim)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: '1', overflowY: 'auto' }}>
              {detailsLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 10px auto' }} />
                  <div>Loading seller records...</div>
                </div>
              ) : detailsTab === 'orders' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px' }}>Order Ref</th>
                      <th style={{ padding: '10px' }}>Date</th>
                      <th style={{ padding: '10px' }}>Customer</th>
                      <th style={{ padding: '10px' }}>Method</th>
                      <th style={{ padding: '10px' }}>Order Status</th>
                      <th style={{ padding: '10px' }}>Items Sales</th>
                      <th style={{ padding: '10px' }}>Commission</th>
                      <th style={{ padding: '10px' }}>Seller Earnings</th>
                      <th style={{ padding: '10px' }}>Settlement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerDetails?.orders?.length === 0 ? (
                      <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>No orders found for this seller.</td></tr>
                    ) : (
                      sellerDetails?.orders?.map((ord) => (
                        <tr key={ord.orderId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '10px', fontWeight: 700, color: 'var(--primary)' }}>#{ord.orderRef}</td>
                          <td style={{ padding: '10px', color: 'var(--text-dim)' }}>{safeFormatDate(ord.orderDate)}</td>
                          <td style={{ padding: '10px' }}>{ord.customerName}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontWeight: 600,
                              background: ord.paymentMethod === 'COD' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: ord.paymentMethod === 'COD' ? '#f59e0b' : '#3b82f6'
                            }}>
                              {ord.paymentMethod}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>{ord.orderStatus}</td>
                          <td style={{ padding: '10px', fontWeight: 600 }}>₹{safeFormatCurrency(ord.sellerGrossSales)}</td>
                          <td style={{ padding: '10px', color: '#ec4899' }}>₹{safeFormatCurrency(ord.sellerCommission)}</td>
                          <td style={{ padding: '10px', fontWeight: 800, color: '#22c55e' }}>₹{safeFormatCurrency(ord.sellerPayable)}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontWeight: 700,
                              background: getStatusBadge(ord.sellerSettlementStatus).bg,
                              color: getStatusBadge(ord.sellerSettlementStatus).text
                            }}>
                              {ord.sellerSettlementStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : detailsTab === 'payouts' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px' }}>Date</th>
                      <th style={{ padding: '10px' }}>Settled Amount</th>
                      <th style={{ padding: '10px' }}>Method</th>
                      <th style={{ padding: '10px' }}>UTR / Reference</th>
                      <th style={{ padding: '10px' }}>Admin</th>
                      <th style={{ padding: '10px' }}>Remarks</th>
                      <th style={{ padding: '10px' }}>Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerDetails?.payouts?.length === 0 ? (
                      <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>No payout records found.</td></tr>
                    ) : (
                      sellerDetails?.payouts?.map((p) => (
                        <tr key={p._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '10px', color: 'var(--text-dim)' }}>{safeFormatDate(p.date || p.createdAt)}</td>
                          <td style={{ padding: '10px', fontWeight: 800, color: '#22c55e' }}>₹{safeFormatCurrency(p.amount)}</td>
                          <td style={{ padding: '10px' }}>{p.paymentMethod}</td>
                          <td style={{ padding: '10px', fontFamily: 'monospace' }}>{p.utrReference || p.transactionId || '—'}</td>
                          <td style={{ padding: '10px' }}>{p.adminName || 'Admin'}</td>
                          <td style={{ padding: '10px', color: 'var(--text-dim)' }}>{p.remarks || '—'}</td>
                          <td style={{ padding: '10px' }}>
                            {p.proofUrl ? (
                              <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                View Proof
                              </a>
                            ) : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sellerDetails?.auditLogs?.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>No audit entries recorded for this seller.</div>
                  ) : (
                    sellerDetails?.auditLogs?.map((a) => (
                      <div key={a._id} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>{a.action}</span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '12px', marginLeft: '10px' }}>{safeFormatDateTime(a.date || a.createdAt)}</span>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {a.remarks || `Changed status from ${a.previousStatus} to ${a.updatedStatus}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px' }}>₹{safeFormatCurrency(a.amount)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>By {a.adminName || 'Admin'}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 3: ORDER STATUS ACTION MODAL (COD / ONLINE) */}
      {/* -------------------------------------------------------------------- */}
      {showOrderActionModal && selectedOrderAction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '480px',
            borderRadius: '24px',
            padding: '28px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowOrderActionModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>
              Confirm Payment Action
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: '0 0 20px 0' }}>
              Order #{selectedOrderAction.order.orderRef} • Amount: ₹{selectedOrderAction.order.orderAmount || selectedOrderAction.order.onlinePaymentAmount}
            </p>

            <form onSubmit={handleOrderActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '12px', fontSize: '13px' }}>
                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Action: </span>
                <span>{selectedOrderAction.action.replace('_', ' ')}</span>
              </div>

              {selectedOrderAction.type === 'cod' && selectedOrderAction.action === 'MARK_COLLECTED' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                    COLLECTED AMOUNT (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    className="input-field"
                    style={{ height: '42px', fontSize: '14px' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  REFERENCE NUMBER (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gateway transaction ID or Driver slip no"
                  value={actionReference}
                  onChange={(e) => setActionReference(e.target.value)}
                  className="input-field"
                  style={{ height: '42px', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  ADMIN REMARKS
                </label>
                <textarea
                  placeholder="Add notes for audit trail..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  className="input-field"
                  rows="3"
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowOrderActionModal(false)}
                  style={{
                    flex: '1',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-dim)',
                    border: '1px solid var(--glass-border)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{
                    flex: '2',
                    height: '44px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  <span>Confirm Action</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 4: INVOICE GENERATION (PRESERVED) */}
      {/* -------------------------------------------------------------------- */}
      {showSellerInvoicesModal && selectedMerchant && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '500px',
            borderRadius: '24px',
            padding: '28px',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowSellerInvoicesModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>
              Generate Seller Invoice
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px', margin: 0 }}>
                For {selectedMerchant.seller.name}
              </p>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                padding: '3px 8px', 
                borderRadius: '8px',
                background: (selectedMerchant.orderCount || selectedMerchant.deliveredOrderCount || 0) > 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: (selectedMerchant.orderCount || selectedMerchant.deliveredOrderCount || 0) > 0 ? '#22c55e' : '#ef4444'
              }}>
                {selectedMerchant.orderCount || selectedMerchant.deliveredOrderCount || 0} Delivered Orders
              </span>
            </div>

            {(selectedMerchant.orderCount || selectedMerchant.deliveredOrderCount || 0) === 0 ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: '1.5',
                marginBottom: '16px'
              }}>
                <strong>Cannot Generate Invoice:</strong> This merchant partner currently has 0 delivered orders. Commercial invoices require delivered orders with valid delivery timestamps.
              </div>
            ) : null}

            <form onSubmit={handleGenerateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  INVOICE NUMBER *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1, 2, 3..."
                  value={generateInvoiceNumber}
                  onChange={(e) => setGenerateInvoiceNumber(e.target.value)}
                  className="input-field"
                  style={{ height: '42px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                    START DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={generateStartDate}
                    onChange={(e) => setGenerateStartDate(e.target.value)}
                    className="input-field"
                    style={{ height: '42px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                    END DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={generateEndDate}
                    onChange={(e) => setGenerateEndDate(e.target.value)}
                    className="input-field"
                    style={{ height: '42px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSellerInvoicesModal(false)}
                  style={{
                    flex: '1',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-dim)',
                    border: '1px solid var(--glass-border)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={generateLoading || (selectedMerchant.orderCount || selectedMerchant.deliveredOrderCount || 0) === 0}
                  className="btn-primary"
                  style={{
                    flex: '2',
                    height: '44px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: generateLoading || (selectedMerchant.orderCount || selectedMerchant.deliveredOrderCount || 0) === 0 ? 'not-allowed' : 'pointer',
                    opacity: (selectedMerchant.orderCount || selectedMerchant.deliveredOrderCount || 0) === 0 ? 0.5 : 1
                  }}
                >
                  {generateLoading ? <Loader2 className="animate-spin" size={16} /> : <FilePlus size={16} />}
                  <span>Generate Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
