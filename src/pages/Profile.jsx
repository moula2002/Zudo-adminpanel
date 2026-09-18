import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  User, Mail, Lock, Shield, CheckCircle2, 
  AlertCircle, Loader2, Save, Key, Phone, MapPin 
} from 'lucide-react';

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('zudo_admin_user') || '{}'));
  
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    locationId: user.locationId?._id || user.locationId || '',
    pincodes: user.pincodes || [],
    password: '',
    confirmPassword: ''
  });

  const [availablePincodes, setAvailablePincodes] = useState([]);

  useEffect(() => {
    const locId = user.locationId?._id || user.locationId;
    if (locId) {
      fetchPincodes(locId);
    } else {
      setAvailablePincodes([]);
    }
  }, [user.locationId]);

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

  const handlePincodeToggle = (code) => {
    setFormData(prev => ({
      ...prev,
      pincodes: prev.pincodes.includes(code)
        ? prev.pincodes.filter(p => p !== code)
        : [...prev.pincodes, code]
    }));
  };

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const { data } = await api.put('/auth/profile', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        pincodes: formData.pincodes
      });
      
      // Update local storage
      const updatedUser = { 
        ...user, 
        name: data.name, 
        email: data.email, 
        phone: data.phone, 
        pincodes: data.pincodes 
      };
      localStorage.setItem('zudo_admin_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passData.newPassword !== passData.confirmPassword) {
      return setStatus({ type: 'error', message: 'New passwords do not match.' });
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await api.put('/auth/change-password', {
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword
      });
      
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setStatus({ type: 'success', message: 'Password updated successfully!' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--text-main)] m-0">My Profile</h1>
        <p className="text-sm text-[var(--text-dim)] mt-1">Manage your account settings and security</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Personal Information */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#6366f1' }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Personal Info</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Update your name and email</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input 
                  type="text" 
                  className="input-field pl-12 input-with-icon" 
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input 
                  type="email" 
                  className="input-field pl-12 input-with-icon" 
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input 
                  type="text" 
                  className="input-field pl-12 input-with-icon" 
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Role</label>
              <div className="relative">
                <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input 
                  type="text" 
                  className="input-field pl-12 opacity-60 input-with-icon" 
                  value={user.role?.replace('_', ' ').toUpperCase()} 
                  disabled 
                />
              </div>
            </div>



            {availablePincodes.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Assigned Pincodes</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', maxHeight: '120px', overflowY: 'auto', padding: '4px' }}>
                  {availablePincodes.map(pc => (
                    <div
                      key={pc.code}
                      onClick={() => handlePincodeToggle(pc.code)}
                      style={{
                        padding: '8px', borderRadius: '10px', textAlign: 'center',
                        background: formData.pincodes.includes(pc.code) ? 'var(--primary)' : 'var(--glass-bg)',
                        color: formData.pincodes.includes(pc.code) ? 'white' : 'var(--text-main)',
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

            <button type="submit" disabled={loading} className="btn-primary mt-4 w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
            </button>
          </form>
        </div>

        {/* Security / Password */}
        <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '12px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', color: '#ec4899' }}>
              <Lock size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Security</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Update your password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input 
                  type="password" 
                  className="input-field pl-12 input-with-icon" 
                  placeholder="••••••••"
                  value={passData.currentPassword}
                  onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input 
                  type="password" 
                  className="input-field pl-12 input-with-icon" 
                  placeholder="••••••••"
                  value={passData.newPassword}
                  onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                <input 
                  type="password" 
                  className="input-field pl-12 input-with-icon" 
                  placeholder="••••••••"
                  value={passData.confirmPassword}
                  onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-4 w-full flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
              {loading ? <Loader2 className="animate-spin" /> : <><Key size={18} /> Update Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
