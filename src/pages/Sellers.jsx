import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  Users, 
  UserPlus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  User, 
  ExternalLink, 
  X, 
  Image as ImageIcon,
  Building2,
  Clock,
  Ban,
  Filter,
  Search,
  Download,
  Edit2,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const [createData, setCreateData] = useState({ name: '', email: '', password: '', creditDays: 0, status: 'pending' });
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editPassword, setEditPassword] = useState('');

  const fetchSellers = async () => {
    try {
      const { data } = await api.get('/sellers');
      setSellers(data);
    } catch (err) {
      console.error('Failed to fetch sellers:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleUpdateStatus = async (id, status, isVerified) => {
    setUpdating(true);
    try {
      await api.put(`/sellers/${id}/verify`, { 
        status, 
        isVerified, 
        creditDays: selectedSeller?.creditDays || 0 
      });
      fetchSellers();
      setShowDetails(false);
      setStatus({ type: 'success', message: `Seller account updated successfully!` });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update seller status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const currentUser = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');
      const payload = { 
        ...createData, 
        status: 'pending',
        isVerified: false,
        creditDays: Number(createData.creditDays) || 0,
        locationId: createData.locationId || currentUser.locationId 
      };
      await api.post('/sellers', payload);
      setStatus({ type: 'success', message: 'New seller account created successfully!' });
      setShowCreate(false);
      setCreateData({ name: '', email: '', password: '', creditDays: 0, status: 'pending' });
      fetchSellers();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to create seller.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const payload = { 
        ...editData, 
        creditDays: Number(editData.creditDays) || 0,
      };
      if (editPassword) {
        payload.password = editPassword;
      }
      await api.put(`/sellers/${editData._id}`, payload);
      setStatus({ type: 'success', message: 'Seller profile updated successfully!' });
      setShowEdit(false);
      setEditData(null);
      setEditPassword('');
      fetchSellers();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update seller.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeller = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this seller account? This action cannot be undone.')) return;
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.delete(`/sellers/${id}`);
      setStatus({ type: 'success', message: 'Seller account deleted successfully!' });
      fetchSellers();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to delete seller.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredSellers = sellers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.businessName && s.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportSellers = () => {
    const exportData = filteredSellers.map(seller => ({
      'Merchant ID': seller._id,
      Name: seller.name,
      Email: seller.email,
      'Business/Store Name': seller.businessName || seller.storeName || 'Undisclosed',
      Phone: seller.phone || 'No phone',
      'Credit Days': seller.creditDays || 0,
      'Verification Status': seller.status || 'pending',
      'Verified Access': seller.isVerified ? 'Verified' : 'Limited Access'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sellers");
    XLSX.writeFile(wb, "Zudo_Sellers_Report.xlsx");
  };

  const stats = {
    total: sellers.length,
    pending: sellers.filter(s => s.status === 'pending').length,
    approved: sellers.filter(s => s.status === 'approved').length,
    rejected: sellers.filter(s => s.status === 'rejected').length
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Section */}
      <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Sellers Portfolio</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Validate and manage your platform's merchant network</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={exportSellers} 
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
          <button 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '48px', padding: '0 24px', borderRadius: '16px' }} 
            onClick={() => setShowCreate(!showCreate)}
          >
            {showCreate ? <X size={20} /> : <UserPlus size={20} />}
            <span>{showCreate ? 'Close Form' : 'Onboard New Seller'}</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {[
          { label: 'Total Merchants', value: stats.total, icon: Users, color: '#6366f1' },
          { label: 'Pending Approval', value: stats.pending, icon: Clock, color: '#f59e0b' },
          { label: 'Verified Partners', value: stats.approved, icon: CheckCircle2, color: '#22c55e' },
          { label: 'Declined', value: stats.rejected, icon: Ban, color: '#ef4444' },
        ].map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
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

      {status.message && (
        <div style={{ 
          background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
          border: `1px solid ${status.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, 
          color: status.type === 'success' ? '#22c55e' : '#ef4444', 
          padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{status.message}</span>
        </div>
      )}

      {showCreate && (
        <div className="glass-card" style={{ padding: '32px', borderRadius: '28px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ width: '8px', height: '24px', background: '#6366f1', borderRadius: '4px' }} />
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Merchant Registration</h3>
            </div>
            <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name</label>
                <input type="text" placeholder="John Doe" className="input-field" required value={createData.name} onChange={e => setCreateData({...createData, name: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                <input type="email" placeholder="john@example.com" className="input-field" required value={createData.email} onChange={e => setCreateData({...createData, email: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Secure Password</label>
                <input type="password" placeholder="••••••••" className="input-field" required value={createData.password} onChange={e => setCreateData({...createData, password: e.target.value})} />
              </div>
            </div>
            <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Allowed Credit Days</label>
                <input type="number" placeholder="e.g. 7" className="input-field" value={createData.creditDays} onChange={e => setCreateData({...createData, creditDays: Number(e.target.value) || 0})} min="0" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0 32px' }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex-responsive" style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-dim)' }} />
          <input 
            type="text" 
            placeholder="Search by name, business or email..." 
            className="input-field" 
            style={{ paddingLeft: '48px', height: '48px', borderRadius: '16px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="glass-card" style={{ padding: '0 20px', borderRadius: '16px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <Filter size={18} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Filter</span>
        </button>
      </div>

      {/* Main Table Section */}
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
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Merchant</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Business Assets</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px' }}>Verification</th>
                  <th style={{ padding: '24px', fontSize: '13px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '100px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <div style={{ opacity: 0.5, marginBottom: '16px' }}><Users size={48} style={{ margin: '0 auto' }} /></div>
                      <p style={{ fontWeight: 500 }}>No merchants found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((seller) => (
                    <tr key={seller._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: '0.2s' }} className="hover-row">
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '44px', height: '44px', borderRadius: '14px', 
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                            color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontWeight: 700, fontSize: '18px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                          }}>
                            {seller.name[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '15px' }}>{seller.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Mail size={12} /> {seller.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          <Building2 size={14} style={{ color: 'var(--text-dim)' }} />
                          {seller.businessName || seller.storeName || <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>Undisclosed</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{seller.phone || 'No phone'}</span>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--glass-border)' }} />
                          <span style={{ color: '#6366f1', fontWeight: 700, background: 'rgba(99, 102, 241, 0.08)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>{seller.creditDays || 0} Credit Days</span>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{ 
                          padding: '6px 14px', 
                          borderRadius: '12px', 
                          fontSize: '10px', 
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: 
                            seller.status === 'approved' ? 'rgba(34, 197, 94, 0.1)' : 
                            seller.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: 
                            seller.status === 'approved' ? '#22c55e' : 
                            seller.status === 'rejected' ? '#ef4444' : '#f59e0b'
                        }}>
                          {seller.status || 'pending'}
                        </span>
                      </td>

                      <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button 
                            onClick={() => { setSelectedSeller(seller); setShowDetails(true); }}
                            style={{ 
                              background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#6366f1', 
                              padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', 
                              fontSize: '11px', fontWeight: 700, display: 'inline-flex', 
                              alignItems: 'center', gap: '6px', transition: '0.2s'
                            }}
                            title="Audit Merchant Documents"
                          >
                            <ExternalLink size={12} /> Audit Docs
                          </button>
                          <button 
                            onClick={() => { setEditData(seller); setShowEdit(true); }}
                            style={{ 
                              background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', 
                              padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', 
                              fontSize: '11px', fontWeight: 700, display: 'inline-flex', 
                              alignItems: 'center', gap: '6px', transition: '0.2s'
                            }}
                            title="Edit Merchant Profile"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteSeller(seller._id)}
                            style={{ 
                              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', 
                              padding: '8px', borderRadius: '10px', cursor: 'pointer', 
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s'
                            }}
                            title="Delete Merchant Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seller Audit & Verification Modal */}
      {showDetails && selectedSeller && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '460px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--card-bg)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>Account Audit</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Review credentials for {selectedSeller.name}</p>
              </div>
              <button onClick={() => setShowDetails(false)} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                   <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>Business Identity</label>
                   <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>{selectedSeller.businessName || 'Name not provided'}</div>
                   <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', lineHeight: '1.4' }}>{selectedSeller.businessAddress || 'Address not listed'}</div>
                </div>
                
                <div style={{ padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                   <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>GST Registration</label>
                   <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>{selectedSeller.gstNumber || 'N/A'}</div>
                </div>
                <div style={{ padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                   <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px' }}>PAN Card No.</label>
                   <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>{selectedSeller.panNumber || 'N/A'}</div>
                </div>

                <div style={{ gridColumn: '1/-1', padding: '12px 16px', background: 'var(--input-bg)', borderRadius: '14px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                   <div>
                     <label style={{ display: 'block', fontSize: '9px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Terms</label>
                     <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>Allowed Credit Terms</span>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <input 
                       type="number" 
                       className="input-field" 
                       style={{ width: '80px', height: '32px', margin: 0, padding: '0 8px', fontSize: '13px', textAlign: 'center', borderRadius: '8px' }}
                       value={selectedSeller.creditDays || 0}
                       onChange={(e) => setSelectedSeller({ ...selectedSeller, creditDays: Number(e.target.value) || 0 })}
                       placeholder="Days"
                       min="0"
                     />
                     <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)' }}>Days</span>
                   </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'GST Document', url: selectedSeller.gstDoc, color: '#6366f1' },
                  { label: 'PAN Document', url: selectedSeller.panDoc, color: '#ec4899' }
                ].map((doc, idx) => (
                  <a 
                    key={idx}
                    href={doc.url} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      padding: '12px', borderRadius: '16px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', 
                      textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
                      transition: '0.2s'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${doc.color}15`, color: doc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={18} />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>{doc.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <ExternalLink size={8} /> Preview Doc
                    </div>
                  </a>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button 
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedSeller._id, 'approved', true)}
                  style={{ 
                    flex: 1.4, padding: '12px', borderRadius: '12px', border: 'none', 
                    background: 'linear-gradient(135deg, #22c55e, #10b981)', 
                    color: 'var(--text-main)', fontWeight: 800, fontSize: '13px', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 6px 12px -3px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  {updating ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle2 size={16} /> Approve</>}
                </button>
                <button 
                  disabled={updating}
                  onClick={() => handleUpdateStatus(selectedSeller._id, 'rejected', false)}
                  style={{ 
                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', 
                    background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', fontWeight: 800, fontSize: '13px', cursor: 'pointer' 
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Seller Modal */}
      {showEdit && editData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', borderRadius: '36px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
            <div style={{ padding: '28px 40px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>Edit Merchant Profile</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Modify account details and settings for {editData.name}</p>
              </div>
              <button onClick={() => { setShowEdit(false); setEditData(null); setEditPassword(''); }} style={{ background: 'rgba(0,0,0,0.05)', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '10px', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit}>
              <div style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name</label>
                    <input type="text" placeholder="John Doe" className="input-field" required value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                    <input type="email" placeholder="john@example.com" className="input-field" required value={editData.email || ''} onChange={e => setEditData({...editData, email: e.target.value})} />
                  </div>
                </div>

                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Phone Number</label>
                    <input type="text" placeholder="+919876543210" className="input-field" value={editData.phone || ''} onChange={e => setEditData({...editData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Change Password (Optional)</label>
                    <input type="password" placeholder="Leave empty to keep current" className="input-field" value={editPassword} onChange={e => setEditPassword(e.target.value)} />
                  </div>
                </div>

                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Business Name</label>
                    <input type="text" placeholder="Store or business identity" className="input-field" value={editData.businessName || editData.storeName || ''} onChange={e => setEditData({...editData, businessName: e.target.value, storeName: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>GST Number</label>
                    <input type="text" placeholder="GSTIN number" className="input-field" value={editData.gstNumber || ''} onChange={e => setEditData({...editData, gstNumber: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>PAN Number</label>
                  <input type="text" placeholder="PAN Number" className="input-field" value={editData.panNumber || ''} onChange={e => setEditData({...editData, panNumber: e.target.value})} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Business Address</label>
                  <textarea 
                    placeholder="Physical store or head office address" 
                    className="input-field" 
                    style={{ height: '80px', resize: 'none', padding: '12px' }}
                    value={editData.businessAddress || ''} 
                    onChange={e => setEditData({...editData, businessAddress: e.target.value})}
                  />
                </div>

                <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Allowed Credit Days</label>
                    <input type="number" placeholder="Credit days limit" className="input-field" value={editData.creditDays || 0} onChange={e => setEditData({...editData, creditDays: Number(e.target.value) || 0})} min="0" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>Verification Status</label>
                    <select className="input-field" value={editData.status || 'pending'} onChange={e => setEditData({...editData, status: e.target.value, isVerified: e.target.value === 'approved'})}>
                      <option value="pending">Pending Review (Limited Access)</option>
                      <option value="approved">Approved & Verified (Full Access)</option>
                      <option value="rejected">Rejected / Blocked</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="isVerified"
                    checked={editData.isVerified || false} 
                    onChange={e => setEditData({...editData, isVerified: e.target.checked})}
                    style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  <label htmlFor="isVerified" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                    Manually set as Verified (Shield Enabled)
                  </label>
                </div>
              </div>

              <div style={{ padding: '24px 40px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: 'rgba(255,255,255,0.01)' }}>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--glass-border)' }} 
                  onClick={() => { setShowEdit(false); setEditData(null); setEditPassword(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '0 32px' }} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sellers;
