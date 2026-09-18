import React, { useState, useEffect } from 'react';
import axios from '../utils/api';
import { Truck, Clock, Star, CheckCircle, TrendingUp, BarChart3, Loader2, Plus, Trash2, Edit3, Clock4, ShieldCheck, ShieldAlert, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const Deliveries = () => {
  const [stats, setStats] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [cutoffTimeInput, setCutoffTimeInput] = useState('');
  
  const [formData, setFormData] = useState({
    startTime: '09:00 AM',
    endTime: '12:00 PM',
    isActive: true
  });

  const exportToExcel = () => {
    const slotsData = slots.map((slot, index) => ({
      'Slot Number': index + 1,
      'Start Time': slot.startTime,
      'End Time': slot.endTime,
      'Status': slot.isActive ? 'Active' : 'Inactive'
    }));

    const perfData = [
      { 'Metric': 'Avg. Delivery Time', 'Value': `${stats?.avgDeliveryTime || 0} minutes` },
      { 'Metric': 'Success Rate', 'Value': `${Math.round(stats?.successRate || 0)}%` },
      { 'Metric': 'Total Delivered Orders', 'Value': stats?.totalDelivered || 0 },
      { 'Metric': 'Avg. Partner Rating', 'Value': `${stats?.avgRating || 0} / 5` }
    ];

    const wb = XLSX.utils.book_new();
    const wsSlots = XLSX.utils.json_to_sheet(slotsData);
    const wsPerf = XLSX.utils.json_to_sheet(perfData);

    XLSX.utils.book_append_sheet(wb, wsSlots, "Delivery Slots");
    XLSX.utils.book_append_sheet(wb, wsPerf, "Performance Indicators");
    XLSX.writeFile(wb, "Zudo_Delivery_Windows_Report.xlsx");
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [statsRes, slotsRes] = await Promise.all([
        axios.get('/deliveries/stats'),
        axios.get('/deliveries/slots')
      ]);
      setStats(statsRes.data);
      setSlots(slotsRes.data);
      const cutoffSlot = slotsRes.data.find(s => s.SameDayCutoff != null);
      if (cutoffSlot) {
        setCutoffTimeInput(cutoffSlot.SameDayCutoff);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sameDayCutoffDoc = slots.find(s => s.SameDayCutoff != null);

  const handleUpdateCutoff = async () => {
    try {
      setActionLoading('cutoff');
      if (sameDayCutoffDoc) {
        await axios.put(`/deliveries/slots/${sameDayCutoffDoc._id}`, { SameDayCutoff: cutoffTimeInput, isActive: true, isSameDay: true, startTime: "*", endTime: "*" });
      } else {
        await axios.post('/deliveries/slots', { SameDayCutoff: cutoffTimeInput, isActive: true, isSameDay: true, startTime: "*", endTime: "*" });
      }
      fetchInitialData();
    } catch (err) {
      alert('Failed to update cutoff');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading('submit');
    try {
      if (editingSlot) {
        await axios.put(`/deliveries/slots/${editingSlot._id}`, formData);
      } else {
        await axios.post('/deliveries/slots', formData);
      }
      setShowModal(false);
      setEditingSlot(null);
      setFormData({ startTime: '09:00 AM', endTime: '12:00 PM', isActive: true});
      const { data } = await axios.get('/deliveries/slots');
      setSlots(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save slot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (slot) => {
    setEditingSlot(slot);
    setFormData({
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) return;
    setActionLoading(id);
    try {
      await axios.delete(`/deliveries/slots/${id}`);
      setSlots(slots.filter(s => s._id !== id));
    } catch (err) {
      alert('Failed to delete slot');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (slot) => {
    try {
      const { data } = await axios.put(`/deliveries/slots/${slot._id}`, { isActive: !slot.isActive });
      setSlots(slots.map(s => s._id === slot._id ? data : s));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
      <Loader2 className="animate-spin" style={{ color: '#6366f1' }} size={40} />
      <div style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Initializing Logistics Core...</div>
    </div>
  );

  const statCards = [
    { title: 'Avg. Delivery Time', value: `${stats?.avgDeliveryTime || 0}m`, icon: <Clock size={24} />, color: '#3b82f6' },
    { title: 'Success Rate', value: `${Math.round(stats?.successRate || 0)}%`, icon: <TrendingUp size={24} />, color: '#22c55e' },
    { title: 'Total Delivered', value: stats?.totalDelivered || 0, icon: <CheckCircle size={24} />, color: '#6366f1' },
    { title: 'Avg. Partner Rating', value: stats?.avgRating || 0, icon: <Star size={24} />, color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {statCards.map((card, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: card.color, opacity: 0.05, borderRadius: '0 0 0 100%' }}></div>
            <div style={{ 
              width: '48px', height: '48px', borderRadius: '14px', background: `${card.color}15`, color: card.color, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' 
            }}>
              {card.icon}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{card.title}</div>
            <div style={{ fontSize: '28px', fontWeight: 800 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Slot Management Section */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '32px' }}>
          <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Clock4 size={24} style={{ color: '#6366f1' }} />
                Delivery Windows
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Configure your branch's operational delivery slots</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(99,102,241,0.05)', padding: '10px 16px', borderRadius: '16px', border: '1px solid rgba(99,102,241,0.1)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>Same Day Cutoff:</span>
              <input 
                type="text"
                placeholder="e.g. 10:30 AM"
                value={cutoffTimeInput}
                onChange={(e) => setCutoffTimeInput(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', width: '100px' }}
              />
              <button 
                onClick={handleUpdateCutoff}
                disabled={actionLoading === 'cutoff'}
                style={{ padding: '6px 12px', borderRadius: '8px', background: '#6366f1', color: 'var(--text-main)', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '12px' }}
              >
                {actionLoading === 'cutoff' ? 'Saving...' : 'Save'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={exportToExcel}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '14px', 
                  background: 'var(--glass-bg)', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--glass-border)', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                }}
              >
                <Download size={18} /> Export Excel
              </button>
              <button 
                onClick={() => { setEditingSlot(null); setFormData({ startTime: '09:00 AM', endTime: '12:00 PM', isActive: true}); setShowModal(true); }}
                style={{ padding: '10px 20px', borderRadius: '14px', background: '#6366f1', color: 'var(--text-main)', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> New Slot
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {slots.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '24px', border: '1px dashed var(--glass-border)' }}>
                <p style={{ color: 'var(--text-dim)' }}>No delivery slots configured for this location.</p>
              </div>
            ) : slots.map((slot, index) => (
              <div key={slot._id} style={{ 
                padding: '20px', borderRadius: '20px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--glass-border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.3s'
              }} className="hover-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    padding: '12px', borderRadius: '14px', background: slot.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: slot.isActive ? '#22c55e' : '#ef4444'
                  }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Slot {index + 1}</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>{slot.startTime} - {slot.endTime}</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button 
                    onClick={() => toggleStatus(slot)}
                    style={{ 
                      padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800, border: 'none', cursor: 'pointer',
                      background: slot.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: slot.isActive ? '#22c55e' : '#ef4444'
                    }}
                  >
                    {slot.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleEdit(slot)}
                      style={{ padding: '8px', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-dim)', border: 'none', cursor: 'pointer' }}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(slot._id)}
                      disabled={actionLoading === slot._id}
                      style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                    >
                      {actionLoading === slot._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Health Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '32px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))', position: 'relative', overflow: 'hidden', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>Logistics Intelligence</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.6', marginBottom: '24px' }}>
                Operational efficiency is monitored across all configured slots. Adding more windows during peak hours (10 AM - 4 PM) can reduce partner wait times.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(99, 102, 241, 0.1)', padding: '16px', borderRadius: '16px' }}>
                <TrendingUp size={20} color="#6366f1" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366f1' }}>Optimization Engine Active</span>
              </div>
            </div>
            <Truck size={120} style={{ position: 'absolute', bottom: '-20px', right: '-20px', color: '#6366f1', opacity: 0.05, transform: 'rotate(-15deg)' }} />
          </div>

          <div className="glass-card" style={{ padding: '32px', borderRadius: '32px', border: '1px solid var(--glass-border)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>Slot Best Practices</h4>
            <ul style={{ padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: '3-hour windows are ideal', icon: <ShieldCheck size={14} color="#22c55e" /> },
                { label: 'Limit morning slots to 25 orders', icon: <ShieldCheck size={14} color="#22c55e" /> },
                { label: 'Ensure overlap between windows', icon: <ShieldAlert size={14} color="#f59e0b" /> }
              ].map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>
                  {item.icon} {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '40px', borderRadius: '32px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>{editingSlot ? 'Refine Slot' : 'Configure New Window'}</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginBottom: '32px' }}>Set the timing and capacity for this delivery window.</p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Start Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 09:00 AM" 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontWeight: 600, width: '100%', boxSizing: 'border-box' }}
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>End Time</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 12:00 PM" 
                    style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--input-bg)', color: 'var(--text-main)', fontWeight: 600, width: '100%', boxSizing: 'border-box' }}
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--input-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '20px', height: '20px', accentColor: '#6366f1' }}
                />
                <label htmlFor="isActive" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dim)', cursor: 'pointer' }}>Active and accepting orders</label>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#f1f5f9', color: 'var(--text-dim)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading === 'submit'}
                  style={{ flex: 1, padding: '14px', borderRadius: '16px', background: '#6366f1', color: 'var(--text-main)', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)' }}
                >
                  {actionLoading === 'submit' ? <Loader2 size={20} className="animate-spin" /> : (editingSlot ? 'Update Window' : 'Create Window')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
