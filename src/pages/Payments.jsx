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
  FilePlus
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Payments = () => {
  const [merchants, setMerchants] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Outstanding clear modal states
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [clearAmount, setClearAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionId, setTransactionId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  
  // History modal states
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState({ payouts: [], sales: [] });
  const [historyTab, setHistoryTab] = useState('payouts');

  // Seller Invoices States
  const [sellerInvoices, setSellerInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  
  // Specific Seller Invoices Modal
  const [showSellerInvoicesModal, setShowSellerInvoicesModal] = useState(false);
  
  // Generate Invoice State
  const [generateStartDate, setGenerateStartDate] = useState('');
  const [generateEndDate, setGenerateEndDate] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);

  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchData = async () => {
    try {
      setFetchLoading(true);
      setInvoicesLoading(true);
      const [merchantsRes, invoicesRes] = await Promise.all([
        api.get('/payments/sellers'),
        api.get('/seller-invoices/admin/all')
      ]);
      setMerchants(merchantsRes.data);
      setSellerInvoices(invoicesRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setNotification({ type: 'error', message: 'Failed to load payment information.' });
    } finally {
      setFetchLoading(false);
      setInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
  
  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    if (!generateStartDate || !generateEndDate) {
      alert("Please select start and end dates.");
      return;
    }
    
    setGenerateLoading(true);
    try {
      await api.post('/seller-invoices/generate', {
        sellerId: selectedMerchant.seller._id,
        startDate: generateStartDate,
        endDate: generateEndDate
      });
      setNotification({ type: 'success', message: 'Invoice generated successfully!' });
      
      // Refresh invoices
      const invoicesRes = await api.get('/seller-invoices/admin/all');
      setSellerInvoices(invoicesRes.data);
      
      setGenerateStartDate('');
      setGenerateEndDate('');
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to generate invoice' });
    } finally {
      setGenerateLoading(false);
    }
  };

  const openClearModal = (merchantData) => {
    setSelectedMerchant(merchantData);
    setClearAmount(merchantData.outstandingBalance.toFixed(2));
    setPaymentMethod('UPI');
    setTransactionId('');
    setRemarks('');
    setShowClearModal(true);
  };

  const openHistoryModal = async (merchantData) => {
    setSelectedMerchant(merchantData);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryTab('payouts');
    try {
      const { data } = await api.get(`/payments/sellers/${merchantData.seller._id}/history`);
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      setNotification({ type: 'error', message: 'Failed to retrieve payment history logs.' });
    } finally {
      setHistoryLoading(false);
    }
  };
  
  const openSellerInvoicesModal = (merchantData) => {
    setSelectedMerchant(merchantData);
    
    // Set default dates for generation (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setGenerateStartDate(start.toISOString().split('T')[0]);
    setGenerateEndDate(end.toISOString().split('T')[0]);
    
    setShowSellerInvoicesModal(true);
  };

  const handleClearPayment = async (e) => {
    e.preventDefault();
    if (!selectedMerchant || !clearAmount || parseFloat(clearAmount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setClearLoading(true);
    setNotification({ type: '', message: '' });
    try {
      await api.post('/payments/clear', {
        sellerId: selectedMerchant.seller._id,
        amount: parseFloat(clearAmount),
        paymentMethod,
        transactionId,
        remarks
      });

      setNotification({ 
        type: 'success', 
        message: `Successfully cleared payout of ₹${parseFloat(clearAmount).toLocaleString('en-IN')} for ${selectedMerchant.seller.name}!` 
      });
      setShowClearModal(false);
      
      // Refresh merchants data
      const { data } = await api.get('/payments/sellers');
      setMerchants(data);
      
      // Update selectedMerchant in place to keep the modal data fresh
      const updated = data.find(m => m.seller._id === selectedMerchant.seller._id);
      if (updated) setSelectedMerchant(updated);
      
    } catch (err) {
      console.error('Clear payment failed:', err);
      setNotification({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to record seller payout.' 
      });
    } finally {
      setClearLoading(false);
    }
  };

  const filteredMerchants = merchants.filter(m => 
    m.seller.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.seller.businessName && m.seller.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    m.seller.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportPayments = () => {
    const exportData = filteredMerchants.map(item => ({
      'Merchant ID': item.seller._id,
      'Merchant Name': item.seller.name,
      'Business/Store Name': item.seller.businessName || item.seller.storeName || 'No Store',
      'Total Sales (₹)': item.totalSales,
      'Total Settled (₹)': item.totalPaid,
      'Outstanding Dues (₹)': item.outstandingBalance,
      'Delivered Orders Count': item.orderCount,
      'Payouts Cleared Count': item.payoutCount,
      'Invoices Generated': sellerInvoices.filter(inv => inv.sellerId?._id === item.seller._id).length
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seller Payments");
    XLSX.writeFile(wb, "Zudo_Seller_Payments_Ledger.xlsx");
  };

  // Aggregated Stats
  const totalSalesAll = merchants.reduce((sum, m) => sum + m.totalSales, 0);
  const totalSettledAll = merchants.reduce((sum, m) => sum + m.totalPaid, 0);
  const totalOutstandingAll = merchants.reduce((sum, m) => sum + m.outstandingBalance, 0);

  // Helper for current selected seller invoices
  const currentSellerInvoices = selectedMerchant ? sellerInvoices.filter(inv => inv.sellerId?._id === selectedMerchant.seller._id) : [];
  const currentInvoicedAmount = currentSellerInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const currentRemainingAmount = selectedMerchant ? selectedMerchant.outstandingBalance - currentInvoicedAmount : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Seller Payments</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Monitor gross vendor sales, manage invoices, and settle payouts</p>
        </div>
        <button 
          onClick={exportPayments} 
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
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {[
          { label: 'Cumulative Gross Sales', value: `₹${totalSalesAll.toLocaleString('en-IN')}`, icon: Activity, color: '#6366f1' },
          { label: 'Total Payouts Settled', value: `₹${totalSettledAll.toLocaleString('en-IN')}`, icon: CheckCircle2, color: '#22c55e' },
          { label: 'Outstanding Balance', value: `₹${totalOutstandingAll.toLocaleString('en-IN')}`, icon: Wallet, color: '#f59e0b' },
          { label: 'Partner Merchants', value: merchants.length, icon: Users, color: '#ec4899' },
        ].map((stat, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
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

      {/* Notification Banner */}
      {notification.message && (
        <div style={{ 
          background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          border: `1px solid ${notification.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, 
          color: notification.type === 'success' ? '#22c55e' : '#ef4444', 
          padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{notification.message}</span>
          <button 
            onClick={() => setNotification({ type: '', message: '' })} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dim)' }} />
          <input 
            type="text" 
            placeholder="Search merchants by name, store or email address..." 
            className="input-field" 
            style={{ paddingLeft: '48px', height: '48px', borderRadius: '16px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="glass-card" style={{ padding: '0 20px', borderRadius: '16px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Filter size={18} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Filters</span>
        </button>
      </div>

      {/* Payments Matrix Table */}
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
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Merchant Partner</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Sales</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Settled Amount</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Outstanding Dues</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Invoices</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMerchants.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '100px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ opacity: 0.5, marginBottom: '16px' }}><Wallet size={48} style={{ margin: '0 auto' }} /></div>
                      <p style={{ fontWeight: 500 }}>No merchants found with payment configurations.</p>
                    </td>
                  </tr>
                ) : (
                  filteredMerchants.map((item) => {
                    const hasDues = item.outstandingBalance > 0;
                    const merchantInvoicesCount = sellerInvoices.filter(inv => inv.sellerId?._id === item.seller._id).length;
                    
                    return (
                      <tr key={item.seller._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: '0.2s', cursor: 'pointer' }} className="hover-row" onClick={() => openSellerInvoicesModal(item)}>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ 
                              width: '44px', height: '44px', borderRadius: '14px', 
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                              color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontWeight: 700, fontSize: '18px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}>
                              {item.seller.name[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.seller.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {item.seller.businessName || item.seller.storeName || 'No Store Registered'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ fontWeight: 600, fontSize: '15px' }}>
                            ₹{item.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {item.orderCount} delivered {item.orderCount === 1 ? 'order' : 'orders'}
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: '#22c55e' }}>
                            ₹{item.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {item.payoutCount} payout {item.payoutCount === 1 ? 'record' : 'records'}
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ 
                            fontWeight: 700, 
                            fontSize: '15px', 
                            color: hasDues ? '#f59e0b' : 'var(--text-dim)' 
                          }}>
                            ₹{item.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '11px', marginTop: '4px' }}>
                            {hasDues ? (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}>Action Required</span>
                            ) : (
                              <span style={{ color: '#22c55e', fontWeight: 600 }}>Settled</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                           <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--primary)' }}>
                              {merchantInvoicesCount} {merchantInvoicesCount === 1 ? 'Invoice' : 'Invoices'}
                           </div>
                        </td>
                        <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px' }}>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openHistoryModal(item); }}
                              className="glass-card"
                              style={{ 
                                border: 'none', color: 'var(--text-main)', 
                                padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', 
                                fontSize: '12px', fontWeight: 600, display: 'inline-flex', 
                                alignItems: 'center', gap: '6px', transition: '0.2s'
                              }}
                            >
                              <History size={14} /> Audit
                            </button>
                            <button 
                              className="btn-primary"
                              onClick={(e) => { e.stopPropagation(); openSellerInvoicesModal(item); }}
                              style={{ 
                                padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', 
                                fontSize: '12px', fontWeight: 700, display: 'inline-flex', 
                                alignItems: 'center', gap: '6px', transition: '0.2s'
                              }}
                            >
                              <Receipt size={14} /> View Details
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
        )}
      </div>

      {/* Seller Invoices Modal */}
      {showSellerInvoicesModal && selectedMerchant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '36px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
            <div style={{ padding: '28px 40px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>Seller Invoices & Payouts</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Manage invoices and clear dues for {selectedMerchant.seller.businessName || selectedMerchant.seller.name}</p>
              </div>
              <button onClick={() => setShowSellerInvoicesModal(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '10px', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '32px 40px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
              
              {/* Top Section: Stats & Generate Invoice */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'rgba(99, 102, 241, 0.05)' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Outstanding Balance</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                      ₹{selectedMerchant.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Invoiced Amount</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                        ₹{currentInvoicedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Remaining Uninvoiced</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        ₹{currentRemainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Invoice Form */}
                <div className="glass-card" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FilePlus size={18} color="var(--primary)" /> Generate New Invoice
                  </h4>
                  <form onSubmit={handleGenerateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>START DATE</label>
                        <input 
                          type="date" 
                          className="input-field"
                          value={generateStartDate}
                          onChange={e => setGenerateStartDate(e.target.value)}
                          required
                          style={{ padding: '10px 14px' }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>END DATE</label>
                        <input 
                          type="date" 
                          className="input-field"
                          value={generateEndDate}
                          onChange={e => setGenerateEndDate(e.target.value)}
                          required
                          style={{ padding: '10px 14px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                       <button 
                         type="submit" 
                         disabled={generateLoading}
                         className="btn-primary" 
                         style={{ 
                           padding: '12px 24px', borderRadius: '12px', border: 'none', 
                           background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', 
                           fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                         }}
                       >
                         {generateLoading ? <Loader2 className="animate-spin" size={16} /> : <Receipt size={16} />}
                         <span>Generate Invoice</span>
                       </button>

                       {selectedMerchant.outstandingBalance > 0 && (
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); openClearModal(selectedMerchant); }}
                            className="btn-primary"
                            style={{ 
                              padding: '12px 24px', borderRadius: '12px', cursor: 'pointer', 
                              fontSize: '13px', fontWeight: 700, display: 'inline-flex', 
                              alignItems: 'center', gap: '6px', transition: '0.2s'
                            }}
                          >
                            <ArrowUpRight size={16} /> Clear General Dues
                          </button>
                        )}
                    </div>
                  </form>
                </div>

              </div>

              {/* Invoices List */}
              <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Generated Invoices ({currentSellerInvoices.length})</h4>
              
              <div style={{ borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.1)' }}>
                      <th style={{ padding: '16px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>PERIOD</th>
                      <th style={{ padding: '16px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>AMOUNT / ORDERS</th>
                      <th style={{ padding: '16px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>STATUS</th>
                      <th style={{ padding: '16px 20px', color: 'var(--text-dim)', fontSize: '12px', fontWeight: 600 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesLoading ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center' }}>
                          <Loader2 className="animate-spin" size={24} style={{ display: 'inline-block' }} />
                        </td>
                      </tr>
                    ) : currentSellerInvoices.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No invoices generated for this seller yet.
                        </td>
                      </tr>
                    ) : currentSellerInvoices.map((inv) => (
                      <tr key={inv._id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover hover-row">
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                            <Calendar size={14} color="var(--primary)" />
                            {new Date(inv.startDate).toLocaleDateString()} - {new Date(inv.endDate).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            Generated on: {new Date(inv.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px' }}>₹{inv.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{inv.orderCount} Orders</div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
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
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={() => handleDownloadInvoice(inv._id)}
                              className="btn-primary"
                              style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
                              title="Download PDF"
                            >
                              <Download size={16} />
                            </button>
                            {inv.status !== 'Cleared' && (
                              <button 
                                onClick={() => handleClearInvoice(inv._id)}
                                className="btn-primary"
                                style={{ padding: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'none', cursor: 'pointer', borderRadius: '8px' }}
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
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Clear Payment Modal */}
      {showClearModal && selectedMerchant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', borderRadius: '36px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
            <div style={{ padding: '28px 40px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Record Payout</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Clear outstanding balance for {selectedMerchant.seller.name}</p>
              </div>
              <button onClick={() => setShowClearModal(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '10px', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleClearPayment}>
              <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Dues Alert Banner */}
                <div style={{ display: 'flex', gap: '12px', background: 'rgba(245, 158, 11, 0.1)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <Info size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Outstanding Due</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                      ₹{selectedMerchant.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Payout Amount (INR)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '12px', fontSize: '18px', fontWeight: 700, color: 'var(--text-dim)' }}>₹</span>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      className="input-field" 
                      style={{ paddingLeft: '32px' }}
                      required 
                      value={clearAmount} 
                      onChange={e => setClearAmount(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Grid for Method and Reference */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Payment Method</label>
                    <select 
                      className="input-field" 
                      style={{ background: 'var(--input-bg)' }}
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                    >
                      <option value="UPI">UPI / Google Pay</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cash">Cash Payment</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>UTR / Reference ID</label>
                    <input 
                      type="text" 
                      placeholder="Transaction Ref No." 
                      className="input-field" 
                      value={transactionId} 
                      onChange={e => setTransactionId(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Remarks / Internal Notes</label>
                  <textarea 
                    placeholder="Provide additional reconciliation details..." 
                    className="input-field" 
                    rows="3"
                    style={{ height: 'auto', padding: '12px 16px', resize: 'none' }}
                    value={remarks} 
                    onChange={e => setRemarks(e.target.value)} 
                  />
                </div>

                {/* Action button */}
                <button 
                  type="submit" 
                  disabled={clearLoading}
                  className="btn-primary" 
                  style={{ 
                    width: '100%', padding: '16px', borderRadius: '18px', border: 'none', 
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                    color: 'var(--text-main)', fontWeight: 800, cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)',
                    marginTop: '8px'
                  }}
                >
                  {clearLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Record Payment Clear</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History & Audit Logs Modal */}
      {showHistoryModal && selectedMerchant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '780px', borderRadius: '36px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
            <div style={{ padding: '28px 40px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Financial Audit Registry</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Reconciliation ledgers for {selectedMerchant.seller.name}</p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '10px', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '32px 40px' }}>
              {/* Stats Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px', background: 'var(--input-bg)', padding: '16px 24px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Gross Sales Revenue</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>
                    ₹{selectedMerchant.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Settled Payouts</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>
                    ₹{selectedMerchant.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current Outstanding Due</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: selectedMerchant.outstandingBalance > 0 ? '#f59e0b' : 'var(--text-main)', marginTop: '4px' }}>
                    ₹{selectedMerchant.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Tabs selector */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '20px' }}>
                <button 
                  onClick={() => setHistoryTab('payouts')}
                  style={{
                    background: historyTab === 'payouts' ? 'var(--primary)' : 'transparent',
                    color: historyTab === 'payouts' ? '#fff' : 'var(--text-dim)',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: '0.2s'
                  }}
                >
                  Payout Logs ({historyData.payouts?.length || 0})
                </button>
                <button 
                  onClick={() => setHistoryTab('sales')}
                  style={{
                    background: historyTab === 'sales' ? 'var(--primary)' : 'transparent',
                    color: historyTab === 'sales' ? '#fff' : 'var(--text-dim)',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: '0.2s'
                  }}
                >
                  Sales Breakdown ({historyData.sales?.length || 0})
                </button>
              </div>

              {/* Tab Content window */}
              {historyLoading ? (
                <div style={{ height: '240px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Loader2 className="animate-spin" size={32} color="#6366f1" />
                </div>
              ) : (
                <div style={{ maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                  {historyTab === 'payouts' ? (
                    <div>
                      {(!historyData.payouts || historyData.payouts.length === 0) ? (
                        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                          No historical payout records discovered.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-dim)' }}>
                              <th style={{ padding: '12px 8px', fontWeight: 700 }}>Payment Date</th>
                              <th style={{ padding: '12px 8px', fontWeight: 700 }}>Settlement Channel</th>
                              <th style={{ padding: '12px 8px', fontWeight: 700 }}>Transaction Ref. / UTR</th>
                              <th style={{ padding: '12px 8px', fontWeight: 700 }}>Remarks</th>
                              <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>Amount Paid</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.payouts.map((p) => (
                              <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '12px 8px' }}>{new Date(p.date || p.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                <td style={{ padding: '12px 8px', fontWeight: 600 }}>{p.paymentMethod}</td>
                                <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-dim)' }}>{p.transactionId || 'N/A'}</td>
                                <td style={{ padding: '12px 8px', color: 'var(--text-dim)' }}>{p.remarks || '-'}</td>
                                <td style={{ padding: '12px 8px', fontWeight: 700, color: '#22c55e', textAlign: 'right' }}>₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ) : (
                    <div>
                      {(!historyData.sales || historyData.sales.length === 0) ? (
                        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                          No reconciled gross sales logs discovered.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-dim)' }}>
                              <th style={{ padding: '12px 8px', fontWeight: 700 }}>Order Date</th>
                              <th style={{ padding: '12px 8px', fontWeight: 700 }}>Order ID</th>
                              <th style={{ padding: '12px 8px', fontWeight: 700 }}>Product Name</th>
                              <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center' }}>Qty</th>
                              <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }}>Total Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.sales.map((s, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={{ padding: '12px 8px' }}>{new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-dim)' }}>#{s.orderId.slice(-6).toUpperCase()}</td>
                                <td style={{ padding: '12px 8px', fontWeight: 600 }}>{s.productName}</td>
                                <td style={{ padding: '12px 8px', textAlign: 'center' }}>{s.quantity}</td>
                                <td style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>₹{s.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
