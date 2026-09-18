import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import {
  Users, UserPlus, Key, Shield, Loader2, CheckCircle2,
  AlertCircle, MapPin, Settings, Trash2, X, Lock, Phone, Download
} from 'lucide-react';

const Admins = () => {
  const [admins, setAdmins] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [editingAdmin, setEditingAdmin] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');

  const [createData, setCreateData] = useState({
    name: '', email: '', phone: '', password: '', role: 'manager',
    locationId: currentUser.locationId || '', targetSegment: 'B2C', permissions: [], pincodes: []
  });
  const [passData, setPassData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [availablePincodes, setAvailablePincodes] = useState([]);

  useEffect(() => {
    if (showCreate && createData.locationId) {
      fetchPincodes(createData.locationId);
    } else if (showEdit && editingAdmin?.locationId) {
      fetchPincodes(editingAdmin.locationId);
    } else {
      setAvailablePincodes([]);
    }
  }, [createData.locationId, editingAdmin?.locationId, showCreate, showEdit]);

  const fetchPincodes = async (locId) => {
    try {
      const { data } = await api.get(`/locations/${locId}/pincodes`);
      const unique = [];
      const seen = new Set();
      data.forEach(p => {
        if (!seen.has(p.code)) {
          seen.add(p.code);
          unique.push(p);
        }
      });
      setAvailablePincodes(unique);
    } catch (err) {
      console.error('Failed to fetch pincodes:', err);
    }
  };

  const handlePincodeToggle = (code, isEdit = false) => {
    if (isEdit) {
      setEditingAdmin(prev => ({
        ...prev,
        pincodes: (prev.pincodes || []).includes(code)
          ? prev.pincodes.filter(p => p !== code)
          : [...(prev.pincodes || []), code]
      }));
    } else {
      setCreateData(prev => ({
        ...prev,
        pincodes: (prev.pincodes || []).includes(code)
          ? prev.pincodes.filter(p => p !== code)
          : [...(prev.pincodes || []), code]
      }));
    }
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

  const permissionOptions = [
    { value: 'view_dashboard', label: 'Dashboard' },
    { value: 'manage_products', label: 'Products' },
    { value: 'manage_categories', label: 'Categories' },
    { value: 'manage_subcategories', label: 'Subcategories' },
    { value: 'manage_orders', label: 'Orders' },
    { value: 'manage_drivers', label: 'Drivers' },
    { value: 'manage_sellers', label: 'Sellers' },
    { value: 'manage_users', label: 'Users' },
    { value: 'manage_cash', label: 'Cash Management' },
    { value: 'manage_b2b_verification', label: 'B2B Verification' },
    { value: 'manage_deliveries', label: 'Deliveries' },
    { value: 'manage_reviews', label: 'Reviews' },
    { value: 'manage_bulk_upload', label: 'Bulk Upload' },
    { value: 'manage_admins', label: 'Admins' },
    { value: 'manage_locations', label: 'Locations' },
    { value: 'manage_profile', label: 'Profile' },
    { value: 'manage_invoices', label: 'Invoices' }
  ];

  useEffect(() => {
    fetchData();
  }, [showCreate, showEdit]);

  const fetchData = async () => {
    try {
      // Fetch Admins
      try {
        const { data } = await api.get('/auth/admins');
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

  const handlePermissionToggle = (perm, isEdit = false) => {
    if (isEdit) {
      setEditingAdmin(prev => ({
        ...prev,
        permissions: prev.permissions.includes(perm)
          ? prev.permissions.filter(p => p !== perm)
          : [...prev.permissions, perm]
      }));
    } else {
      setCreateData(prev => ({
        ...prev,
        permissions: prev.permissions.includes(perm)
          ? prev.permissions.filter(p => p !== perm)
          : [...prev.permissions, perm]
      }));
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
      await api.put(`/auth/admins/${editingAdmin._id}`, editingAdmin);
      setStatus({ type: 'success', message: 'Admin account updated successfully!' });
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
      await api.delete(`/auth/admins/${id}`);
      setStatus({ type: 'success', message: 'Admin account deleted successfully!' });
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
      await api.post('/auth/create-admin', createData);
      setStatus({ type: 'success', message: 'New admin account created successfully!' });
      setShowCreate(false);
      setCreateData({ name: '', email: '', phone: '', password: '', role: 'manager', locationId: currentUser.locationId || '', targetSegment: 'B2C', permissions: [], pincodes: [] });
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

  const handleExport = () => {
    if (!admins || admins.length === 0) {
      alert("No administrative staff records to export!");
      return;
    }

    const mappedData = admins.map(admin => ({
      "Admin ID": admin._id,
      "Name": admin.name,
      "Email": admin.email,
      "Phone": admin.phone || '-',
      "Role": admin.role ? admin.role.replace('_', ' ').toUpperCase() : '-',
      "Target segment": admin.targetSegment || 'Both',
      "Location Access": admin.locationId ? (admin.locationId.name || admin.locationId.city) : 'Global Access',
      "Pincodes": admin.pincodes && admin.pincodes.length > 0 ? admin.pincodes.join(', ') : 'Full Access',
      "Field Permissions": admin.permissions && admin.permissions.length > 0 ? admin.permissions.join(', ') : 'Full Access'
    }));

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Administrative Staff");
    XLSX.writeFile(wb, "Zudo_Administrative_Staff_Registry.xlsx");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--text-main)] m-0">Team & Security</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">Manage administrative accounts and permissions</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleExport}
            className="btn-primary"
            style={{
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download size={18} />
            <span>Export Admins</span>
          </button>
        </div>
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

        {/* Create Admin (For Super Admin and Admin) */}
        {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', maxWidth: '400px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#6366f1' }}>
                <UserPlus size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>New Team Member</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Create specific admin roles</p>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => { setShowCreate(true); setShowPassword(false); }}>
              <UserPlus size={18} />
              <span>Create New Admin</span>
            </button>
          </div>
        )}
      </div>

      {/* Admin List */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Administrative Team</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--card-bg)' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>NAME</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>PHONE</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>ROLE</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>LOCATION</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>PINCODES</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: 'var(--text-dim)', fontSize: '12px' }}>PERMISSIONS</th>
                {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
                  <th style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--text-dim)', fontSize: '12px' }}>ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin._id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background-color 0.2s' }} className="hover:bg-white/5">
                  <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{admin.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>{admin.email}</div>
                  </td>
                  <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>{admin.phone || '-'}</div>
                  </td>
                  <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                      background: admin.role === 'super_admin' ? 'rgba(99, 102, 241, 0.1)' : 'var(--glass-bg)',
                      color: admin.role === 'super_admin' ? 'var(--primary)' : 'var(--text-main)',
                      border: admin.role === 'super_admin' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid var(--glass-border)',
                      textTransform: 'uppercase'
                    }}>
                      {admin.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <MapPin size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>{admin.locationId ? (admin.locationId.name || admin.locationId.city) : 'Global Access'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {admin.locationId ? (() => {
                            const totalPins = admin.locationId.pincode ? admin.locationId.pincode.split(',').filter(p => p.trim()).length : 0;
                            return `${admin.locationId.city} • ${totalPins} Pin Areas`;
                          })() : 'All Locations'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '220px' }}>
                      {admin.pincodes?.length > 0 ? admin.pincodes.map(pc => (
                        <span 
                          key={pc} 
                          style={{ 
                            fontSize: '10px', 
                            padding: '3px 8px', 
                            background: 'rgba(99, 102, 241, 0.08)', 
                            borderRadius: '6px', 
                            color: 'var(--primary)', 
                            fontWeight: 600,
                            border: '1px solid rgba(99, 102, 241, 0.15)' 
                          }}
                        >
                          {pc}
                        </span>
                      )) : <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Full Access</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '260px' }}>
                      {admin.permissions?.length > 0 ? admin.permissions.map(p => (
                        <span 
                          key={p} 
                          style={{ 
                            fontSize: '10px', 
                            padding: '3px 8px', 
                            background: 'var(--glass-bg)', 
                            borderRadius: '6px', 
                            color: 'var(--text-dim)', 
                            fontWeight: 500,
                            border: '1px solid var(--glass-border)' 
                          }}
                        >
                          {p.replace('manage_', '').replace('_', ' ')}
                        </span>
                      )) : <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Full Access</span>}
                    </div>
                  </td>
                  {(currentUser.role === 'super_admin' || currentUser.role === 'admin') && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', borderRadius: '32px', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Create Admin Account</h3>
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
                <select className="input-field" value={createData.role} onChange={e => setCreateData({ ...createData, role: e.target.value })}>
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <select
                  className="input-field"
                  value={createData.locationId}
                  onChange={e => setCreateData({ ...createData, locationId: e.target.value })}
                >
                  <option value="">All Locations (Global)</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.city} ({loc.name})</option>
                  ))}
                </select>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Target Customer Segment</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['B2B', 'B2C'].map(seg => (
                      <button
                        key={seg}
                        type="button"
                        onClick={() => setCreateData({ ...createData, targetSegment: seg })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                          background: createData.targetSegment === seg ? 'var(--primary)' : 'var(--glass-bg)',
                          color: createData.targetSegment === seg ? 'white' : 'var(--text-main)',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.2s'
                        }}
                      >
                        {`${seg} Only`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {availablePincodes.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Assigned Pincodes (Optional)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
                    {availablePincodes.map(pc => (
                      <div
                        key={pc.code}
                        onClick={() => handlePincodeToggle(pc.code)}
                        style={{
                          padding: '10px', borderRadius: '12px', textAlign: 'center',
                          background: createData.pincodes?.includes(pc.code) ? 'var(--primary)' : 'var(--glass-bg)',
                          color: createData.pincodes?.includes(pc.code) ? 'white' : 'var(--text-main)',
                          fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                          border: '1px solid var(--glass-border)'
                        }}
                      >
                        {pc.code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Permissions / Field Access</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {permissionOptions.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => handlePermissionToggle(opt.value)}
                      style={{
                        padding: '10px', borderRadius: '12px', background: createData.permissions.includes(opt.value) ? 'var(--primary)' : 'var(--glass-bg)',
                        color: createData.permissions.includes(opt.value) ? 'white' : 'var(--text-main)',
                        fontSize: '12px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <Settings size={14} />
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>

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
          <div className="glass-card" style={{ width: '100%', maxWidth: '700px', borderRadius: '32px', overflowY: 'auto', maxHeight: '90vh' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Edit Admin Account</h3>
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
                <select className="input-field" value={editingAdmin.role} onChange={e => setEditingAdmin({ ...editingAdmin, role: e.target.value })}>
                  {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <select
                  className="input-field"
                  value={editingAdmin.locationId}
                  onChange={e => setEditingAdmin({ ...editingAdmin, locationId: e.target.value })}
                >
                  <option value="">All Locations (Global)</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.city} ({loc.name})</option>
                  ))}
                </select>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Target Customer Segment</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {['B2B', 'B2C'].map(seg => (
                      <button
                        key={seg}
                        type="button"
                        onClick={() => setEditingAdmin({ ...editingAdmin, targetSegment: seg })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)',
                          background: editingAdmin.targetSegment === seg ? 'var(--primary)' : 'var(--glass-bg)',
                          color: editingAdmin.targetSegment === seg ? 'white' : 'var(--text-main)',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.2s'
                        }}
                      >
                        {`${seg} Only`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {availablePincodes.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Assigned Pincodes (Optional)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
                    {availablePincodes.map(pc => (
                      <div
                        key={pc.code}
                        onClick={() => handlePincodeToggle(pc.code, true)}
                        style={{
                          padding: '10px', borderRadius: '12px', textAlign: 'center',
                          background: editingAdmin.pincodes?.includes(pc.code) ? 'var(--primary)' : 'var(--glass-bg)',
                          color: editingAdmin.pincodes?.includes(pc.code) ? 'white' : 'var(--text-main)',
                          fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                          border: '1px solid var(--glass-border)'
                        }}
                      >
                        {pc.code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Permissions / Field Access</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {permissionOptions.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => handlePermissionToggle(opt.value, true)}
                      style={{
                        padding: '10px', borderRadius: '12px', background: editingAdmin.permissions?.includes(opt.value) ? 'var(--primary)' : 'var(--glass-bg)',
                        color: editingAdmin.permissions?.includes(opt.value) ? 'white' : 'var(--text-main)',
                        fontSize: '12px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                    >
                      <Settings size={14} />
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>

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

export default Admins;
