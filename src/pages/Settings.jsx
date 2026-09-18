import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Save, Plus, CheckCircle, Trash2, ShieldCheck, Wallet, RefreshCw 
} from 'lucide-react';
import api from '../utils/api';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // UPI states
  const [activeUpi, setActiveUpi] = useState('');
  const [upiList, setUpiList] = useState([]);
  const [newUpi, setNewUpi] = useState('');

  // Load UPI configurations from DB on mount
  useEffect(() => {
    fetchUpiConfig();
  }, []);

  const fetchUpiConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/upi_config');
      if (data && data.value) {
        setActiveUpi(data.value.activeUpi || 'MSSNBTRADINGCO.eazypay@icici');
        setUpiList(data.value.upiList || ['MSSNBTRADINGCO.eazypay@icici', 'snbtrading@ybl', 'snbtrading@okaxis']);
      }
    } catch (err) {
      // If setting doesn't exist, seed it
      const defaultList = ['MSSNBTRADINGCO.eazypay@icici', 'snbtrading@ybl', 'snbtrading@okaxis'];
      const defaultActive = 'MSSNBTRADINGCO.eazypay@icici';
      setActiveUpi(defaultActive);
      setUpiList(defaultList);
      saveUpiConfig(defaultActive, defaultList);
    } finally {
      setLoading(false);
    }
  };

  const saveUpiConfig = async (active, list) => {
    try {
      await api.post('/settings/upi_config', {
        value: {
          activeUpi: active,
          upiList: list
        }
      });
      localStorage.setItem('zudo_upi_id', active);
      localStorage.setItem('zudo_upi_list', JSON.stringify(list));
    } catch (err) {
      console.error('Failed to save UPI config to DB:', err);
    }
  };

  const handleSetActive = async (upi) => {
    setActiveUpi(upi);
    await saveUpiConfig(upi, upiList);
    showStatus('success', `Active UPI ID successfully updated to: ${upi}`);
  };

  const handleAddUpi = async (e) => {
    e.preventDefault();
    const trimmedUpi = newUpi.trim();
    
    // Simple UPI validation
    if (!trimmedUpi) return;
    if (!trimmedUpi.includes('@')) {
      showStatus('error', 'Please enter a valid UPI ID (e.g. name@upi)');
      return;
    }

    if (upiList.includes(trimmedUpi)) {
      showStatus('error', 'This UPI ID already exists in the options list');
      return;
    }

    const updatedList = [...upiList, trimmedUpi];
    setUpiList(updatedList);
    await saveUpiConfig(activeUpi, updatedList);
    setNewUpi('');
    showStatus('success', `Added "${trimmedUpi}" to options list.`);
  };

  const handleDeleteUpi = async (upiToDelete, e) => {
    e.stopPropagation(); // Prevent setting as active
    
    if (upiToDelete === activeUpi) {
      showStatus('error', 'Cannot delete the currently active UPI ID. Please set another active UPI ID first.');
      return;
    }

    const updatedList = upiList.filter(upi => upi !== upiToDelete);
    setUpiList(updatedList);
    await saveUpiConfig(activeUpi, updatedList);
    showStatus('success', 'UPI ID option removed successfully.');
  };

  const showStatus = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => {
      setStatus({ type: '', message: '' });
    }, 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Title block */}
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-main)] m-0 flex items-center gap-3">
          <SettingsIcon size={32} className="text-[var(--primary)]" />
          Settings Panel
        </h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">Configure general gateway parameters and UPI accounts</p>
      </div>

      {/* Success/Error Toast */}
      {status.message && (
        <div className="glass-card animate-slide" style={{ 
          padding: '16px 24px', 
          borderRadius: '16px', 
          borderColor: status.type === 'success' ? '#22c55e' : '#ef4444',
          background: status.type === 'success' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
          color: status.type === 'success' ? '#22c55e' : '#ef4444',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <Trash2 size={20} />}
          <span>{status.message}</span>
        </div>
      )}

      <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* UPI Manager Box */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-main)' }}>UPI Payment Gateway Configurations</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Select or register standard UPI addresses for receiving payments</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>REGISTERED UPI OPTIONS (CLICK TO ACTIVATE)</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upiList.map((upi) => {
                const isActive = upi === activeUpi;
                return (
                  <div 
                    key={upi}
                    onClick={() => handleSetActive(upi)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '16px',
                      border: isActive ? '2px solid var(--primary)' : '1px solid var(--glass-border)',
                      background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--glass-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isActive ? '0 4px 15px rgba(99, 102, 241, 0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.borderColor = 'var(--glass-border)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Wallet size={20} color={isActive ? 'var(--primary)' : 'var(--text-dim)'} />
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--text-main)' : 'var(--text-dim)'
                      }}>{upi}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isActive ? (
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          color: 'var(--primary)',
                          background: 'rgba(99, 102, 241, 0.15)',
                          padding: '4px 10px',
                          borderRadius: '20px'
                        }}>Active Gateway</span>
                      ) : (
                        <button
                          onClick={(e) => handleDeleteUpi(upi, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            opacity: 0.7,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '4px',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '8px 0' }} />

          {/* Add New UPI Form */}
          <form onSubmit={handleAddUpi} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>REGISTER NEW UPI ADDRESS</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="e.g. companyname@okaxis"
                value={newUpi}
                onChange={e => setNewUpi(e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', height: '48px', borderRadius: '14px' }}
              >
                <Plus size={18} />
                <span>Add Option</span>
              </button>
            </div>
          </form>

        </div>

        {/* Informational Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--primary)" />
              Secure Gateway Syncing
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.6', margin: 0 }}>
              The selected UPI Address will be dynamically attached to outgoing order requests, QR Code generation sheets, and digital checkout pages. Ensure that the active UPI ID matches your commercial bank settlements account.
            </p>
          </div>

          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RefreshCw size={20} className="text-[var(--text-dim)]" />
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', lineHeight: '1.4' }}>
              Changes take effect globally on checkout terminals. Refresh customer application caches if checkout values fail to load.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Settings;
