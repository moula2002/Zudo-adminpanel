import React, { useState, useEffect } from 'react';
import api, { uploadApi } from '../utils/api';
import { Truck, Plus, Search, Mail, Phone, Hash, Car, Loader2, CheckCircle2, Trash2, XCircle, MapPin, MapPinOff, RefreshCw, FileText, Calendar, AlertTriangle, ExternalLink, UploadCloud, Check, Download, Key } from 'lucide-react';
import * as XLSX from 'xlsx';

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    licenseNumber: '',
    vehicleDetails: '',
    type: 'B2C',
    cashManagement: false,
    documents: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [newDocData, setNewDocData] = useState({
    name: 'Driving License',
    url: '',
    validityDate: '',
    uploading: false
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const { data } = await api.get('/drivers');
      setDrivers(data);
    } catch (err) {
      console.error('Failed to fetch drivers', err);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatus = (validityDate) => {
    if (!validityDate) return { label: 'No Expiry', color: 'var(--text-dim)', bg: 'rgba(148, 163, 184, 0.1)' };
    const expiry = new Date(validityDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return { label: 'Expired', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    }

    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) {
      return { label: `Expiring in ${diffDays} days`, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    }

    return { label: 'Valid / Active', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' };
  };

  const handleDocFileChange = async (index, file) => {
    if (!file) return;

    const updatedDocs = [...formData.documents];
    updatedDocs[index].uploading = true;
    setFormData({ ...formData, documents: updatedDocs });

    try {
      const fileData = new FormData();
      fileData.append('file', file);
      const uploadRes = await uploadApi.post('/upload', fileData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const newDocs = [...formData.documents];
      newDocs[index].url = uploadRes.data.url;
      newDocs[index].uploading = false;
      setFormData({ ...formData, documents: newDocs });
    } catch (err) {
      alert('Failed to upload document file');
      const newDocs = [...formData.documents];
      newDocs[index].uploading = false;
      setFormData({ ...formData, documents: newDocs });
    }
  };

  const addDocumentRow = () => {
    setFormData({
      ...formData,
      documents: [
        ...formData.documents,
        { name: 'Driving License', url: '', validityDate: '', uploading: false }
      ]
    });
  };

  const removeDocumentRow = (index) => {
    const updated = formData.documents.filter((_, i) => i !== index);
    setFormData({ ...formData, documents: updated });
  };

  const updateDocumentField = (index, field, value) => {
    const updated = [...formData.documents];
    updated[index][field] = value;
    setFormData({ ...formData, documents: updated });
  };

  const handleUpdateDocFileChange = async (file) => {
    if (!file) return;
    setNewDocData(prev => ({ ...prev, uploading: true }));
    try {
      const fileData = new FormData();
      fileData.append('file', file);
      const uploadRes = await uploadApi.post('/upload', fileData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setNewDocData(prev => ({ ...prev, url: uploadRes.data.url, uploading: false }));
    } catch (err) {
      alert('Failed to upload document file');
      setNewDocData(prev => ({ ...prev, uploading: false }));
    }
  };

  const handleAddOrUpdateDriverDocument = async (e) => {
    e.preventDefault();
    if (!newDocData.url) {
      alert('Please upload the document file first');
      return;
    }
    if (!newDocData.validityDate) {
      alert('Please select a validity/expiry date');
      return;
    }

    try {
      const updatedDocs = [...(selectedDriver.documents || [])];
      const existingIdx = updatedDocs.findIndex(d => d.name === newDocData.name);
      if (existingIdx > -1) {
        updatedDocs[existingIdx] = {
          name: newDocData.name,
          url: newDocData.url,
          validityDate: newDocData.validityDate,
          status: 'approved'
        };
      } else {
        updatedDocs.push({
          name: newDocData.name,
          url: newDocData.url,
          validityDate: newDocData.validityDate,
          status: 'approved'
        });
      }

      const { data } = await api.put(`/drivers/${selectedDriver._id}`, { documents: updatedDocs });
      setSelectedDriver(data);
      setNewDocData({ name: 'Driving License', url: '', validityDate: '', uploading: false });
      fetchDrivers();
    } catch (err) {
      alert('Failed to update driver documents');
    }
  };

  const handleDeleteDriverDocument = async (docName) => {
    if (!window.confirm(`Are you sure you want to delete the "${docName}" document?`)) return;
    try {
      const updatedDocs = (selectedDriver.documents || []).filter(d => d.name !== docName);
      const { data } = await api.put(`/drivers/${selectedDriver._id}`, { documents: updatedDocs });
      setSelectedDriver(data);
      fetchDrivers();
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  const fetchDriverLocation = async (driverId) => {
    setLoadingLocation(true);
    setLocationError(null);
    try {
      const { data } = await api.get(`/drivers/${driverId}/location`);
      if (data && data.active === false) {
        setLocationError(data.message || 'Live tracking is only active when the driver is delivering an active (Picked Up or Out for Delivery) order.');
        setDriverLocation(null);
      } else {
        setDriverLocation(data);
      }
    } catch (err) {
      console.error('Failed to fetch driver live location', err);
      setLocationError(err.response?.data?.message || 'Driver live location is not available right now.');
      setDriverLocation(null);
    } finally {
      setLoadingLocation(false);
    }
  };

  const fetchDriverAttendance = async (driverId) => {
    setLoadingAttendance(true);
    try {
      const { data } = await api.get(`/drivers/${driverId}/attendance`);
      setAttendance(data);
    } catch (err) {
      console.error('Failed to fetch attendance history', err);
      setAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchDriverHistory = async (driver) => {
    setSelectedDriver(driver);
    setShowHistory(true);
    setLoadingHistory(true);
    fetchDriverLocation(driver._id);
    fetchDriverAttendance(driver._id);
    try {
      const { data } = await api.get(`/orders/admin/all`);
      const driverOrders = data.filter(order => order.driverId?._id === driver._id);
      setHistory(driverOrders);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleType = async (e, driver) => {
    e.stopPropagation();
    const newType = driver.type === 'B2B' ? 'B2C' : 'B2B';
    try {
      await api.put(`/drivers/${driver._id}`, { type: newType });
      fetchDrivers();
    } catch (err) {
      alert('Failed to update driver type');
    }
  };

  const toggleCashManagement = async (e, driver) => {
    e.stopPropagation();
    const newValue = !driver.cashManagement;
    try {
      await api.put(`/drivers/${driver._id}`, { cashManagement: newValue });
      fetchDrivers();
    } catch (err) {
      alert('Failed to update cash management status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      await api.delete(`/drivers/${id}`);
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete driver');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');
      const payload = {
        ...formData,
        locationId: formData.locationId || currentUser.locationId
      };
      await api.post('/drivers', payload);
      setShowModal(false);
      setFormData({ name: '', phone: '', email: '', password: '', licenseNumber: '', vehicleDetails: '', type: 'B2C', cashManagement: false, documents: [] });
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create driver');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.trim() === '') {
      alert('Please enter a new password');
      return;
    }
    setUpdatingPassword(true);
    try {
      await api.put(`/drivers/${selectedDriver._id}`, { password: newPassword });
      alert('Password updated successfully');
      setNewPassword('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const exportDrivers = () => {
    const exportData = drivers.map(driver => ({
      'Driver ID': driver._id,
      Name: driver.name,
      Phone: driver.phone,
      Email: driver.email || 'N/A',
      'License Number': driver.licenseNumber,
      'Vehicle Details': driver.vehicleDetails,
      Type: driver.type || 'B2C',
      'Cash Management Enabled': driver.cashManagement ? 'YES' : 'NO',
      'Wallet Balance': driver.wallet || 0,
      Status: driver.status ? driver.status.toUpperCase() : ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Drivers");
    XLSX.writeFile(wb, "Zudo_Drivers_Directory.xlsx");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
          <input type="text" placeholder="Search drivers..." className="input-field" style={{ paddingLeft: '40px', paddingBottom: '10px', paddingTop: '10px' }} />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={exportDrivers}
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
            <Download size={18} /> Export
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} />
            <span>Add Driver</span>
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'var(--card-bg)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Driver Name</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Contact info</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>License No.</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Vehicle</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Type</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Cash Mgmt</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '48px', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" style={{ margin: '0 auto', color: '#6366f1' }} />
                </td>
              </tr>
            ) : drivers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>No drivers found</td>
              </tr>
            ) : drivers.map((driver) => (
              <tr
                key={driver._id}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                className="hover:bg-white/5 transition-colors"
                onClick={() => fetchDriverHistory(driver)}
              >
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {driver.name[0]}
                    </div>
                    <span>{driver.name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)' }}>
                      <Phone size={12} /> {driver.phone}
                    </div>
                    {driver.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)' }}>
                        <Mail size={12} /> {driver.email}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontFamily: 'monospace' }}>{driver.licenseNumber}</span>
                    {driver.documents && driver.documents.length > 0 && (() => {
                      const expiredDocs = driver.documents.filter(d => {
                        const status = getDocumentStatus(d.validityDate);
                        return status.label === 'Expired';
                      });
                      const expiringDocs = driver.documents.filter(d => {
                        const status = getDocumentStatus(d.validityDate);
                        return status.label.startsWith('Expiring');
                      });

                      if (expiredDocs.length > 0) {
                        return (
                          <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={10} /> {expiredDocs.length} Expired
                          </span>
                        );
                      }
                      if (expiringDocs.length > 0) {
                        return (
                          <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={10} /> Expiring Soon
                          </span>
                        );
                      }
                      return (
                        <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700 }}>
                          Docs Verified
                        </span>
                      );
                    })()}
                  </div>
                </td>
                <td style={{ padding: '16px 24px', fontSize: '13px' }}>{driver.vehicleDetails}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span
                    onClick={(e) => toggleType(e, driver)}
                    style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                      background: driver.type === 'B2B' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(236, 72, 153, 0.1)',
                      color: driver.type === 'B2B' ? '#6366f1' : '#ec4899',
                      cursor: 'pointer',
                      transition: '0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.2)'}
                    onMouseOut={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                    title="Click to toggle B2B/B2C"
                  >
                    {driver.type || 'B2C'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div
                    onClick={(e) => toggleCashManagement(e, driver)}
                    style={{
                      width: '40px',
                      height: '20px',
                      borderRadius: '10px',
                      background: driver.cashManagement ? '#22c55e' : '#475569',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: '0.3s'
                    }}
                  >
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: driver.cashManagement ? '22px' : '2px',
                      transition: '0.3s'
                    }} />
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    background: driver.status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: driver.status === 'active' ? '#22c55e' : '#ef4444'
                  }}>
                    {driver.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchDriverHistory(driver);
                      }}
                      style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#22c55e',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '11px',
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
                      <MapPin size={12} style={{ filter: 'drop-shadow(0 0 4px #22c55e)' }} />
                      Track Live
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchDriverHistory(driver);
                      }}
                      style={{
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#6366f1',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontWeight: 700,
                        fontSize: '11px',
                        transition: 'all 0.2s'
                      }}
                      title="Update driver password"
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Key size={12} style={{ filter: 'drop-shadow(0 0 4px #6366f1)' }} />
                      Password
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(driver._id);
                      }}
                      style={{
                        background: 'none', border: 'none', color: '#ef4444',
                        cursor: 'pointer', padding: '8px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Driver History Modal */}
      {showHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: '900px', padding: '32px', borderRadius: '32px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main)' }}>{selectedDriver.name}'s Profile Details</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>License: {selectedDriver.licenseNumber} • Vehicle: {selectedDriver.vehicleDetails}</p>
              </div>
              <button onClick={() => setShowHistory(false)} style={{ background: 'var(--input-bg)', border: 'none', color: 'var(--text-main)', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '32px', marginTop: '16px' }}>
              {/* Left Column: Live Location Tracker */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <MapPin size={18} style={{ color: '#6366f1' }} />
                    Live Tracking
                  </h4>
                  <button
                    onClick={() => fetchDriverLocation(selectedDriver._id)}
                    disabled={loadingLocation}
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: 'none',
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
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                  >
                    <RefreshCw size={12} className={loadingLocation ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>

                {loadingLocation ? (
                  <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                    <Loader2 className="animate-spin" style={{ color: '#6366f1' }} size={24} />
                  </div>
                ) : locationError ? (
                  <div style={{ height: '300px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--glass-border)', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                      <MapPinOff size={24} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Tracking Unavailable</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '240px', lineHeight: 1.5 }}>
                      {locationError.includes('disabled')
                        ? 'Live tracking is only active when the driver is delivering an active (Picked Up or Out for Delivery) order.'
                        : locationError}
                    </p>
                  </div>
                ) : driverLocation && driverLocation.lat != null ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ overflow: 'hidden', borderRadius: '20px', border: '1px solid var(--glass-border)', background: '#000', position: 'relative', height: '300px' }}>
                      <iframe
                        title="Driver Live Location"
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${driverLocation.lng - 0.005}%2C${driverLocation.lat - 0.005}%2C${driverLocation.lng + 0.005}%2C${driverLocation.lat + 0.005}&layer=mapnik&marker=${driverLocation.lat}%2C${driverLocation.lng}`}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid var(--glass-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        <span className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 8px #22c55e' }} />
                        <span style={{ color: '#22c55e' }}>LIVE TRACKING</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)', fontSize: '12px' }}>
                      <div style={{ color: 'var(--text-dim)' }}>
                        Last updated: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{new Date(driverLocation.updatedAt).toLocaleTimeString()}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${driverLocation.lat},${driverLocation.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#6366f1',
                          fontWeight: 600,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--glass-border)', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                      <MapPinOff size={24} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>No Coordinates</div>
                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', maxWidth: '240px', lineHeight: 1.5 }}>
                      Press refresh or make sure driver has an active shipment.
                    </p>
                  </div>
                )}

                {/* Attendance Registry HUD */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                    <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                    Attendance Registry (Last 7 Days)
                  </h4>
                  {loadingAttendance ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto', color: '#6366f1' }} size={20} />
                    </div>
                  ) : attendance.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                      No attendance registry records available.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                      {attendance.map((day, idx) => {
                        const dateObj = new Date(day.date);
                        const isPresent = day.status === 'Present';
                        const isWorking = day.deliveriesCompleted > 0 && day.deliveriesCompleted < 5;

                        return (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              padding: '10px 4px',
                              background: 'var(--card-bg)',
                              border: `1px solid ${isPresent ? 'rgba(34, 197, 94, 0.3)' : isWorking ? 'rgba(234, 179, 8, 0.3)' : 'var(--glass-border)'}`,
                              borderRadius: '12px',
                              textAlign: 'center',
                              boxShadow: isPresent ? '0 0 10px rgba(34, 197, 94, 0.05)' : 'none'
                            }}
                          >
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                              {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                              {dateObj.toLocaleDateString('en-US', { day: 'numeric' })}
                            </span>

                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: isPresent ? 'rgba(34, 197, 94, 0.15)' : isWorking ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1.5px solid ${isPresent ? '#22c55e' : isWorking ? '#eab308' : 'var(--glass-border)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '8px',
                                fontSize: '10px',
                                fontWeight: 800,
                                color: isPresent ? '#22c55e' : isWorking ? '#eab308' : 'var(--text-dim)'
                              }}
                              title={`${day.deliveriesCompleted} deliveries completed`}
                            >
                              {day.deliveriesCompleted}
                            </div>

                            <span
                              style={{
                                fontSize: '8px',
                                fontWeight: 800,
                                color: isPresent ? '#22c55e' : isWorking ? '#eab308' : 'var(--text-dim)',
                                textTransform: 'uppercase',
                                marginTop: '6px'
                              }}
                            >
                              {isPresent ? 'Present' : isWorking ? 'Half-Day' : 'Off'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Delivery History */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <Truck size={18} style={{ color: '#6366f1' }} />
                  Delivery Shipments ({history.length})
                </h4>

                <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                  {loadingHistory ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                      <Loader2 className="animate-spin" style={{ margin: '0 auto', color: '#6366f1' }} />
                    </div>
                  ) : history.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '14px' }}>
                      No delivery history found for this driver.
                    </div>
                  ) : (
                    history.map(order => (
                      <div key={order._id} style={{ padding: '16px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' }}>Order #{order._id.slice(-8).toUpperCase()}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {new Date(order.createdAt).toLocaleDateString()} • {order.items.length} Items • ₹{order.totalAmount}
                          </div>
                        </div>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                          background: order.orderStatus === 'Delivered' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                          color: order.orderStatus === 'Delivered' ? '#22c55e' : '#6366f1'
                        }}>
                          {order.orderStatus.toUpperCase()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Full-width Section: Driver Verified Documents (Validity Check & Upload) */}
            <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '24px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <FileText size={18} style={{ color: '#6366f1' }} />
                  Driver Documents & Validity Verification
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px' }}>
                {/* List of Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(!selectedDriver.documents || selectedDriver.documents.length === 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'var(--input-bg)', borderRadius: '20px', border: '1px dashed var(--glass-border)', color: 'var(--text-dim)', textAlign: 'center', gap: '8px' }}>
                      <AlertTriangle size={32} style={{ color: '#eab308' }} />
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>No Documents Uploaded</div>
                      <p style={{ fontSize: '12px', maxWidth: '280px', lineHeight: 1.5 }}>
                        Upload Driver's Driving License, Aadhaar, or other legal documents to track their validity status.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {selectedDriver.documents.map((doc, idx) => {
                        const validity = getDocumentStatus(doc.validityDate);
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '16px',
                              borderRadius: '20px',
                              background: 'var(--card-bg)',
                              border: '1px solid var(--glass-border)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              position: 'relative',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <FileText size={18} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{doc.name}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    <Calendar size={12} />
                                    Expires: {new Date(doc.validityDate).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteDriverDocument(doc.name)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: 700,
                                background: validity.bg,
                                color: validity.color
                              }}>
                                {validity.label.toUpperCase()}
                              </span>

                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#6366f1',
                                  textDecoration: 'none'
                                }}
                              >
                                View File <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right sidebar inside grid containing forms */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Document Upload/Update Panel */}
                  <form
                    onSubmit={handleAddOrUpdateDriverDocument}
                    style={{
                      padding: '24px',
                      borderRadius: '24px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Upload / Update Document
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Document Type</label>
                      <select
                        className="input-field"
                        style={{ fontSize: '12px', height: '38px', padding: '0 12px' }}
                        value={newDocData.name}
                        onChange={(e) => setNewDocData({ ...newDocData, name: e.target.value })}
                      >
                        <option value="Driving License">Driving License</option>
                        <option value="Aadhaar Card">Aadhaar Card</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Vehicle Registration">Vehicle RC</option>
                        <option value="Insurance Policy">Insurance Policy</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Upload File (Image/PDF)</label>
                      <input
                        type="file"
                        id="update-doc-file"
                        style={{ display: 'none' }}
                        onChange={(e) => handleUpdateDocFileChange(e.target.files[0])}
                        accept="image/*,application/pdf"
                      />
                      <label
                        htmlFor="update-doc-file"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          background: newDocData.url ? 'rgba(34, 197, 94, 0.1)' : 'var(--input-bg)',
                          color: newDocData.url ? '#22c55e' : 'var(--text-main)',
                          border: newDocData.url ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--glass-border)',
                          padding: '10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          height: '38px'
                        }}
                      >
                        {newDocData.uploading ? (
                          <Loader2 className="animate-spin" size={16} />
                        ) : newDocData.url ? (
                          <>
                            <Check size={16} style={{ color: '#22c55e' }} /> File Uploaded
                          </>
                        ) : (
                          <>
                            <UploadCloud size={16} /> Select Document File
                          </>
                        )}
                      </label>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Validity/Expiry Date</label>
                      <input
                        type="date"
                        className="input-field"
                        style={{ fontSize: '12px', height: '38px', padding: '0 12px' }}
                        value={newDocData.validityDate}
                        onChange={(e) => setNewDocData({ ...newDocData, validityDate: e.target.value })}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ height: '38px', fontSize: '12px', marginTop: '6px' }}
                      disabled={newDocData.uploading}
                    >
                      Add / Update Document
                    </button>
                  </form>

                  {/* Update Driver Password Panel */}
                  <form
                    onSubmit={handleUpdatePassword}
                    style={{
                      padding: '24px',
                      borderRadius: '24px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={16} style={{ color: '#6366f1' }} />
                      Update Password
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>New Password</label>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        className="input-field"
                        style={{ fontSize: '12px', height: '38px', padding: '0 12px' }}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ height: '38px', fontSize: '12px', marginTop: '6px' }}
                      disabled={updatingPassword}
                    >
                      {updatingPassword ? <Loader2 className="animate-spin" size={14} /> : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Driver Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: '750px', padding: '24px', borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }}>Register New Driver</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Full Name</label>
                  <input
                    type="text" placeholder="Full Name" className="input-field" required
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Phone Number</label>
                  <input
                    type="tel" placeholder="Phone Number" className="input-field" required
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Email Address (Optional)</label>
                  <input
                    type="email" placeholder="Email Address (Optional)" className="input-field"
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Driver App Password</label>
                  <input
                    type="password" placeholder="Driver App Password" className="input-field" required
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>License Number</label>
                  <input
                    type="text" placeholder="License Number" className="input-field" required
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Driver Classification</label>
                  <select
                    className="input-field"
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="B2C" style={{ background: 'var(--bg-sidebar)' }}>B2C Driver (Direct to Customer)</option>
                    <option value="B2B" style={{ background: 'var(--bg-sidebar)' }}>B2B Driver (Business Deliveries)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Vehicle Details (Model, Plate No.)</label>
                  <textarea
                    placeholder="Vehicle Details (Model, Plate No.)" className="input-field" style={{ minHeight: '60px', height: '60px', fontSize: '13px', padding: '8px 12px' }} required
                    value={formData.vehicleDetails} onChange={(e) => setFormData({ ...formData, vehicleDetails: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--input-bg)', borderRadius: '12px', height: '60px', marginTop: '16px', border: '1px solid var(--glass-border)' }}>
                    <input
                      type="checkbox"
                      id="cashManagement"
                      checked={formData.cashManagement}
                      onChange={(e) => setFormData({ ...formData, cashManagement: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="cashManagement" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-main)' }}>Enable Cash Management</label>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={13} style={{ color: '#6366f1' }} />
                    Driver Documents
                  </label>
                  <button
                    type="button"
                    onClick={addDocumentRow}
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: 'none',
                      color: '#6366f1',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                  >
                    <Plus size={10} /> Add Document
                  </button>
                </div>

                {formData.documents.length === 0 ? (
                  <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px', border: '1px dashed var(--glass-border)', borderRadius: '8px' }}>
                    No documents attached.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                    {formData.documents.map((doc, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <select
                            className="input-field"
                            style={{ flex: 2, fontSize: '11px', height: '32px', padding: '0 8px' }}
                            value={doc.name}
                            onChange={(e) => updateDocumentField(idx, 'name', e.target.value)}
                          >
                            <option value="Driving License">Driving License</option>
                            <option value="Aadhaar Card">Aadhaar Card</option>
                            <option value="PAN Card">PAN Card</option>
                            <option value="Vehicle Registration">Vehicle RC</option>
                            <option value="Insurance Policy">Insurance Policy</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => removeDocumentRow(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ flex: 1, position: 'relative' }}>
                            <input
                              type="file"
                              id={`doc-file-${idx}`}
                              style={{ display: 'none' }}
                              onChange={(e) => handleDocFileChange(idx, e.target.files[0])}
                              accept="image/*,application/pdf"
                            />
                            <label
                              htmlFor={`doc-file-${idx}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                background: doc.url ? 'rgba(34, 197, 94, 0.1)' : 'var(--input-bg)',
                                color: doc.url ? '#22c55e' : 'var(--text-main)',
                                border: doc.url ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--glass-border)',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                height: '32px'
                              }}
                            >
                              {doc.uploading ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : doc.url ? (
                                <>
                                  <Check size={12} style={{ color: '#22c55e' }} /> Uploaded
                                </>
                              ) : (
                                <>
                                  <UploadCloud size={12} /> Upload File
                                </>
                              )}
                            </label>
                          </div>

                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <input
                              type="date"
                              className="input-field"
                              style={{ fontSize: '11px', height: '32px', padding: '0 8px' }}
                              value={doc.validityDate}
                              onChange={(e) => updateDocumentField(idx, 'validityDate', e.target.value)}
                              required
                              title="Validity/Expiry Date"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', background: 'var(--input-bg)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 2, height: '40px', fontSize: '13px' }} disabled={submitting}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : 'Register Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;
