import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Users, UserPlus, Key, Shield, Loader2, CheckCircle2,
  AlertCircle, MapPin, Settings, Trash2, X, Lock, Phone, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Sales = () => {
  const [admins, setAdmins] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [availablePincodes, setAvailablePincodes] = useState([]);
  const [loadingPincodes, setLoadingPincodes] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');
  const currentLocId = localStorage.getItem('zudo_admin_location') || currentUser.locationId || '';

  const [createData, setCreateData] = useState({
    name: '', email: '', phone: '', password: '', role: 'sales',
    locationId: currentLocId, permissions: [], pincodes: []
  });
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const exportSales = () => {
    const exportData = admins.map(admin => ({
      ID: admin._id,
      Name: admin.name,
      Email: admin.email,
      Phone: admin.phone || '-',
      Role: admin.role ? admin.role.replace('_', ' ').toUpperCase() : '',
      'Location Assigned': admin.locationId ? (admin.locationId.name || admin.locationId.city) : 'Global Access',
      City: admin.locationId ? admin.locationId.city : 'All',
      Pincodes: admin.pincodes && admin.pincodes.length > 0 ? admin.pincodes.join(', ') : 'No Pincodes'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Team");
    XLSX.writeFile(wb, "Zudo_Sales_Team_Report.xlsx");
  };


  const roles = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'normal_admin', label: 'Normal Admin' },
    { value: 'sales', label: 'Sales' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'manager', label: 'Manager' },
    { value: 'logistics', label: 'Logistics' },
    { value: 'cash_collector', label: 'Cash Collector' }
  ];



  useEffect(() => {
    fetchData();
  }, [showCreate, showEdit]);

  useEffect(() => {
    const locId = showCreate ? createData.locationId : (showEdit && editingAdmin ? editingAdmin.locationId : null);
    if (locId) {
      fetchPincodes(locId);
    } else {
      setAvailablePincodes([]);
    }
  }, [showCreate, showEdit, createData.locationId, editingAdmin?.locationId]);

  const fetchPincodes = async (locId) => {
    setLoadingPincodes(true);
    try {
      const { data } = await api.get(`/locations/${locId}/pincodes`);
      setAvailablePincodes(data);
    } catch (err) {
      console.error('Failed to fetch pincodes:', err);
      setAvailablePincodes([]);
    } finally {
      setLoadingPincodes(false);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch Admins
      try {
        const { data } = await api.get('/auth/sales');
        setAdmins(data);
      } catch (err) {
        console.error('Failed to fetch admins:', err);
      }

      // Fetch Locations
      try {
        const { data } = await api.get('/locations');
        setLocations(data);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      }
    } catch (err) {
      console.error('Final error in fetchData:', err);
    } finally {
      setLoading(false);
    }
  };



  const handleEdit = (admin) => {
    setEditingAdmin({
      ...admin,
      locationId: admin.locationId?._id || admin.locationId || '',
      password: '' // Don't show current password
    });
    setShowEdit(true);
    setShowCreate(false);
    setShowPassword(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      // Ensure pincodes are saved correctly
      const updatedData = {
        ...editingAdmin,
        pincodes: editingAdmin.pincodes || []
      };
      await api.put(`/auth/sales/${editingAdmin._id}`, updatedData);
      setStatus({ type: 'success', message: 'Sales account updated successfully!' });
      setShowEdit(false);
      setEditingAdmin(null);
      fetchData();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update admin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return;

    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.delete(`/auth/sales/${id}`);
      setStatus({ type: 'success', message: 'Sales account deleted successfully!' });
      fetchData();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to delete admin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const dataToSubmit = {
        ...createData,
        pincodes: createData.pincodes || []
      };
      await api.post('/auth/sales', dataToSubmit);
      setStatus({ type: 'success', message: 'New sales account created successfully!' });
      setShowCreate(false);
      setCreateData({ name: '', email: '', phone: '', password: '', role: 'sales', locationId: currentLocId, permissions: [], pincodes: [] });
      fetchData();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to create admin.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      return setStatus({ type: 'error', message: 'Passwords do not match.' });
    }
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      await api.put('/auth/change-password', passData);
      setStatus({ type: 'success', message: 'Password updated successfully!' });
      setShowPassword(false);
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] m-0">Sales Team</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">Manage sales executive accounts, locations and pincode assignments</p>
        </div>
        <button 
          onClick={exportSales} 
          className="btn-primary" 
          style={{ 
            background: 'var(--glass-bg)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--glass-border)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            height: '42px',
            padding: '0 20px',
            borderRadius: '12px'
          }}
        >
          <Download size={18} /> Export
        </button>
      </div>

      {status.message && (
        <div style={{
          background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${status.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: status.type === 'success' ? '#22c55e' : '#ef4444',
          padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span style={{ fontSize: '14px' }}>{status.message}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

        {/* Create Admin (Only for Super Admin) */}
        {currentUser.role === 'super_admin' && (
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#6366f1' }}>
                <UserPlus size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>New Sales Executive</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Create sales account and assign pincodes</p>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => { setShowCreate(true); setShowPassword(false); }}>
              <UserPlus size={18} />
              <span>Create Sales Account</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin List */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Sales Team Members</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>NAME</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>PHONE</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>ROLE</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>LOCATION</th>

                {currentUser.role === 'super_admin' && (
                  <th style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '12px' }}>ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600 }}>{admin.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{admin.email}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '13px' }}>{admin.phone || '-'}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      background: admin.role === 'super_admin' ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)',
                      color: admin.role === 'super_admin' ? 'var(--primary)' : 'var(--text-main)',
                      textTransform: 'uppercase'
                    }}>
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700 }}>{admin.locationId ? (admin.locationId.name || admin.locationId.city) : 'Global Access'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', maxWidth: '400px', wordBreak: 'break-all' }}>
                          {admin.locationId ? (
                            <>
                              <span style={{ fontWeight: 600 }}>{admin.locationId.city}</span>
                              {admin.pincodes && admin.pincodes.length > 0 ? ` (${admin.pincodes.join(', ')})` : ' (No Pincodes)'}
                            </>
                          ) : 'All Locations'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {currentUser.role === 'super_admin' && (
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(admin)}
                          style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                          <Settings size={16} />
                        </button>
                        {admin._id !== currentUser._id && (
                          <button
                            onClick={() => handleDelete(admin._id)}
                            style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', borderRadius: '32px', overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Create Sales Account</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input type="text" placeholder="Full Name" className="input-field" required value={createData.name} onChange={e => setCreateData({ ...createData, name: e.target.value })} />
                <input type="email" placeholder="Email Address" className="input-field" required value={createData.email} onChange={e => setCreateData({ ...createData, email: e.target.value })} />
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input type="text" placeholder="Phone Number" className="input-field pl-12 input-with-icon" value={createData.phone} onChange={e => setCreateData({ ...createData, phone: e.target.value })} />
                </div>
                <input type="password" placeholder="Password" className="input-field" required value={createData.password} onChange={e => setCreateData({ ...createData, password: e.target.value })} />
                
                <select
                  className="input-field"
                  value={createData.locationId}
                  onChange={e => setCreateData({ ...createData, locationId: e.target.value })}
                  disabled={!!currentLocId}
                  style={{ opacity: currentLocId ? 0.7 : 1, cursor: currentLocId ? 'not-allowed' : 'pointer' }}
                >
                  {!currentLocId && <option value="">All Locations (Global)</option>}
                  {locations
                    .filter(loc => currentLocId ? loc._id === currentLocId : true)
                    .map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.city} ({loc.name})</option>
                  ))}
                </select>
              </div>

              {/* Pincodes Selection for Create */}
              {createData.locationId && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>
                    Assigned Pincodes (Optional)
                  </label>
                  {loadingPincodes ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}><Loader2 size={14} className="animate-spin inline mr-2" /> Fetching database pincodes...</div>
                  ) : availablePincodes.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#ef4444' }}>No pincodes found in this database.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
                      {availablePincodes.map(pc => {
                        const isSelected = createData.pincodes?.includes(pc.code);
                        return (
                          <div
                            key={pc.code}
                            onClick={() => {
                              const newPincodes = isSelected
                                ? createData.pincodes.filter(p => p !== pc.code)
                                : [...(createData.pincodes || []), pc.code];
                              setCreateData({ ...createData, pincodes: newPincodes });
                            }}
                            style={{
                              padding: '10px',
                              borderRadius: '12px',
                              textAlign: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--glass-border)'}`,
                              background: isSelected ? 'var(--primary)' : 'var(--glass-bg)',
                              color: isSelected ? '#fff' : 'var(--text-main)',
                              transition: '0.2s'
                            }}
                          >
                            {pc.code}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-primary" style={{ flex: 1, background: 'var(--glass-bg)', color: 'var(--text-main)' }}>Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2 }}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && editingAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', borderRadius: '32px', overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Edit Sales Account</h3>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdate} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input type="text" placeholder="Full Name" className="input-field" required value={editingAdmin.name} onChange={e => setEditingAdmin({ ...editingAdmin, name: e.target.value })} />
                <input type="email" placeholder="Email Address" className="input-field" required value={editingAdmin.email} onChange={e => setEditingAdmin({ ...editingAdmin, email: e.target.value })} />
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                  <input type="text" placeholder="Phone Number" className="input-field pl-12 input-with-icon" value={editingAdmin.phone} onChange={e => setEditingAdmin({ ...editingAdmin, phone: e.target.value })} />
                </div>
                <input type="password" placeholder="New Password (leave blank to keep current)" className="input-field" value={editingAdmin.password} onChange={e => setEditingAdmin({ ...editingAdmin, password: e.target.value })} />
                
                <select
                  className="input-field"
                  value={editingAdmin.locationId}
                  onChange={e => setEditingAdmin({ ...editingAdmin, locationId: e.target.value })}
                  disabled={!!currentLocId}
                  style={{ opacity: currentLocId ? 0.7 : 1, cursor: currentLocId ? 'not-allowed' : 'pointer' }}
                >
                  {!currentLocId && <option value="">All Locations (Global)</option>}
                  {locations
                    .filter(loc => currentLocId ? loc._id === currentLocId : true)
                    .map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.city} ({loc.name})</option>
                  ))}
                </select>
              </div>

              {/* Pincodes Selection for Edit */}
              {editingAdmin?.locationId && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px' }}>
                    Assigned Pincodes (Optional)
                  </label>
                  {loadingPincodes ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}><Loader2 size={14} className="animate-spin inline mr-2" /> Fetching database pincodes...</div>
                  ) : availablePincodes.length === 0 ? (
                    <div style={{ fontSize: '13px', color: '#ef4444' }}>No pincodes found in this database.</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
                      {availablePincodes.map(pc => {
                        const isSelected = editingAdmin.pincodes?.includes(pc.code);
                        return (
                          <div
                            key={pc.code}
                            onClick={() => {
                              const newPincodes = isSelected
                                ? editingAdmin.pincodes.filter(p => p !== pc.code)
                                : [...(editingAdmin.pincodes || []), pc.code];
                              setEditingAdmin({ ...editingAdmin, pincodes: newPincodes });
                            }}
                            style={{
                              padding: '10px',
                              borderRadius: '12px',
                              textAlign: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--glass-border)'}`,
                              background: isSelected ? 'var(--primary)' : 'var(--glass-bg)',
                              color: isSelected ? '#fff' : 'var(--text-main)',
                              transition: '0.2s'
                            }}
                          >
                            {pc.code}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowEdit(false)} className="btn-primary" style={{ flex: 1, background: 'var(--glass-bg)', color: 'var(--text-main)' }}>Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2 }}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPassword && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', borderRadius: '32px', overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Update Password</h3>
              <button onClick={() => setShowPassword(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleChangePassword} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="password" placeholder="Current Password" className="input-field" required value={passData.currentPassword} onChange={e => setPassData({ ...passData, currentPassword: e.target.value })} />
              <input type="password" placeholder="New Password" className="input-field" required value={passData.newPassword} onChange={e => setPassData({ ...passData, newPassword: e.target.value })} />
              <input type="password" placeholder="Confirm New Password" className="input-field" required value={passData.confirmPassword} onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })} />
              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '12px' }}>
                {loading ? <Loader2 className="animate-spin" /> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
