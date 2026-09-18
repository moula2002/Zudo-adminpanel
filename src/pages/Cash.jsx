import React, { useState, useEffect } from 'react';
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
  DollarSign,
  Clock,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Wallet,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  FileText,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Cash = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [formData, setFormData] = useState({
    type: 'B2C',
    name: '',
    phone: '',
    email: '',
    password: '',
    otp: '',
    amount: '',
    description: '',
    paymentMethod: 'Cash'
  });

  const [drivers, setDrivers] = useState([]);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [collectSuccess, setCollectSuccess] = useState(false);
  const [currentDepositId, setCurrentDepositId] = useState(null);
  const [pendingDeposits, setPendingDeposits] = useState({}); // { driverId: depositData }
  const [depositAmount, setDepositAmount] = useState(0);

  useEffect(() => {
    fetchTransactions();
    fetchDrivers();
    fetchPendingDeposits();
  }, []);

  const fetchPendingDeposits = async () => {
    try {
      const { data } = await axios.get('deposits/all/pending');
      const depositMap = {};
      data.forEach(d => {
        const dId = d.driverId?._id || d.driverId;
        if (dId) {
          depositMap[dId] = d;
        }
      });
      setPendingDeposits(depositMap);
    } catch (error) {
      console.error('Error fetching pending deposits:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const { data } = await axios.get('cash');
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data } = await axios.get('drivers');
      setDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const handleCollectClick = (driver, existingDeposit = null) => {
    setSelectedDriver(driver);
    setEnteredOtp('');
    setCollectSuccess(false);

    let otp = '';
    let amount = driver.wallet;
    let depositId = null;

    // Use existing deposit data if provided or found in state
    const deposit = existingDeposit || pendingDeposits[driver._id];

    if (deposit) {
      otp = deposit.otp;
      amount = deposit.amount;
      depositId = deposit._id;
    } else {
      // For legacy or other types where no deposit record exists, fallback to driver wallet
      otp = driver.otp || Math.floor(1000 + Math.random() * 9000).toString();
      amount = driver.wallet;
    }

    setGeneratedOtp(otp);
    setDepositAmount(amount);
    setCurrentDepositId(depositId);
    setShowCollectModal(true);
  };

  const verifyOtp = async () => {
    setVerifying(true);
    try {
      let isVerified = false;

      if (selectedDriver.cashManagement && selectedDriver.type?.toLowerCase() === 'b2c') {
        // Verify against backend for cash management drivers
        const { data } = await axios.post('drivers/verify-otp', {
          driverId: selectedDriver._id,
          otp: enteredOtp
        });
        isVerified = data.success;
      } else {
        // Traditional verification for others
        isVerified = enteredOtp === generatedOtp;
      }

      if (isVerified) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 800));

        // Record as a transaction in database
        const { data: transaction } = await axios.post('cash', {
          type: 'B2C (Driver)',
          name: selectedDriver.name,
          phone: selectedDriver.phone,
          amount: depositAmount,
          otp: generatedOtp,
          description: `Collected from driver ${selectedDriver.name}`
        });

        setTransactions(prev => [transaction, ...prev]);

        // Update driver balance locally
        setDrivers(prev => prev.map(d =>
          d._id === selectedDriver._id ? { ...d, wallet: Math.max(0, d.wallet - depositAmount), otp: '' } : d
        ));

        // Also update driver balance on server and clear OTP
        await axios.put(`drivers/${selectedDriver._id}`, {
          wallet: Math.max(0, selectedDriver.wallet - depositAmount),
          otp: ''
        });

        // Mark deposit as completed if applicable
        if (currentDepositId) {
          await axios.put(`deposits/${currentDepositId}`, { status: 'Completed' });
        }

        setCollectSuccess(true);
        setTimeout(() => {
          setShowCollectModal(false);
          setCollectSuccess(false);
        }, 2000);
      } else {
        alert('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      const message = error.response?.data?.message || 'Failed to process collection';
      alert(message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: transaction } = await axios.post('cash', formData);

      setTransactions([transaction, ...transactions]);
      alert('Transaction recorded successfully!');
      setShowForm(false);
      setFormData({
        type: 'B2C',
        name: '',
        phone: '',
        email: '',
        password: '',
        otp: '',
        amount: '',
        description: '',
        paymentMethod: 'Cash'
      });
    } catch (error) {
      alert('Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = () => {
    const exportData = transactions.map(t => ({
      'Transaction ID': t._id || t.id,
      'Client Name': t.name,
      'Client Phone': t.phone,
      'Flow Type': t.type,
      'Date & Time': new Date(t.date).toLocaleString(),
      'OTP/Password Verification': t.type === 'B2B' ? (t.password || 'N/A') : (t.otp || 'N/A'),
      'Amount (₹)': t.amount,
      Method: t.paymentMethod || 'Cash',
      Description: t.description || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "Zudo_Cash_Collector_Registry.xlsx");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Cash Collector</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>Log and monitor manual B2B & B2C cash flows</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={exportTransactions}
            className="btn-primary"
            style={{
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '16px',
              height: '48px'
            }}
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '12px 24px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'var(--text-main)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 10px 20px -10px rgba(99, 102, 241, 0.5)',
              transition: '0.3s',
              height: '48px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={20} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Total B2C Cash</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0' }}>₹{transactions.filter(t => t.type === 'B2C' || t.type === 'B2C (Driver)').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString()}</h2>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Total B2B Cash</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0' }}>₹{transactions.filter(t => t.type === 'B2B').reduce((acc, t) => acc + Number(t.amount || 0), 0).toLocaleString()}</h2>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Pending Deposits</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0' }}>₹{Object.values(pendingDeposits).reduce((acc, d) => acc + (d.amount || 0), 0).toLocaleString()}</h2>
          </div>
        </div>
        <div className="glass-card" style={{ padding: '20px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={24} />
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>B2C Driver Wallets</p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0' }}>₹{drivers.filter(d => d.type?.toUpperCase() === 'B2C').reduce((acc, d) => acc + (d.wallet || 0), 0).toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* Pending Deposit Requests Section */}
      {Object.keys(pendingDeposits).length > 0 && (
        <div className="glass-card" style={{ borderRadius: '28px', overflow: 'hidden', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={20} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Pending Deposit Requests</h3>
            </div>
            <span style={{ padding: '4px 12px', borderRadius: '20px', background: '#f59e0b', color: 'var(--text-main)', fontSize: '12px', fontWeight: 800 }}>
              {Object.keys(pendingDeposits).length} Action Required
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--card-bg)' }}>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Driver</th>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Requested Amount</th>
                  <th style={{ padding: '16px 32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>OTP</th>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Time</th>
                  <th style={{ padding: '16px 32px', textAlign: 'right', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(pendingDeposits).map(deposit => {
                  const driver = deposit.driverId || {};
                  return (
                    <tr key={deposit._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                          }}>
                            {driver.name ? driver.name[0] : '?'}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>{driver.name || 'Unknown Driver'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{driver.phone || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>₹{deposit.amount.toLocaleString()}</div>
                      </td>
                      <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                        <div style={{ padding: '6px 12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '8px', fontSize: '16px', fontWeight: 900, letterSpacing: '2px', display: 'inline-block' }}>
                          {deposit.otp}
                        </div>
                      </td>
                      <td style={{ padding: '20px 32px' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                          {new Date(deposit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          <div style={{ fontSize: '11px' }}>{new Date(deposit.createdAt).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleCollectClick(driver, deposit)}
                          style={{
                            padding: '8px 20px', borderRadius: '12px', border: 'none',
                            background: '#22c55e', color: 'var(--text-main)',
                            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                            transition: '0.3s'
                          }}
                        >
                          Verify & Settle
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

      {/* Driver Wallets Section */}
      <div className="glass-card" style={{ borderRadius: '28px', overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Smartphone size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Driver Wallet Balances (B2C Only)</h3>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)' }}>
                <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Driver Details</th>
                <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Vehicle</th>
                <th style={{ padding: '16px 32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Wallet Balance</th>
              </tr>
            </thead>
            <tbody>
              {drivers.filter(d => (d.wallet || 0) > 0 && d.type?.toUpperCase() === 'B2C').length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                    No pending driver wallets.
                  </td>
                </tr>
              ) : drivers.filter(d => (d.wallet || 0) > 0 && d.type?.toUpperCase() === 'B2C').map(driver => (
                <tr key={driver._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '20px 32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: driver.type?.toUpperCase() === 'B2B' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                        color: driver.type?.toUpperCase() === 'B2B' ? '#6366f1' : '#ec4899',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                      }}>
                        {driver.name ? driver.name[0] : '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{driver.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{driver.phone}</div>
                        {driver.cashManagement && (
                          <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={10} /> CASH MGMT ENABLED
                          </div>
                        )}
                        {pendingDeposits[driver._id] && (
                          <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ArrowDownLeft size={10} /> PENDING REQUEST (₹{pendingDeposits[driver._id].amount})
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 32px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                      background: driver.type === 'b2b' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                      color: driver.type === 'b2b' ? '#6366f1' : '#ec4899'
                    }}>
                      {driver.type}
                    </span>
                  </td>
                  <td style={{ padding: '20px 32px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{driver.vehicleDetails}</div>
                  </td>
                  <td style={{ padding: '20px 32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>₹{driver.wallet.toLocaleString()}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card" style={{ borderRadius: '28px', overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Recent Activity</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search logs..."
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '10px 12px 10px 40px',
                  color: 'var(--text-main)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: '80px 40px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CreditCard size={40} style={{ opacity: 0.1 }} />
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-dim)', margin: '0 0 8px' }}>No Transactions Yet</h4>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>Manual cash entries will appear here once you record your first B2B or B2C transaction.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--card-bg)' }}>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Client Details</th>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '16px 32px', textAlign: 'left', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Verification</th>
                  <th style={{ padding: '16px 32px', textAlign: 'right', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t._id || t.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: t.type === 'B2B' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                          color: t.type === 'B2B' ? '#6366f1' : '#ec4899',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                        }}>
                          {t.name[0]}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>{t.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                        background: t.type === 'B2B' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                        color: t.type === 'B2B' ? '#6366f1' : '#ec4899'
                      }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} />
                        {new Date(t.date).toLocaleDateString()} at {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td style={{ padding: '20px 32px' }}>
                      <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700 }}>
                        {t.type === 'B2B' ? (t.password || 'N/A') : (t.otp || 'N/A')}
                      </div>
                    </td>
                    <td style={{ padding: '20px 32px', textAlign: 'right' }}>
                      <span style={{
                        padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800,
                        background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', textTransform: 'uppercase'
                      }}>
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: '16px'
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
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Log Cash Transaction</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Manually record a cash payment</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--input-bg)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', background: 'var(--glass-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                {['B2C', 'B2B'].map(type => (
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
                          required
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
                          required
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Logistics Verification</label>
                      <div style={{ position: 'relative' }}>
                        <ShieldCheck size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                        <input
                          className="input-field"
                          style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                          placeholder="Enter Driver OTP"
                          required
                          value={formData.otp}
                          onChange={e => setFormData({ ...formData, otp: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6366f1' }} />
                    <input
                      type="number"
                      className="input-field"
                      style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
                      placeholder="Amount (₹)"
                      required
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
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
                  color: 'var(--text-main)',
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
                {loading ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle2 size={16} /> Record Transaction</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Collection OTP Modal */}
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
            <div style={{ padding: '40px 32px' }}>
              {collectSuccess ? (
                <div className="animate-in fade-in zoom-in duration-300">
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                    <CheckCircle size={40} />
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px' }}>Payment Collected!</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '15px' }}>Transaction of ₹{depositAmount} from {selectedDriver?.name} has been successfully recorded.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Verify Collection</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Confirm payment of <span style={{ color: '#f59e0b', fontWeight: 800 }}>₹{depositAmount}</span> from {selectedDriver?.name}
                    </p>
                  </div>

                  <div style={{ background: 'rgba(99, 102, 241, 0.05)', borderRadius: '24px', padding: '24px', marginBottom: '32px', border: '1px dashed rgba(99, 102, 241, 0.2)' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Security OTP</p>
                    <div style={{ fontSize: '48px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '8px' }}>{generatedOtp}</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>Ask the driver to confirm this code</p>
                  </div>


                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => setShowCollectModal(false)}
                      style={{ flex: 1, height: '56px', borderRadius: '16px', border: 'none', background: 'var(--input-bg)', color: 'var(--text-main)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cash;
