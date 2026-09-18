import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Lock, Mail, Loader2, MapPin, Map, ChevronRight, ChevronDown, Building2, CheckCircle2, Users, Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [fetchingLocations, setFetchingLocations] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [segment, setSegment] = useState('Super Admin'); // Default to Super Admin
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/locations/active');
      setLocations(data);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    } finally {
      setFetchingLocations(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!selectedLocation) {
      setError('Please select a branch/location to proceed.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
        locationId: selectedLocation?._id,
        targetSegment: segment === 'Super Admin' ? 'Both' : segment
      });
      localStorage.setItem('zudo_admin_token', data.token);
      localStorage.setItem('zudo_admin_user', JSON.stringify(data));
      if (selectedLocation) {
        localStorage.setItem('zudo_admin_location', selectedLocation._id);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass" style={{
        width: '100%',
        maxWidth: '500px',
        padding: '32px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'visible'
      }}>
        {/* Decor */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '100px',
          height: '100px',
          background: 'var(--primary)',
          filter: 'blur(60px)',
          opacity: 0.3
        }} />

        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          marginBottom: '6px',
          background: 'linear-gradient(135deg, #fff, #94a3b8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Welcome Back</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '24px', fontSize: '14px' }}>Sign in to ZUDO Admin Panel</p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            padding: '10px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-dim)' }} />
            <input
              type="email"
              placeholder="Email Address"
              className="input-field"
              style={{ paddingLeft: '42px', height: '40px', fontSize: '13px' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-dim)' }} />
            <input
              type="password"
              placeholder="Password"
              className="input-field"
              style={{ paddingLeft: '42px', height: '40px', fontSize: '13px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Location Selection */}
          <div style={{ textAlign: 'left', marginTop: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={12} /> SELECT PORTAL / SEGMENT
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { id: 'B2C', icon: Users, label: 'B2C' },
                { id: 'B2B', icon: Building2, label: 'B2B' },
                { id: 'Super Admin', icon: Shield, label: 'SUPER ADMIN' }
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSegment(item.id)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '12px',
                    border: `1px solid ${segment === item.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)'}`,
                    background: segment === item.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    color: segment === item.id ? 'var(--primary)' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <item.icon size={16} />
                  <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                </button>
              ))}
            </div>

            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={12} /> SELECT BRANCH / LOCATION
            </label>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${dropdownOpen ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: dropdownOpen ? '0 0 20px rgba(99, 102, 241, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '6px', 
                    background: selectedLocation ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: '0.3s'
                  }}>
                    <Map size={14} style={{ color: selectedLocation ? '#fff' : '#64748b' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Branch</span>
                    <span style={{ color: selectedLocation ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: '13px' }}>
                      {selectedLocation ? `${selectedLocation.city}` : 'Select Operational Zone'}
                    </span>
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: 'var(--text-dim)', transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  right: 0,
                  background: 'rgba(15, 23, 42, 0.98)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  zIndex: 1000,
                  boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  animation: 'dropdownAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  padding: '6px'
                }}>
                  <style>{`
                    @keyframes dropdownAppear {
                      from { opacity: 0; transform: translateY(-10px) scale(0.98); }
                      to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                    .loc-item:hover {
                      background: linear-gradient(90deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 100%) !important;
                      transform: translateX(4px);
                    }
                  `}</style>
                  
                  {fetchingLocations ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                      <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto', color: 'var(--primary)' }} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ padding: '8px 6px 6px' }}>
                        <div style={{ position: 'relative' }}>
                          <MapPin size={12} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
                          <input
                            type="text"
                            placeholder="Filter by city or state..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '8px 12px 8px 30px',
                              background: 'rgba(0, 0, 0, 0.2)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: '10px',
                              color: 'var(--text-main)',
                              fontSize: '12px',
                              outline: 'none',
                              transition: '0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                          />
                        </div>
                      </div>
                      
                      <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                        {locations.filter(loc => 
                          loc.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          loc.state.toLowerCase().includes(searchQuery.toLowerCase())
                        ).map(loc => (
                          <button
                            key={loc._id}
                            type="button"
                            className="loc-item"
                            onClick={() => {
                              setSelectedLocation(loc);
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              textAlign: 'left',
                              background: selectedLocation?._id === loc._id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                              border: 'none',
                              borderRadius: '10px',
                              color: selectedLocation?._id === loc._id ? '#fff' : '#94a3b8',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '30px', height: '30px', borderRadius: '8px',
                                background: selectedLocation?._id === loc._id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: '0.2s'
                              }}>
                                <Building2 size={14} style={{ color: selectedLocation?._id === loc._id ? '#fff' : '#64748b' }} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', color: selectedLocation?._id === loc._id ? '#fff' : '#e2e8f0' }}>{loc.city}</span>
                                <span style={{ fontSize: '10px', opacity: 0.6 }}>{loc.state}</span>
                              </div>
                            </div>
                            {selectedLocation?._id === loc._id && (
                              <CheckCircle2 size={14} style={{ color: 'var(--primary)' }} />
                            )}
                          </button>
                        ))}
                        
                        {locations.filter(loc => 
                          loc.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          loc.state.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 && (
                          <div style={{ padding: '30px 10px', textAlign: 'center' }}>
                            <MapPin size={20} style={{ color: 'rgba(255, 255, 255, 0.05)', marginBottom: '6px' }} />
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>No branches found in this zone</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: '8px', height: '40px', fontSize: '14px' }}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} size={16} /> : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
          By signing in, you agree to Zudo's Security Policies
        </p>
      </div>
    </div>
  );
};

export default Login;
