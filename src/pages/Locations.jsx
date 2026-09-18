import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { MapPin, Plus, Edit2, Trash2, Loader2, CheckCircle2, AlertCircle, X, Building2, Cog } from 'lucide-react';
import { indiaData as locationData } from '../data/indiaData';

const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({ city: '', state: '', pincode: '' });
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [pinSearch, setPinSearch] = useState('');
  const [manualPincode, setManualPincode] = useState('');


  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/locations');
      setLocations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingLocation) {
        await api.put(`/locations/${editingLocation._id}`, formData);
        setStatus({ type: 'success', message: 'Location updated successfully!' });
      } else {
        await api.post('/locations', formData);
        setStatus({ type: 'success', message: 'New location added successfully!' });
      }
      setShowForm(false);
      setEditingLocation(null);
      setFormData({ city: '', state: '', pincode: '' });
      fetchLocations();
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Action failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllPincodes = () => {
    if (formData.state && formData.city) {
      const allPins = locationData[formData.state][formData.city] || [];
      const currentPins = formData.pincode ? formData.pincode.split(',').map(p => p.trim()) : [];

      if (currentPins.length === allPins.length) {
        setFormData({ ...formData, pincode: '' });
      } else {
        setFormData({ ...formData, pincode: allPins.join(', ') });
      }
    }
  };

  const handlePincodeToggle = (pin) => {
    const currentPins = formData.pincode ? formData.pincode.split(',').map(p => p.trim()).filter(p => p !== '') : [];
    let newPins;
    if (currentPins.includes(pin)) {
      newPins = currentPins.filter(p => p !== pin);
    } else {
      newPins = [...currentPins, pin];
    }
    setFormData({ ...formData, pincode: newPins.join(', ') });
  };

  const handleManualAdd = () => {
    const trimmed = manualPincode.trim();
    if (!trimmed) return;
    const currentPins = formData.pincode ? formData.pincode.split(',').map(p => p.trim()).filter(p => p !== '') : [];
    if (currentPins.includes(trimmed)) {
      setStatus({ type: 'error', message: `Pincode ${trimmed} is already selected.` });
      setTimeout(() => {
        setStatus(prev => prev.message?.includes(trimmed) ? { type: '', message: '' } : prev);
      }, 3000);
      return;
    }
    const newPins = [...currentPins, trimmed];
    setFormData({ ...formData, pincode: newPins.join(', ') });
    setManualPincode('');
    setStatus({ type: 'success', message: `Custom pincode ${trimmed} added successfully!` });
    setTimeout(() => {
      setStatus(prev => prev.message?.includes(trimmed) ? { type: '', message: '' } : prev);
    }, 3000);
  };

  const handleEdit = (loc) => {
    setEditingLocation(loc);
    setFormData({
      city: loc.city || '',
      state: loc.state || '',
      pincode: loc.pincode || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/locations/${id}`);
      fetchLocations();
    } catch (err) {
      alert('Failed to delete location');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Location Management</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>Add and manage business locations/branches</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingLocation(null);
            setFormData({ city: '', state: '', pincode: '' });
          }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={20} />
          <span>Add New Location</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {loading && locations.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" size={40} style={{ margin: '0 auto', color: 'var(--primary)' }} /></div>
        ) : locations.map(loc => (
          <div key={loc._id} className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={24} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleEdit(loc)} style={{ padding: '8px', borderRadius: '8px', background: 'var(--glass-bg)', color: 'var(--text-dim)', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(loc._id)} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
              </div>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{loc.city} ({loc.pincode})</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>{loc.state}</p>

            <div style={{ borderTop: '1px solid var(--glass-border)', marginTop: '16px' }} />
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', borderRadius: '32px', overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{editingLocation ? 'Edit Location' : 'Add New Location'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>State</label>
                  <select
                    className="input-field"
                    required
                    value={formData.state}
                    onChange={e => {
                      const state = e.target.value;
                      setFormData({ ...formData, state, city: '', pincode: '' });
                    }}
                  >
                    <option value="">Select State</option>
                    {Object.keys(locationData).sort().map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>City</label>
                  <select
                    className="input-field"
                    required
                    disabled={!formData.state}
                    value={formData.city}
                    onChange={e => {
                      const city = e.target.value;
                      setFormData({ ...formData, city, pincode: '' });
                    }}
                  >
                    <option value="">Select City</option>
                    {formData.state && Object.keys(locationData[formData.state]).sort().map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', margin: 0 }}>Select Pincodes</label>
                    {formData.city && (
                      <button
                        type="button"
                        onClick={handleSelectAllPincodes}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                      >
                        {formData.pincode && formData.pincode.split(',').filter(p => p.trim()).length === (locationData[formData.state][formData.city] || []).length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>

                  {formData.city ? (
                    <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', background: 'var(--card-bg)' }}>
                      <input
                        type="text"
                        placeholder="Search pincodes..."
                        className="input-field"
                        style={{ marginBottom: '12px', padding: '8px 12px', fontSize: '13px' }}
                        value={pinSearch}
                        onChange={e => setPinSearch(e.target.value)}
                      />
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '10px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        padding: '4px',
                        marginBottom: '16px'
                      }}>
                        {(locationData[formData.state][formData.city] || [])
                          .filter(pin => pin.includes(pinSearch))
                          .map(pin => {
                            const isSelected = formData.pincode ? formData.pincode.split(',').map(p => p.trim()).includes(pin) : false;
                            return (
                              <div
                                key={pin}
                                onClick={() => handlePincodeToggle(pin)}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px',
                                  borderRadius: '8px', background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                  cursor: 'pointer', border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)'}`
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  style={{ cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '13px', color: isSelected ? 'var(--text-main)' : 'var(--text-dim)' }}>{pin}</span>
                              </div>
                            );
                          })}
                      </div>

                      {/* Manual Add Pincode Option */}
                      <div style={{
                        paddingTop: '16px',
                        borderTop: '1px solid var(--glass-border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)' }}>Add custom pincode manually</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="e.g. 560099"
                            className="input-field"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '13px', margin: 0 }}
                            value={manualPincode}
                            onChange={e => setManualPincode(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleManualAdd();
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleManualAdd}
                            className="btn-primary"
                            style={{
                              padding: '8px 16px',
                              fontSize: '12px',
                              fontWeight: 700,
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Plus size={14} />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: '16px', color: 'var(--text-dim)', fontSize: '13px' }}>
                      Select a city first to see pincodes
                    </div>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Selected Summary (Manual editing allowed)</label>
                    <input
                      type="text"
                      className="input-field"
                      value={formData.pincode}
                      onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="Selected pincodes will appear here..."
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-primary" style={{ flex: 1, background: 'var(--glass-bg)', color: 'var(--text-main)' }}>Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 2 }}>
                  {loading ? <Loader2 className="animate-spin" /> : editingLocation ? 'Update Location' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Locations;
