import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
  MapPin,
  Package,
  Truck,
  KeyRound,
  Search,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  Eye,
  X,
  Phone,
  Store,
  Navigation,
  Loader2,
  RotateCcw,
  UserPlus,
  ExternalLink
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';

const STATUS_BADGE = {
  Pending: { bg: 'rgba(245, 158, 11, 0.14)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  Confirmed: { bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  Accepted: { bg: 'rgba(59, 130, 246, 0.14)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  Packed: { bg: 'rgba(139, 92, 246, 0.16)', color: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
  Assigned: { bg: 'rgba(99, 102, 241, 0.16)', color: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' },
  'Picked Up': { bg: 'rgba(16, 185, 129, 0.16)', color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  Shipped: { bg: 'rgba(14, 165, 233, 0.16)', color: '#0ea5e9', border: 'rgba(14, 165, 233, 0.3)' },
  'Out for Delivery': { bg: 'rgba(249, 115, 22, 0.16)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  Delivered: { bg: 'rgba(34, 197, 94, 0.16)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
  Cancelled: { bg: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }
};

const getBadgeStyle = (status) => {
  return STATUS_BADGE[status] || {
    bg: 'rgba(148, 163, 184, 0.14)',
    color: '#94a3b8',
    border: 'rgba(148, 163, 184, 0.3)'
  };
};

const Pickups = () => {
  const { refreshFlag } = useSocket();
  const [pickups, setPickups] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  // Modals
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [assignTargetOrder, setAssignTargetOrder] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, [refreshFlag]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pickupsRes, driversRes] = await Promise.all([
        axios.get('/orders/admin/pickups'),
        axios.get('/drivers')
      ]);
      setPickups(Array.isArray(pickupsRes.data) ? pickupsRes.data : []);
      setDrivers(Array.isArray(driversRes.data) ? driversRes.data : []);
    } catch (error) {
      console.error('Error fetching pickups:', error);
      toast.error('Failed to load pickup records');
    } finally {
      setLoading(false);
    }
  };

  // Exclude cancelled unless explicitly searching
  const activePickups = useMemo(() => {
    return pickups.filter(p => p.orderStatus !== 'Cancelled');
  }, [pickups]);

  const stats = useMemo(() => {
    const readyCount = activePickups.filter(p => ['Pending', 'Confirmed', 'Accepted', 'Packed', 'Assigned'].includes(p.orderStatus)).length;
    const pickedUpCount = activePickups.filter(p => p.orderStatus === 'Picked Up').length;
    const transitCount = activePickups.filter(p => ['Shipped', 'Out for Delivery'].includes(p.orderStatus)).length;
    const deliveredCount = activePickups.filter(p => p.orderStatus === 'Delivered').length;
    const returnCount = activePickups.filter(p => p.isReturnPickup).length;

    return {
      total: activePickups.length,
      readyCount,
      pickedUpCount,
      transitCount,
      deliveredCount,
      returnCount
    };
  }, [activePickups]);

  const filteredPickups = useMemo(() => {
    return activePickups.filter(p => {
      // Tab filter
      if (activeTab === 'Ready for Pickup') {
        if (!['Pending', 'Confirmed', 'Accepted', 'Packed', 'Assigned'].includes(p.orderStatus)) return false;
      } else if (activeTab === 'Picked Up') {
        if (p.orderStatus !== 'Picked Up') return false;
      } else if (activeTab === 'Out for Delivery') {
        if (!['Shipped', 'Out for Delivery'].includes(p.orderStatus)) return false;
      } else if (activeTab === 'Delivered') {
        if (p.orderStatus !== 'Delivered') return false;
      } else if (activeTab === 'Return Pickups') {
        if (!p.isReturnPickup) return false;
      }

      // Search filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        const refMatch = (p.orderRef || '').toLowerCase().includes(q) || (p._id || '').toLowerCase().includes(q);
        const otpMatch = (p.pickupCode || '').toLowerCase().includes(q) ||
          (p.pickupPoints || []).some(pt => (pt.pickupCode || '').toLowerCase().includes(q));
        const sellerMatch = (p.pickupPoints || []).some(pt =>
          (pt.sellerName || '').toLowerCase().includes(q) ||
          (pt.sellerPhone || '').toLowerCase().includes(q) ||
          (pt.pickupAddress || '').toLowerCase().includes(q)
        );
        const driverMatch = (p.driverId?.name || '').toLowerCase().includes(q) || (p.driverId?.phone || '').toLowerCase().includes(q);
        const customerMatch = (p.customer?.name || '').toLowerCase().includes(q);

        return refMatch || otpMatch || sellerMatch || driverMatch || customerMatch;
      }

      return true;
    });
  }, [activePickups, activeTab, searchQuery]);

  const handleUpdatePickupStatus = async (orderId, newStatus, sellerId = null) => {
    setActionLoadingId(orderId);
    try {
      await axios.put(`/orders/${orderId}/pickup-status`, {
        status: newStatus,
        ...(sellerId ? { sellerId } : {})
      });
      toast.success(`Pickup marked as ${newStatus}`);
      await fetchData();
      if (selectedPickup && selectedPickup._id === orderId) {
        const refreshed = (await axios.get('/orders/admin/pickups')).data;
        const updated = refreshed.find(x => x._id === orderId);
        if (updated) setSelectedPickup(updated);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update pickup status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignDriver = async (driverId) => {
    if (!assignTargetOrder) return;
    setActionLoadingId(assignTargetOrder._id);
    try {
      if (assignTargetOrder.isReturnPickup) {
        await axios.put(`/orders/${assignTargetOrder._id}/assign-return-driver`, { driverId });
      } else {
        await axios.put(`/orders/${assignTargetOrder._id}/ship`, { driverId, outForDelivery: false });
      }
      toast.success('Driver assigned to pickup');
      setShowDriverModal(false);
      setAssignTargetOrder(null);
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign driver');
    } finally {
      setActionLoadingId(null);
    }
  };

  const exportToExcel = () => {
    const rows = filteredPickups.map(p => ({
      'Order Ref': `#${p.orderRef}`,
      'Order Status': p.orderStatus,
      'Pickup OTP': p.pickupCode || 'N/A',
      'Pickup Point(s)': (p.pickupPoints || []).map(pt => `${pt.sellerName} (${pt.pickupAddress})`).join(' | '),
      'Assigned Driver': p.driverId?.name || 'Unassigned',
      'Driver Phone': p.driverId?.phone || '-',
      'Customer': p.customer?.name || 'Customer',
      'Amount (₹)': p.totalAmount || 0,
      'Date': p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Pickups');
    XLSX.writeFile(wb, 'Zudo_Pickups_Report.xlsx');
    toast.success('Exported pickups report');
  };

  const tabs = [
    { id: 'All', label: `All (${stats.total})` },
    { id: 'Ready for Pickup', label: `Ready for Pickup (${stats.readyCount})` },
    { id: 'Picked Up', label: `Picked Up (${stats.pickedUpCount})` },
    { id: 'Out for Delivery', label: `Out for Delivery (${stats.transitCount})` },
    { id: 'Delivered', label: `Delivered (${stats.deliveredCount})` },
    { id: 'Return Pickups', label: `Return Pickups (${stats.returnCount})` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={26} style={{ color: '#6366f1' }} />
            Pickup Points & Dispatch
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
            Monitor seller pickup points, verify pickup OTPs, assign drivers, and track pickup completion
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={exportToExcel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 16px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.14)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <Download size={16} /> Export Excel
          </button>

          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer'
            }}
            title="Refresh Pickups"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {[
          { label: 'Ready for Pickup', val: stats.readyCount, icon: Clock, color: '#8b5cf6', sub: 'Packed & awaiting driver' },
          { label: 'Picked Up', val: stats.pickedUpCount, icon: CheckCircle2, color: '#10b981', sub: 'Collected from seller' },
          { label: 'Out for Delivery', val: stats.transitCount, icon: Truck, color: '#f97316', sub: 'In transit to customer' },
          { label: 'Delivered', val: stats.deliveredCount, icon: Package, color: '#22c55e', sub: 'Completed pickups' },
          { label: 'Return Pickups', val: stats.returnCount, icon: RotateCcw, color: '#ec4899', sub: 'Customer return pickups' }
        ].map((kpi, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '18px 20px', borderRadius: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {kpi.label}
              </span>
              <div style={{ padding: '7px', borderRadius: '10px', background: `${kpi.color}18`, color: kpi.color }}>
                <kpi.icon size={16} />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>{kpi.val}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          className="custom-scrollbar"
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '6px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '14px'
          }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--text-dim)',
                boxShadow: activeTab === tab.id ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                transition: '0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', maxWidth: '460px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search by Order Ref, Pickup OTP, Seller Name, Address, or Driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '40px', height: '42px', fontSize: '13px', borderRadius: '12px', width: '100%' }}
          />
        </div>
      </div>

      {/* Pickups Table / Cards */}
      <div className="glass-card" style={{ borderRadius: '20px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
            <div>Loading pickup points...</div>
          </div>
        ) : filteredPickups.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <MapPin size={34} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>No Pickup Records Found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your search or filter tab.</div>
          </div>
        ) : isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
            {filteredPickups.map(p => {
              const badge = getBadgeStyle(p.orderStatus);
              const primaryPoint = p.pickupPoints?.[0];
              return (
                <div
                  key={p._id}
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)' }}>#{p.orderRef}</span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`
                    }}>
                      {p.orderStatus}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {primaryPoint?.sellerName || 'Merchant Partner'}
                      {p.pickupPoints?.length > 1 && ` (+${p.pickupPoints.length - 1} more)`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {primaryPoint?.pickupAddress || 'No address'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Pickup OTP: </span>
                      <strong style={{ fontFamily: 'monospace', color: '#8b5cf6', fontSize: '13px' }}>{p.pickupCode || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)' }}>Driver: </span>
                      <strong>{p.driverId?.name || 'Unassigned'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {!p.driverId && (
                      <button
                        onClick={() => { setAssignTargetOrder(p); setShowDriverModal(true); }}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Assign Driver
                      </button>
                    )}
                    {['Pending', 'Confirmed', 'Accepted', 'Packed', 'Assigned'].includes(p.orderStatus) && (
                      <button
                        onClick={() => handleUpdatePickupStatus(p._id, 'Picked Up')}
                        disabled={actionLoadingId === p._id}
                        style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Mark Picked Up
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedPickup(p)}
                      style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '980px' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '15px 18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Order Ref</th>
                  <th style={{ padding: '15px 18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pickup Point (Seller & Address)</th>
                  <th style={{ padding: '15px 18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pickup OTP</th>
                  <th style={{ padding: '15px 18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Items</th>
                  <th style={{ padding: '15px 18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Assigned Driver</th>
                  <th style={{ padding: '15px 18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '15px 18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPickups.map(p => {
                  const badge = getBadgeStyle(p.orderStatus);
                  const points = p.pickupPoints || [];
                  const totalItemsCount = points.reduce((sum, pt) => sum + pt.items.reduce((s, it) => s + (it.quantity || 1), 0), 0);

                  return (
                    <tr key={p._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--primary)' }}>#{p.orderRef}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
                        </div>
                        {p.isReturnPickup && (
                          <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                            RETURN PICKUP
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '16px 18px', verticalAlign: 'top', maxWidth: '300px' }}>
                        {points.length === 0 ? (
                          <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>No pickup points</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {points.map((pt, idx) => (
                              <div key={idx} style={{ fontSize: '12px' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Store size={13} style={{ color: '#6366f1', flexShrink: 0 }} />
                                  <span>{pt.sellerName}</span>
                                  {pt.sellerPhone && (
                                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)' }}>({pt.sellerPhone})</span>
                                  )}
                                </div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '2px', lineHeight: '1.4' }}>
                                  {pt.pickupAddress}
                                  {pt.lat != null && pt.lng != null && (
                                    <a
                                      href={`https://www.google.com/maps?q=${pt.lat},${pt.lng}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ marginLeft: '6px', color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none', fontWeight: 600 }}
                                    >
                                      Map <ExternalLink size={10} />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {points.length > 1 ? (
                            points.map((pt, i) => (
                              <span key={i} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(139, 92, 246, 0.14)',
                                color: '#a78bfa',
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '12px',
                                width: 'fit-content'
                              }}>
                                <KeyRound size={11} /> {pt.pickupCode || p.pickupCode || 'N/A'}
                              </span>
                            ))
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              background: 'rgba(139, 92, 246, 0.15)',
                              color: '#a78bfa',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '13px',
                              width: 'fit-content'
                            }}>
                              <KeyRound size={12} /> {points[0]?.pickupCode || p.pickupCode || 'N/A'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px', verticalAlign: 'top', fontSize: '12px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{totalItemsCount} item(s)</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          ₹{Number(p.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        {p.driverId ? (
                          <div style={{ fontSize: '12px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.driverId.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{p.driverId.phone}</div>
                            {(p.driverId.vehicleNo || p.driverId.vehicleDetails) && (
                              <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 700 }}>
                                {p.driverId.vehicleNo || p.driverId.vehicleDetails}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAssignTargetOrder(p); setShowDriverModal(true); }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              background: 'rgba(99, 102, 241, 0.14)',
                              color: '#6366f1',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <UserPlus size={12} /> Assign Driver
                          </button>
                        )}
                      </td>

                      <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {p.orderStatus}
                        </span>
                      </td>

                      <td style={{ padding: '16px 18px', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {['Pending', 'Confirmed', 'Accepted', 'Packed', 'Assigned'].includes(p.orderStatus) && (
                            <button
                              onClick={() => handleUpdatePickupStatus(p._id, 'Picked Up')}
                              disabled={actionLoadingId === p._id}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              title="Mark as Picked Up"
                            >
                              {actionLoadingId === p._id ? 'Updating...' : 'Mark Picked Up'}
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedPickup(p)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'var(--glass-bg)',
                              color: 'var(--text-main)',
                              border: '1px solid var(--glass-border)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="View Pickup Details"
                          >
                            <Eye size={13} /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pickup Details Modal */}
      {selectedPickup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto', borderRadius: '24px', padding: '24px', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid var(--glass-border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Pickup Details #{selectedPickup.orderRef}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Global Pickup OTP: <strong style={{ fontFamily: 'monospace', color: '#8b5cf6' }}>{selectedPickup.pickupCode || 'N/A'}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedPickup(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '18px' }}>
              {/* Pickup Points List */}
              {(selectedPickup.pickupPoints || []).map((pt, idx) => (
                <div key={idx} style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Store size={15} style={{ color: '#6366f1' }} /> {pt.sellerName}
                      </div>
                      {pt.sellerPhone && (
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {pt.sellerPhone}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        {pt.pickupAddress}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.16)', color: '#a78bfa' }}>
                        OTP: {pt.pickupCode || selectedPickup.pickupCode || 'N/A'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: getBadgeStyle(pt.pickupStatus).color }}>
                        Status: {pt.pickupStatus}
                      </span>
                    </div>
                  </div>

                  {/* Items at this Pickup Point */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Items to Pick Up</div>
                    {pt.items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                        <span>{it.name} {it.variantSize ? `(${it.variantSize})` : ''}</span>
                        <strong>x{it.quantity}</strong>
                      </div>
                    ))}
                  </div>

                  {pt.sellerId && ['Pending', 'Confirmed', 'Accepted', 'Packed', 'Assigned'].includes(pt.pickupStatus) && (
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleUpdatePickupStatus(selectedPickup._id, 'Picked Up', pt.sellerId)}
                        disabled={actionLoadingId === selectedPickup._id}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'rgba(16, 185, 129, 0.16)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Mark Seller Pickup as Picked Up
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Customer & Driver Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Assigned Driver</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>
                    {selectedPickup.driverId?.name || 'Unassigned'}
                  </div>
                  {selectedPickup.driverId?.phone && (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{selectedPickup.driverId.phone}</div>
                  )}
                  <button
                    onClick={() => { setAssignTargetOrder(selectedPickup); setShowDriverModal(true); }}
                    style={{
                      marginTop: '8px',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.14)',
                      color: '#6366f1',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {selectedPickup.driverId ? 'Reassign Driver' : 'Assign Driver'}
                  </button>
                </div>

                <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Drop Destination (Customer)</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>{selectedPickup.customer?.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{selectedPickup.customer?.phone}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{selectedPickup.customer?.address}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Driver Modal */}
      {showDriverModal && assignTargetOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '420px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Assign Pickup Driver</h3>
              <button onClick={() => { setShowDriverModal(false); setAssignTargetOrder(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '18px', maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {drivers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '13px' }}>No drivers available</div>
              ) : drivers.map(driver => (
                <button
                  key={driver._id}
                  onClick={() => handleAssignDriver(driver._id)}
                  disabled={actionLoadingId === assignTargetOrder._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    {driver.name?.[0] || 'D'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{driver.name}</span>
                      {driver.cashManagement ? (
                        <span style={{ fontSize: '10px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', padding: '2px 6px', borderRadius: '4px' }}>✓ Cash Mgmt</span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>No Cash Mgmt</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {driver.phone} {(driver.vehicleNo || driver.vehicleDetails) ? `• ${driver.vehicleNo || driver.vehicleDetails}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pickups;

