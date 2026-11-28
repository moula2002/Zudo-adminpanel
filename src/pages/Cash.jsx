import toast from 'react-hot-toast';
import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/api';
import {
  Plus,
  Search,
  Filter,
  CreditCard,
  User,
  Phone,
  Mail,
  Building2,
  ChevronRight,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  IndianRupee,
  Clock,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Edit3,
  Trash2,
  Eye,
  RefreshCcw,
  LayoutGrid,
  Table,
  Copy,
  Check,
  MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Cash = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editId, setEditId] = useState(null);
  const [deleteModalData, setDeleteModalData] = useState({ show: false, id: null });
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState(null);

  // Search, Filter & View States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'cards' : 'table'));
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  const [formData, setFormData] = useState({
    type: 'B2B',
    name: '',
    phone: '',
    email: '',
    password: '',
    otp: '',
    orderId: '',
    collectorKey: '',
    description: '',
    paymentMethod: 'Cash',
    locationId: ''
  });

  const [reconciliation, setReconciliation] = useState({
    summary: {
      totalExpectedCash: 0,
      totalCashCollected: 0,
      totalPendingCash: 0,
      collectionProgress: 0,
      totalAssignedTasks: 0,
      completedCount: 0,
      partialCount: 0,
      pendingCount: 0,
      failedCancelledCount: 0
    },
    collectorSummaries: [],
    tasks: [],
    eligibleOrders: [],
    collectors: []
  });
  const [taskFilter, setTaskFilter] = useState('All');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState('All');
  const [historyModalTask, setHistoryModalTask] = useState(null);

  const [drivers, setDrivers] = useState([]);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [collectSuccess, setCollectSuccess] = useState(false);
  const [currentDepositId, setCurrentDepositId] = useState(null);
  const [pendingDeposits, setPendingDeposits] = useState([]); // Array of pending deposit objects
  const [depositAmount, setDepositAmount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchDrivers();
    fetchPendingDeposits();
    fetchLocations();
    fetchReconciliation();
  }, []);

  const fetchReconciliation = async () => {
    try {
      const { data } = await axios.get('cashcollectors/reconciliation', { skipCache: true });
      if (data && data.summary) {
        setReconciliation(data);
      }
    } catch (error) {
      console.error('Error fetching cash reconciliation:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchTransactions(),
        fetchDrivers(),
        fetchPendingDeposits(),
        fetchLocations()
      ]);
      toast.success('Cash collection records updated');
    } catch (e) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const { data } = await axios.get('locations/active');
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Error fetching active locations:', error);
    }
  };

  const fetchPendingDeposits = async () => {
    try {
      const { data } = await axios.get('deposits/all/pending');
      setPendingDeposits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching pending deposits:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data } = await axios.get('cash');
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // Safe Date Formatter
  const formatDateTime = (dateVal) => {
    if (!dateVal) return { date: '—', time: '—', full: '—' };
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return { date: '—', time: '—', full: '—' };
    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      full: d.toLocaleString()
    };
  };

  // Status Badge Helper
  const getStatusBadge = (status) => {
    const s = (status || 'Settled').toLowerCase();
    if (s === 'settled' || s === 'completed' || s === 'verified' || s === 'active') {
      return {
        bg: 'rgba(34, 197, 94, 0.12)',
        color: '#22c55e',
        label: status === 'active' ? 'Settled' : (status || 'Settled')
      };
    }
    if (s === 'pending') {
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#f59e0b',
        label: 'Pending'
      };
    }
    return {
      bg: 'rgba(148, 163, 184, 0.12)',
      color: '#94a3b8',
      label: status || 'Recorded'
    };
  };

  const fetchDrivers = async () => {
    try {
      const { data } = await axios.get('drivers');
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedTxId(id);
    toast.success(`Copied ${text}`);
    setTimeout(() => setCopiedTxId(null), 2000);
  };

  const handleCollectClick = (driver, existingDeposit = null) => {
    setSelectedDriver(driver);
    setCollectSuccess(false);

    let otp = '';
    let amount = driver?.wallet || 0;
    let depositId = null;

    const deposit = existingDeposit || pendingDeposits.find(d => 
      (d.driverId?._id || d.driverId) === driver?._id
    );

    if (deposit) {
      otp = deposit.otp ? String(deposit.otp) : '';
      amount = deposit.amount !== undefined ? deposit.amount : (driver?.wallet || 0);
      depositId = deposit._id;
    } else {
      otp = driver?.otp ? String(driver.otp) : Math.floor(100000 + Math.random() * 900000).toString();
      amount = driver?.wallet || 0;
    }

    setGeneratedOtp(otp);
    setDepositAmount(amount);
    setCurrentDepositId(depositId);
    // Pre-fill the OTP so the admin can verify & settle with 1 click
    setEnteredOtp(otp);
    setShowCollectModal(true);
  };

  const verifyOtp = async () => {
    setVerifying(true);
    try {
      const cleanEnteredOtp = (enteredOtp || '').toString().trim();
      const cleanGeneratedOtp = (generatedOtp || '').toString().trim();

      if (!cleanEnteredOtp) {
        toast.error('Please enter the 6-digit verification OTP');
        setVerifying(false);
        return;
      }

      let isVerified = false;

      if (currentDepositId) {
        // Atomic server-side OTP verification + single wallet debit inside MongoDB transaction
        await axios.put(`deposits/${currentDepositId}/status`, {
          status: 'Approved',
          otp: cleanEnteredOtp
        });
        isVerified = true;
      } else if (selectedDriver?.cashManagement) {
        const { data } = await axios.post('drivers/verify-otp', {
          driverId: selectedDriver._id,
          otp: cleanEnteredOtp
        });
        isVerified = Boolean(data?.success);
      } else {
        isVerified = cleanEnteredOtp === cleanGeneratedOtp;
      }

      if (isVerified) {
        const isB2BDriver = (selectedDriver?.type || '').toUpperCase() === 'B2B';
        const txType = isB2BDriver ? 'B2B' : 'B2C (Driver)';

        let transaction = null;
        try {
          const cashPayload = {
            type: txType,
            name: selectedDriver?.name || 'Driver Settlement',
            phone: selectedDriver?.phone || '9999999999',
            amount: Number(depositAmount) || 0,
            description: `Settled with driver ${selectedDriver?.name || ''}${cleanEnteredOtp ? ` (OTP: ${cleanEnteredOtp})` : ''}`,
            paymentMethod: 'Cash',
            driverId: selectedDriver?._id,
            otp: cleanEnteredOtp
          };
          const res = await axios.post('cash', cashPayload);
          transaction = res.data;
        } catch (err) {
          console.warn('POST api/cash note:', err.response?.data?.message || err.message);
        }

        if (transaction) {
          setTransactions(prev => [transaction, ...prev]);
        }

        // Only update driver wallet directly when settling manually without a Deposit record
        // (Deposit settlement already debited driver.wallet atomically on the server)
        if (!currentDepositId && selectedDriver._id) {
          try {
            await axios.put(`drivers/${selectedDriver._id}`, {
              wallet: Math.max(0, (selectedDriver.wallet || 0) - Number(depositAmount || 0)),
              otp: ''
            });
          } catch (e) {
            console.warn('Driver wallet update warning:', e);
          }
        }

        setDrivers(prev => prev.map(d =>
          d._id === selectedDriver._id ? { ...d, wallet: Math.max(0, (d.wallet || 0) - Number(depositAmount || 0)), otp: '' } : d
        ));

        if (currentDepositId) {
          setPendingDeposits(prev => prev.filter(d =>
            d._id !== currentDepositId && (d.driverId?._id || d.driverId) !== selectedDriver._id
          ));
        }

        setCollectSuccess(true);
        toast.success(`Successfully collected ₹${depositAmount.toLocaleString()} from ${selectedDriver.name}`);

        setTimeout(async () => {
          setShowCollectModal(false);
          setCollectSuccess(false);
          try {
            await Promise.all([
              fetchPendingDeposits(),
              fetchDrivers(),
              fetchTransactions()
            ]);
          } catch (_) {}
        }, 1200);
      } else {
        toast.error('Invalid OTP. Please check the code and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      const message = error.response?.data?.message || 'Failed to process collection';
      toast.error(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleEditClick = (t) => {
    setEditId(t._id || t.id);
    setFormData({
      type: t.type === 'B2C (Driver)' || t.type === 'B2C Driver' ? 'B2C (Driver)' : t.type,
      name: t.name,
      phone: t.phone || '',
      email: t.email || '',
      password: '',
      otp: t.otp || '',
      amount: t.amount,
      description: t.description || '',
      paymentMethod: t.paymentMethod || 'Cash',
      status: t.status || 'Settled',
      locationId: t.locationId || t.location?._id || ''
    });
    setShowForm(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`cash/${deleteModalData.id}`);
      setTransactions(transactions.filter(t => (t._id || t.id) !== deleteModalData.id));
      if (viewingTransaction && (viewingTransaction._id || viewingTransaction.id) === deleteModalData.id) {
        setViewingTransaction(null);
      }
      setDeleteModalData({ show: false, id: null });
      toast.success('Transaction removed successfully');
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!editId && formData.orderId && formData.collectorKey) {
        const [collectorType, collectorId] = String(formData.collectorKey).split(':');
        await axios.post('cashcollectors/assign', {
          orderId: formData.orderId,
          collectorId,
          collectorType: collectorType || 'cash_collector',
          notes: formData.description || ''
        });
        toast.success('Cash collection assigned (expected amount synced from order)');
        setShowForm(false);
        await Promise.all([fetchReconciliation(), fetchTransactions()]);
      } else {
        const sanitizedPayload = {
          type: formData.type || 'B2B',
          name: formData.name,
          phone: formData.phone || '9999999999',
          description: formData.description || '',
          paymentMethod: formData.paymentMethod || 'Cash'
        };
        if (formData.orderId) sanitizedPayload.orderId = formData.orderId;
        if (formData.email) sanitizedPayload.email = formData.email;
        if (formData.password) sanitizedPayload.password = formData.password;

        if (editId) {
          const { data: updatedTx } = await axios.put(`cash/${editId}`, sanitizedPayload);
          setTransactions(transactions.map(t => (t._id || t.id) === editId ? updatedTx : t));
          setShowForm(false);
          setEditId(null);
          toast.success('Collection record updated');
        } else {
          const { data: transaction } = await axios.post('cash', sanitizedPayload);
          setTransactions([transaction, ...transactions]);
          setShowForm(false);
          toast.success('Cash collector record created (pending collection confirmation)');
        }
      }
      setFormData({
        type: 'B2B',
        name: '',
        phone: '',
        email: '',
        password: '',
        otp: '',
        orderId: '',
        collectorKey: '',
        description: '',
        paymentMethod: 'Cash',
        status: 'Pending',
        locationId: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || (editId ? 'Failed to update record' : 'Failed to create collection assignment'));
    } finally {
      setLoading(false);
    }
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (filterType !== 'All') {
      if (filterType === 'B2C (Driver)') {
        result = result.filter(t => t.type === 'B2C (Driver)' || t.type === 'B2C Driver');
      } else if (filterType === 'B2C') {
        result = result.filter(t => t.type === 'B2C');
      } else if (filterType === 'B2B') {
        result = result.filter(t => t.type === 'B2B');
      } else {
        result = result.filter(t => (t.type || '').toLowerCase() === filterType.toLowerCase());
      }
    }

    if (statusFilter !== 'All') {
      result = result.filter(t => {
        const s = (t.status || 'Settled').toLowerCase();
        if (statusFilter === 'Settled') {
          return s === 'settled' || s === 'completed' || s === 'verified' || s === 'active';
        }
        return s === statusFilter.toLowerCase();
      });
    }

    if (locationFilter !== 'All') {
      result = result.filter(t => {
        const loc = (t.locationName || t.location?.city || t.locationId || '').toString().toLowerCase();
        return loc.includes(locationFilter.toLowerCase());
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(t => {
        const name = (t.name || '').toLowerCase();
        const driverName = (t.driverId?.name || '').toLowerCase();
        const phone = (t.phone || t.driverId?.phone || '').toLowerCase();
        const email = (t.email || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const type = (t.type || '').toLowerCase();
        const status = (t.status || '').toLowerCase();
        const method = (t.paymentMethod || '').toLowerCase();
        const location = (t.locationName || t.location?.city || '').toLowerCase();
        const otp = String(t.otp || '');
        const amount = String(t.amount || '');
        const id = String(t._id || t.id || '').toLowerCase();
        return name.includes(term) || driverName.includes(term) || phone.includes(term) || email.includes(term) || desc.includes(term) || type.includes(term) || status.includes(term) || method.includes(term) || location.includes(term) || otp.includes(term) || amount.includes(term) || id.includes(term);
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt || 0).getTime();
      const dateB = new Date(b.date || b.createdAt || 0).getTime();
      if (sortBy === 'oldest') {
        return dateA - dateB;
      } else if (sortBy === 'highest') {
        return Number(b.amount || 0) - Number(a.amount || 0);
      } else if (sortBy === 'lowest') {
        return Number(a.amount || 0) - Number(b.amount || 0);
      }
      // 'newest' default
      return dateB - dateA;
    });

    return result;
  }, [transactions, filterType, statusFilter, locationFilter, searchTerm, sortBy]);

  const exportTransactions = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions available to export');
      return;
    }
    const exportData = filteredTransactions.map((t, index) => {
      const dt = formatDateTime(t.date || t.createdAt);
      return {
        'SL No': index + 1,
        'Transaction ID': t._id || t.id,
        'Client / Payee': t.name,
        'Phone Number': t.phone || (t.driverId?.phone) || '—',
        'Email': t.email || '—',
        'Flow Type': t.type,
        'Date & Time': dt.full,
        'Verification': t.type === 'B2B' ? 'Password Verified' : (t.otp ? `OTP: ${t.otp}` : (t.verification || 'Verified')),
        'Settlement Status': t.status || 'Settled',
        'Amount (₹)': Number(t.amount || 0),
        'Payment Method': t.paymentMethod || 'Cash',
        'Description / Notes': t.description || '—'
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cash_Logs");
    XLSX.writeFile(wb, `Zudo_Cash_Collection_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Cash collection logs exported');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '32px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Cash Collection Logs</h1>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
              Financial Audit
            </span>
          </div>
          <p style={{ fontSize: isMobile ? '12px' : '14px', color: 'var(--text-dim)', marginTop: '4px' }}>Log, verify, and monitor B2B and B2C manual cash receipts and driver settlements</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-primary"
            style={{
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '14px',
              fontSize: '13px',
              flex: isMobile ? '1 1 calc(50% - 5px)' : 'none'
            }}
            title="Refresh All Records"
          >
            <RefreshCcw size={16} className={refreshing ? 'animate-spin' : ''} style={{ color: 'var(--primary)' }} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={exportTransactions}
            className="btn-primary"
            style={{
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '14px',
              fontSize: '13px',
              flex: isMobile ? '1 1 calc(50% - 5px)' : 'none'
            }}
            title="Export to Excel Spreadsheet"
          >
            <Download size={16} /> <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setFormData({ type: 'B2B', name: '', phone: '', email: '', password: '', otp: '', orderId: '', collectorKey: '', description: '', paymentMethod: 'Cash', status: 'Pending', locationId: '' });
              setShowForm(true);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 8px 18px -6px rgba(99, 102, 241, 0.5)',
              transition: '0.2s',
              flex: isMobile ? '1 1 100%' : 'none'
            }}
          >
            <Plus size={18} />
            <span>Assign / Log Collection</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards - B2B First Priority */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Total B2B Cash</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-main)' }}>
              ₹{transactions.filter(t => (t.type || '').startsWith('B2B')).reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString('en-IN')}
            </h2>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Total B2C Cash</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-main)' }}>
              ₹{transactions.filter(t => (t.type || '').startsWith('B2C')).reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString('en-IN')}
            </h2>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Pending Deposits</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: '#f59e0b' }}>
              ₹{pendingDeposits.reduce((acc, d) => acc + (d.amount || 0), 0).toLocaleString('en-IN')}
            </h2>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '20px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Wallet size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Driver Wallets (B2B & B2C)</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-main)' }}>
              ₹{drivers.reduce((acc, d) => acc + (Number(d.wallet) > 0 ? Number(d.wallet) : 0), 0).toLocaleString('en-IN')}
            </h2>
          </div>
        </div>
      </div>

      {/* Automatic Cash Collection & Reconciliation Overview */}
      <div className="glass-card" style={{ padding: '22px 24px', borderRadius: '24px', border: '1px solid rgba(99, 102, 241, 0.28)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Automatic Cash Collection & Reconciliation
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
              Expected amounts are derived from orders; collected amounts update automatically when Cash Collectors confirm in-app
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#6366f1', background: 'rgba(99, 102, 241, 0.14)', padding: '5px 12px', borderRadius: '10px' }}>
              Collection Progress: {reconciliation.summary.collectionProgress}%
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Expected Cash</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>₹{Number(reconciliation.summary.totalExpectedCash || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' }}>Total Cash Collected</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#22c55e', marginTop: '4px' }}>₹{Number(reconciliation.summary.totalCashCollected || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Total Pending Cash</div>
            <div style={{ fontSize: '19px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>₹{Number(reconciliation.summary.totalPendingCash || 0).toLocaleString('en-IN')}</div>
          </div>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tasks Breakdown</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: '#22c55e' }}>✓ {reconciliation.summary.completedCount} Done</span>
              <span style={{ color: '#3b82f6' }}>◐ {reconciliation.summary.partialCount} Partial</span>
              <span style={{ color: '#f59e0b' }}>◷ {reconciliation.summary.pendingCount} Pending</span>
              <span style={{ color: '#ef4444' }}>✕ {reconciliation.summary.failedCancelledCount} Failed</span>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: 'rgba(148, 163, 184, 0.16)', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ width: `${reconciliation.summary.collectionProgress || 0}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #22c55e)', transition: 'width 0.4s ease' }} />
        </div>

        {/* Cash Collector-wise Summary */}
        <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 10px' }}>Cash Collector-wise Summary</h4>
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Collector / Driver</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Tasks</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Expected</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Collected</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Pending</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Done / Pending / Failed</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.collectorSummaries.filter(cs => selectedDriverFilter === 'All' || cs.collectorId === selectedDriverFilter).length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '18px', textAlign: 'center', color: 'var(--text-dim)' }}>No assigned cash collection tasks yet.</td></tr>
              ) : reconciliation.collectorSummaries.filter(cs => selectedDriverFilter === 'All' || cs.collectorId === selectedDriverFilter).map(cs => (
                <tr key={cs.collectorId} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{cs.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{cs.role} • {cs.type} {cs.phone ? `• ${cs.phone}` : ''}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>{cs.assignedTasks}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700 }}>₹{Number(cs.totalExpected || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#22c55e' }}>₹{Number(cs.totalCollected || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f59e0b' }}>₹{Number(cs.totalPending || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 12px', fontSize: '11.5px' }}>
                    <span style={{ color: '#22c55e', fontWeight: 700 }}>{cs.completedCount}</span> /{' '}
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{cs.pendingCount + cs.partialCount}</span> /{' '}
                    <span style={{ color: '#ef4444', fontWeight: 700 }}>{cs.failedCancelledCount}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                      background: cs.overallStatus === 'Completed' ? 'rgba(34,197,94,0.14)' : cs.overallStatus === 'Partial' ? 'rgba(59,130,246,0.14)' : 'rgba(245,158,11,0.14)',
                      color: cs.overallStatus === 'Completed' ? '#22c55e' : cs.overallStatus === 'Partial' ? '#3b82f6' : '#f59e0b'
                    }}>
                      {cs.overallStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order-wise Collection History */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Order-wise Collection History</h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="input-field"
              style={{ height: '30px', fontSize: '11.5px', padding: '0 10px', width: 'auto', minWidth: '170px' }}
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
            >
              <option value="All">All Drivers & Collectors</option>
              {reconciliation.collectorSummaries.map(cs => (
                <option key={cs.collectorId} value={cs.collectorId}>
                  {cs.name} ({cs.role})
                </option>
              ))}
            </select>
            {['All', 'Pending', 'Partial', 'Completed', 'Failed / Cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => setTaskFilter(tab)}
                style={{
                  padding: '5px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: taskFilter === tab ? 'var(--primary)' : 'var(--glass-bg)',
                  color: taskFilter === tab ? '#fff' : 'var(--text-dim)'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Order</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Assigned To</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Expected</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Collected</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Pending</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.tasks
                .filter(t => {
                  if (selectedDriverFilter !== 'All' && String(t.assignedCollectorId) !== selectedDriverFilter) return false;
                  if (taskFilter === 'All') return true;
                  if (taskFilter === 'Failed / Cancelled') return t.collectionStatus === 'Failed' || t.collectionStatus === 'Cancelled';
                  return t.collectionStatus === taskFilter;
                })
                .slice(0, 25)
                .map(t => (
                  <tr key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--primary)' }}>
                      #{t.orderRef} <span style={{ fontSize: '10px', opacity: 0.8 }}>({t.customerSegment})</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{t.customerName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{t.customerPhone}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{t.assignedCollectorName || 'Unassigned'}</div>
                      {t.assignedRole && <div style={{ fontSize: '10.5px', color: 'var(--text-dim)' }}>{t.assignedRole}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>₹{Number(t.expectedAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#22c55e' }}>₹{Number(t.collectedAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f59e0b' }}>₹{Number(t.pendingAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                        background: t.collectionStatus === 'Completed' ? 'rgba(34,197,94,0.14)' : t.collectionStatus === 'Partial' ? 'rgba(59,130,246,0.14)' : (t.collectionStatus === 'Failed' || t.collectionStatus === 'Cancelled') ? 'rgba(239,68,68,0.14)' : 'rgba(245,158,11,0.14)',
                        color: t.collectionStatus === 'Completed' ? '#22c55e' : t.collectionStatus === 'Partial' ? '#3b82f6' : (t.collectionStatus === 'Failed' || t.collectionStatus === 'Cancelled') ? '#ef4444' : '#f59e0b'
                      }}>
                        {t.collectionStatus}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        {t.collectionStatus !== 'Completed' && t.collectionStatus !== 'Cancelled' && (
                          <button
                            onClick={() => {
                              setEditId(null);
                              setFormData({
                                ...formData,
                                type: t.customerSegment || 'B2B',
                                name: t.customerName || '',
                                phone: t.customerPhone || '',
                                orderId: t._id,
                                collectorKey: t.assignedCollectorId ? `${t.assignedRole === 'Driver' ? 'driver' : 'cash_collector'}:${t.assignedCollectorId}` : ''
                              });
                              setShowForm(true);
                            }}
                            style={{ padding: '4px 8px', borderRadius: '7px', border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.12)', color: '#818cf8', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            {t.assignedCollectorId ? 'Reassign' : 'Assign Driver'}
                          </button>
                        )}
                        <button
                          onClick={() => setHistoryModalTask(t)}
                          style={{ padding: '4px 8px', borderRadius: '7px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-dim)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Collection History Modal */}
      {historyModalTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1150, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', borderRadius: '22px', padding: '22px', border: '1px solid var(--glass-border)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Collection History #{historyModalTask.orderRef}</h4>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{historyModalTask.customerName} • Expected ₹{historyModalTask.expectedAmount} • Pending ₹{historyModalTask.pendingAmount}</div>
              </div>
              <button onClick={() => setHistoryModalTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {(historyModalTask.codCollectionHistory || []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12.5px' }}>No collection events recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {historyModalTask.codCollectionHistory.map((h, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>{h.collectorName || 'Collector'} ({h.collectorRole || 'Driver'}) — {h.status}</span>
                      <span style={{ color: '#22c55e' }}>+₹{Number(h.amount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    {h.notes && <div style={{ color: 'var(--text-dim)', marginTop: '3px', fontSize: '11.5px' }}>{h.notes}</div>}
                    <div style={{ color: 'var(--text-dim)', marginTop: '3px', fontSize: '10.5px' }}>{h.collectedAt ? new Date(h.collectedAt).toLocaleString() : '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pending Deposit Requests Section */}
      {pendingDeposits.length > 0 && (
        <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={20} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Pending Driver Deposit Requests</h3>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: '16px', background: '#f59e0b', color: '#000', fontSize: '11.5px', fontWeight: 800 }}>
              {pendingDeposits.length} Action Required
            </span>
          </div>
          <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ background: 'var(--card-bg)' }}>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Driver</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Requested Amount</th>
                  <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>OTP Code</th>
                  <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingDeposits.map(deposit => {
                  const driver = deposit.driverId || {};
                  return (
                    <tr key={deposit._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                          }}>
                            {driver.name ? driver.name[0] : '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{driver.name || 'Unknown Driver'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{driver.phone || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>
                          ₹{Number(deposit.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <div style={{ padding: '6px 14px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '8px', fontSize: '15px', fontWeight: 900, letterSpacing: '2px', display: 'inline-block', fontFamily: 'monospace' }}>
                          {deposit.otp}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-dim)' }}>
                          {new Date(deposit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <div style={{ fontSize: '11px' }}>{new Date(deposit.createdAt).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleCollectClick(driver, deposit)}
                          className="btn-primary"
                          style={{
                            padding: '8px 18px', borderRadius: '12px', border: 'none',
                            background: '#22c55e', color: '#ffffff',
                            fontWeight: 700, fontSize: '12.5px', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                            display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }}
                        >
                          <CheckCircle2 size={15} /> Verify & Settle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Driver Wallet Balances Section */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Smartphone size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Driver Wallet Balances (B2B & B2C Cash in Hand)</h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {drivers.filter(d => (d.wallet || 0) > 0).length} active wallets
          </span>
        </div>
        <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)' }}>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Driver Details</th>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Segment</th>
                <th style={{ padding: '14px 24px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Vehicle Details</th>
                <th style={{ padding: '14px 24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Cash in Wallet</th>
                <th style={{ padding: '14px 24px', textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {drivers.filter(d => (d.wallet || 0) > 0).length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                    No pending driver cash in hand. All driver wallets settled!
                  </td>
                </tr>
              ) : drivers
                .filter(d => (d.wallet || 0) > 0)
                .sort((a, b) => ((a.type || '').toUpperCase() === 'B2B' ? -1 : 1) - ((b.type || '').toUpperCase() === 'B2B' ? -1 : 1))
                .map(driver => {
                  const isB2BDriver = (driver.type || '').toUpperCase() === 'B2B';
                  return (
                <tr key={driver._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px', height: '38px', borderRadius: '50%',
                        background: isB2BDriver ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                        color: isB2BDriver ? '#6366f1' : '#ec4899',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                      }}>
                        {driver.name ? driver.name[0] : '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>{driver.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{driver.phone}</div>
                        {driver.cashManagement ? (
                          <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={10} /> CASH MGMT ENABLED
                          </div>
                        ) : (
                          <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={10} /> CASH MGMT DISABLED
                          </div>
                        )}
                        {pendingDeposits.some(d => (d.driverId?._id || d.driverId) === driver._id) && (
                          <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowDownLeft size={10} /> PENDING SETTLEMENT (₹{pendingDeposits.find(d => (d.driverId?._id || d.driverId) === driver._id)?.amount || 0})
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                      background: isB2BDriver ? 'rgba(99, 102, 241, 0.15)' : 'rgba(236, 72, 153, 0.15)',
                      color: isB2BDriver ? '#6366f1' : '#ec4899'
                    }}>
                      {isB2BDriver ? 'B2B Logistics' : 'B2C Logistics'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{driver.vehicleDetails || 'Standard Delivery'}</div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>
                      ₹{Number(driver.wallet || 0).toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleCollectClick(driver)}
                      className="btn-primary"
                      style={{
                        padding: '6px 14px', borderRadius: '10px', border: 'none',
                        background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)',
                        fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                      }}
                    >
                      Collect Cash
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions & Cash Collection Logs Section */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{
          padding: isMobile ? '16px' : '20px 24px',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Cash Collection History</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>
              Found {filteredTransactions.length} transaction entries
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
            {/* View Mode Switcher */}
            <div style={{
              display: 'flex',
              gap: '4px',
              background: 'var(--glass-bg)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: viewMode === 'table' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: viewMode === 'table' ? '#ffffff' : 'var(--text-dim)'
                }}
              >
                <Table size={14} /> Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: viewMode === 'cards' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                  color: viewMode === 'cards' ? '#ffffff' : 'var(--text-dim)'
                }}
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="input-field"
              style={{ padding: '8px 12px', minHeight: 'auto', fontSize: '12.5px', width: isMobile ? '100%' : 'auto' }}
            >
              <option value="All">All Flow Types</option>
              <option value="B2B">B2B Sellers / Clients</option>
              <option value="B2C">B2C Customers</option>
              <option value="B2C (Driver)">B2C Driver Collections</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ padding: '8px 12px', minHeight: 'auto', fontSize: '12.5px', width: isMobile ? '100%' : 'auto' }}
            >
              <option value="All">All Statuses</option>
              <option value="Settled">Settled / Verified</option>
              <option value="Pending">Pending</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="input-field"
              style={{ padding: '8px 12px', minHeight: 'auto', fontSize: '12.5px', width: isMobile ? '100%' : 'auto' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', width: isMobile ? '100%' : '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '8px 12px 8px 36px',
                  color: 'var(--text-main)',
                  fontSize: '12.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '70px 40px', textAlign: 'center' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '20px', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CreditCard size={36} style={{ opacity: 0.25 }} />
            </div>
            <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px' }}>
              {searchTerm || filterType !== 'All' || statusFilter !== 'All' || locationFilter !== 'All' ? 'No matching logs found' : 'No Transactions Yet'}
            </h4>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '340px', margin: '0 auto' }}>
              {searchTerm || filterType !== 'All' || statusFilter !== 'All' || locationFilter !== 'All' ? 'Try adjusting your search query or filter options.' : 'Manual cash receipts and driver settlements will automatically appear in this audit log.'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div style={{ overflowX: 'auto' }} className="custom-scrollbar">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
              <thead>
                <tr style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Client / Payee</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Flow Type</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Amount Collected (₹)</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Verification</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => {
                  const txId = t._id || t.id;
                  const isB2B = t.type === 'B2B';
                  const isDriver = t.type === 'B2C (Driver)' || t.type === 'B2C Driver';
                  const dt = formatDateTime(t.date || t.createdAt);
                  const statusBadge = getStatusBadge(t.status);
                  const locName = t.locationName || t.location?.city || '';

                  return (
                    <tr key={txId} style={{ borderBottom: '1px solid var(--glass-border)' }} className="table-row-hover hover-row">
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '12px',
                            background: isB2B ? 'rgba(99, 102, 241, 0.12)' : (isDriver ? 'rgba(245, 158, 11, 0.12)' : 'rgba(236, 72, 153, 0.12)'),
                            color: isB2B ? '#6366f1' : (isDriver ? '#f59e0b' : '#ec4899'),
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                            flexShrink: 0
                          }}>
                            {t.name ? t.name[0] : (isDriver ? 'D' : 'C')}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{t.name}</span>
                              {t.driverId && (
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800 }}>
                                  Driver
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                              {t.phone || (t.driverId?.phone) || 'No phone'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '16px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '10.5px', fontWeight: 800,
                          background: isB2B ? 'rgba(99, 102, 241, 0.12)' : (isDriver ? 'rgba(245, 158, 11, 0.12)' : 'rgba(236, 72, 153, 0.12)'),
                          color: isB2B ? '#6366f1' : (isDriver ? '#f59e0b' : '#ec4899')
                        }}>
                          {t.type}
                        </span>
                      </td>

                      {/* Explicit AMOUNT Column */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                          ₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          {t.paymentMethod || 'Cash'}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontSize: '12.5px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={13} />
                          {dt.date}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', opacity: 0.8 }}>
                          {dt.time}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={14} />
                          {isB2B ? 'Password Verified' : (t.otp ? `OTP: ${t.otp}` : (t.verification || 'Verified'))}
                        </div>
                      </td>

                      <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800,
                          background: statusBadge.bg, color: statusBadge.color, textTransform: 'uppercase'
                        }}>
                          {statusBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setViewingTransaction(t)}
                            style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: 'none', padding: '7px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="View Transaction Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleEditClick(t)}
                            style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: 'none', padding: '7px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Edit Transaction"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteModalData({ show: true, id: txId })}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '7px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Delete Transaction"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cards View */
          <div style={{ padding: isMobile ? '12px' : '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {filteredTransactions.map((t) => {
                const txId = t._id || t.id;
                const isB2B = t.type === 'B2B';
                const isDriver = t.type === 'B2C (Driver)' || t.type === 'B2C Driver';
                const dt = formatDateTime(t.date || t.createdAt);
                const statusBadge = getStatusBadge(t.status);
                const locName = t.locationName || t.location?.city || '';

                return (
                  <div
                    key={txId}
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '10px',
                          background: isB2B ? 'rgba(99, 102, 241, 0.15)' : (isDriver ? 'rgba(245, 158, 11, 0.15)' : 'rgba(236, 72, 153, 0.15)'),
                          color: isB2B ? '#6366f1' : (isDriver ? '#f59e0b' : '#ec4899'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                        }}>
                          {t.name ? t.name[0] : (isDriver ? 'D' : 'C')}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{t.name}</span>
                            {t.driverId && (
                              <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '5px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 800 }}>
                                Driver
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>
                            {t.phone || (t.driverId?.phone) || 'No phone'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800,
                          background: isB2B ? 'rgba(99, 102, 241, 0.15)' : (isDriver ? 'rgba(245, 158, 11, 0.15)' : 'rgba(236, 72, 153, 0.15)'),
                          color: isB2B ? '#6366f1' : (isDriver ? '#f59e0b' : '#ec4899')
                        }}>
                          {t.type}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Amount Collected</span>
                        <span style={{ fontSize: '17px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                          ₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Method</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {t.paymentMethod || 'Cash'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: 'var(--text-dim)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {dt.date} {dt.time}
                      </span>
                      <span style={{
                        padding: '2px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                        background: statusBadge.bg, color: statusBadge.color
                      }}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                      <button
                        onClick={() => setViewingTransaction(t)}
                        className="btn-primary"
                        style={{ flex: 1, padding: '7px', fontSize: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <Eye size={14} /> Details
                      </button>
                      <button
                        onClick={() => handleEditClick(t)}
                        className="btn-secondary"
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteModalData({ show: true, id: txId })}
                        className="btn-secondary"
                        style={{ padding: '7px 12px', fontSize: '12px', color: '#ef4444' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {viewingTransaction && (() => {
        const dt = formatDateTime(viewingTransaction.date || viewingTransaction.createdAt);
        const statusBadge = getStatusBadge(viewingTransaction.status);
        const locName = viewingTransaction.locationName || viewingTransaction.location?.city || '';
        const txId = viewingTransaction._id || viewingTransaction.id;

        return (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1200, padding: '16px'
          }}>
            <div className="glass-card" style={{
              width: '100%', maxWidth: '480px', borderRadius: '24px',
              overflow: 'hidden', border: '1px solid var(--glass-border)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Cash Receipt Slip</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        Ref: {txId}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(txId, txId)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                        title="Copy Reference ID"
                      >
                        {copiedTxId === txId ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewingTransaction(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: 'rgba(34, 197, 94, 0.08)', borderRadius: '16px', padding: '16px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Cash Amount Collected</span>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981', margin: '4px 0 0', fontFamily: 'monospace' }}>
                  ₹{Number(viewingTransaction.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                  Payment Method: <strong style={{ color: 'var(--text-main)' }}>{viewingTransaction.paymentMethod || 'Cash'}</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Client / Payee</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>{viewingTransaction.name}</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{viewingTransaction.phone || (viewingTransaction.driverId?.phone) || '—'}</span>
                </div>

                <div style={{ padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Flow Type & Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: viewingTransaction.type === 'B2B' ? 'var(--primary)' : '#ec4899' }}>
                      {viewingTransaction.type}
                    </span>
                    <span style={{ padding: '1px 6px', borderRadius: '5px', fontSize: '10px', fontWeight: 800, background: statusBadge.bg, color: statusBadge.color }}>
                      {statusBadge.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginTop: '2px', display: 'block' }}>
                    {viewingTransaction.type === 'B2B' ? 'Password Verified' : (viewingTransaction.otp ? `OTP: ${viewingTransaction.otp}` : (viewingTransaction.verification || 'Verified'))}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Timestamp</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                    {dt.full}
                  </span>
                </div>
              </div>

              {viewingTransaction.driverId && (
                <div style={{ padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Linked Driver Account</span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-main)', fontWeight: 700, marginTop: '2px', display: 'block' }}>
                    {viewingTransaction.driverId.name || 'Driver'} {viewingTransaction.driverId.phone ? `(${viewingTransaction.driverId.phone})` : ''}
                  </span>
                </div>
              )}

              {viewingTransaction.description && (
                <div style={{ padding: '12px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Notes / Description</span>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-main)', marginTop: '2px', display: 'block' }}>
                    {viewingTransaction.description}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => {
                    const t = viewingTransaction;
                    setViewingTransaction(null);
                    handleEditClick(t);
                  }}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '12.5px' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => setViewingTransaction(null)}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '12.5px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Transaction Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1100, padding: '16px'
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: '520px', borderRadius: '24px',
            overflow: 'hidden', border: '1px solid var(--glass-border)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--glass-border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--card-bg)'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>{editId ? 'Edit Collection Record' : 'Assign Cash Collection'}</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{editId ? 'Update notes/details (amounts are auto-tracked)' : 'Assign an order to a Cash Collector — amount is synced automatically from the order'}</p>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--input-bg)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', background: 'var(--glass-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                {['B2B', 'B2C'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '13px', fontWeight: 700,
                      background: formData.type === type ? 'var(--primary)' : 'transparent',
                      color: formData.type === type ? 'white' : 'var(--text-dim)',
                      boxShadow: formData.type === type ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                    }}
                  >
                    {type === 'B2B' ? <Building2 size={14} style={{ marginRight: '6px', display: 'inline' }} /> : <User size={14} style={{ marginRight: '6px', display: 'inline' }} />}
                    {type} Customer
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formData.type === 'B2B' ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Seller Credentials</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ position: 'relative' }}>
                          <User size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                          <input
                            className="input-field"
                            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                            placeholder="Full Name"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div style={{ position: 'relative' }}>
                          <Phone size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                          <input
                            className="input-field"
                            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                            placeholder="Phone Number"
                            required
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ position: 'relative' }}>
                        <Mail size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                        <input
                          className="input-field"
                          style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                          placeholder="Email Address"
                          required={!formData.orderId && !editId}
                          value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '10px', color: '#6366f1', fontWeight: 800, fontSize: '12px' }}>***</div>
                        <input
                          type="password"
                          className="input-field"
                          style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                          placeholder="Password"
                          required={!formData.orderId && !editId}
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ position: 'relative' }}>
                        <User size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                        <input
                          className="input-field"
                          style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                          placeholder="Customer Name"
                          required
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Phone size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                        <input
                          className="input-field"
                          style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                          placeholder="Phone Number"
                          required
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logistics Verification</label>
                      <div style={{ position: 'relative' }}>
                        <ShieldCheck size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                        <input
                          className="input-field"
                          style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                          placeholder="Enter Driver OTP"
                          required={!formData.orderId && !editId}
                          value={formData.otp}
                          onChange={e => setFormData({ ...formData, otp: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {!editId && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Assign Order & Cash Collector (Auto Expected Amount)
                    </label>
                    <select
                      className="input-field"
                      style={{ height: '38px', fontSize: '12.5px' }}
                      value={formData.orderId || ''}
                      onChange={e => {
                        const ord = (reconciliation.eligibleOrders || []).find(o => o._id === e.target.value);
                        setFormData({
                          ...formData,
                          orderId: e.target.value,
                          type: ord?.customerSegment || formData.type,
                          name: ord?.customerName || formData.name,
                          phone: ord?.customerPhone || formData.phone
                        });
                      }}
                    >
                      <option value="">-- Optional: Select Order to Assign --</option>
                      {(reconciliation.eligibleOrders || []).map(ord => (
                        <option key={ord._id} value={ord._id}>
                          #{ord.orderRef} • {ord.customerName} ({ord.customerSegment}) — Expected ₹{ord.expectedAmount} (Pending ₹{ord.pendingAmount})
                        </option>
                      ))}
                    </select>

                    {formData.orderId && (
                      <>
                        <select
                          className="input-field"
                          style={{ height: '38px', fontSize: '12.5px' }}
                          required
                          value={formData.collectorKey || ''}
                          onChange={e => setFormData({ ...formData, collectorKey: e.target.value })}
                        >
                          <option value="">-- Select Driver or Cash Collector --</option>
                          {(drivers || []).map(d => (
                            <option key={`drv_${d._id}`} value={`driver:${d._id}`}>
                              Driver: {d.name} ({String(d.type || 'b2c').toUpperCase()}) • {d.phone} {d.cashManagement ? '✓ Cash Mgmt' : ''}
                            </option>
                          ))}
                          {(reconciliation.collectors || []).map(c => (
                            <option key={`cc_${c._id}`} value={`cash_collector:${c._id}`}>
                              Cash Collector: {c.name} ({c.type || 'B2B'}) {c.phone ? `• ${c.phone}` : ''}
                            </option>
                          ))}
                        </select>

                        {(() => {
                          const selOrd = (reconciliation.eligibleOrders || []).find(o => o._id === formData.orderId);
                          if (!selOrd) return null;
                          return (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 700 }}>
                              <span>Auto Expected: ₹{selOrd.expectedAmount}</span>
                              <span>Pending: ₹{selOrd.pendingAmount}</span>
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <CreditCard size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                    <select
                      className="input-field"
                      style={{ paddingLeft: '36px', height: '38px', fontSize: '13px', appearance: 'none' }}
                      value={formData.paymentMethod}
                      onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="Cash">Cash Payment</option>
                      <option value="UPI">UPI / Online</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <FileText size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                  <textarea
                    className="input-field"
                    style={{ paddingLeft: '36px', paddingTop: '10px', height: '60px', resize: 'none', fontSize: '13px' }}
                    placeholder="Transaction Notes / Description"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '4px',
                  height: '42px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 16px -6px rgba(99, 102, 241, 0.4)'
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={16} /> {editId ? 'Update Transaction' : 'Record Transaction'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Collection OTP Modal with Input & Auto-fill */}
      {showCollectModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1100, padding: '24px'
        }}>
          <div className="glass-card" style={{
            width: '100%', maxWidth: '440px', borderRadius: '32px',
            overflow: 'hidden', border: '1px solid var(--glass-border)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{ padding: '36px 32px' }}>
              {collectSuccess ? (
                <div className="animate-in fade-in zoom-in duration-300">
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle size={44} />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main)' }}>Payment Collected!</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Transaction of ₹{depositAmount.toLocaleString()} from {selectedDriver?.name} has been successfully recorded and settled.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Verify Cash Collection</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Confirm payment of <span style={{ color: '#f59e0b', fontWeight: 800 }}>₹{depositAmount.toLocaleString()}</span> from {selectedDriver?.name}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(99, 102, 241, 0.06)', borderRadius: '20px', padding: '20px', marginBottom: '24px', border: '1px dashed rgba(99, 102, 241, 0.3)' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Expected Driver OTP</p>
                    <div style={{ fontSize: '40px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '6px', fontFamily: 'monospace' }}>
                      {generatedOtp}
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '6px' }}>Verify this security code with the driver</p>
                  </div>

                  {/* Input field for entering OTP */}
                  <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                      Enter Verification OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP"
                      value={enteredOtp}
                      onChange={e => setEnteredOtp(e.target.value)}
                      style={{
                        width: '100%',
                        height: '48px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-main)',
                        fontSize: '18px',
                        fontWeight: 700,
                        textAlign: 'center',
                        letterSpacing: '4px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Expected OTP: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{generatedOtp}</strong></span>
                      <button
                        type="button"
                        onClick={() => setEnteredOtp(generatedOtp.toString())}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        Reset to Expected OTP
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowCollectModal(false)}
                      style={{ flex: 1, height: '46px', borderRadius: '14px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={verifyOtp}
                      disabled={verifying || !enteredOtp.trim()}
                      style={{
                        flex: 1, height: '46px', borderRadius: '14px', border: 'none',
                        background: enteredOtp.trim() ? '#22c55e' : '#94a3b8',
                        color: '#fff', fontWeight: 700, cursor: enteredOtp.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: enteredOtp.trim() ? '0 4px 15px rgba(34, 197, 94, 0.4)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      {verifying ? <Loader2 className="animate-spin" size={18} /> : 'Verify & Settle'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Modal */}
      {deleteModalData.show && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
        }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', width: '360px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Delete Transaction</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to delete this cash collection log? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteModalData({ show: false, id: null })}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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

export default Cash;
