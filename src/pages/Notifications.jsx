import React, { useState, useEffect } from 'react';
import { notificationApi as api, getImageUrl } from '../utils/api';
import { 
  Bell, 
  Send, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Users, 
  Store, 
  Plus, 
  Loader2,
  History,
  Zap,
  Clock,
  Sparkles,
  Image as ImageIcon,
  Smartphone,
  MapPin
} from 'lucide-react';

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('history'); // 'history' or 'send'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Send Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    recipient: 'all' // 'all', 'b2b', 'b2c'
  });

  // FCM Testing Lab State
  const [testRole, setTestRole] = useState('all');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState(null);

  const [exitToken, setExitToken] = useState('mock-device-token-12345');
  const [exitType, setExitType] = useState('cart_abandon');
  const [exitProduct, setExitProduct] = useState('Organic Avocados 🥑');
  const [exitLoading, setExitLoading] = useState(false);
  const [exitResponse, setExitResponse] = useState(null);


  const recipients = [
    { value: 'all', label: 'All Users', icon: Users, color: '#6366f1' },
    { value: 'b2c', label: 'B2C Customers', icon: Users, color: '#10b981' },
    { value: 'b2b', label: 'B2B Partners', icon: Store, color: '#f59e0b' }
  ];

  // Get active location context
  const getActiveLocation = () => {
    const admin = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');
    return localStorage.getItem('zudo_admin_location') || admin.locationId || null;
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      const locationId = getActiveLocation();
      const payload = {
        title: formData.title,
        description: formData.description,
        message: formData.description, // map description to message for backend consistency
        image: formData.image || undefined,
        recipient: formData.recipient,
        locationId: locationId || undefined
      };

      await api.post('/notifications', payload);
      setStatus({ type: 'success', message: 'Notification broadcasted and saved successfully!' });
      
      // Reset form and view history
      setFormData({ title: '', description: '', image: '', recipient: 'all' });
      setActiveTab('history');
      fetchNotifications();
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to dispatch notification.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notification?')) return;
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      alert('Failed to delete notification');
    }
  };

  // FCM Testing Lab handlers
  const handleTriggerTestSend = async () => {
    setTestLoading(true);
    setTestResponse(null);
    try {
      const { data } = await api.get(`/notifications/test-send?role=${testRole}`);
      setTestResponse({
        success: true,
        targeted: data.fcmDelivery.totalTargeted,
        successCount: data.fcmDelivery.successCount,
        failureCount: data.fcmDelivery.failureCount,
        message: data.message
      });
      fetchNotifications();
    } catch (error) {
      setTestResponse({
        success: false,
        message: error.response?.data?.message || error.message
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleQueueExitNotification = async () => {
    setExitLoading(true);
    setExitResponse(null);
    try {
      const { data } = await api.post('/notifications/trigger-exit', {
        fcmToken: exitToken,
        type: exitType,
        productName: exitType === 'cart_abandon' ? exitProduct : undefined
      });
      setExitResponse({
        success: true,
        message: data.message
      });
      setTimeout(() => {
        fetchNotifications();
      }, 2000);
    } catch (error) {
      setExitResponse({
        success: false,
        message: error.response?.data?.message || error.message
      });
    } finally {
      setExitLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header Stats & Active Branch Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', wordBreak: 'break-all' }}>
            <MapPin size={16} color="var(--primary)" />
            Active Location Context: <strong style={{ color: 'var(--text-main)' }}>{getActiveLocation() ? `ID: ${getActiveLocation()}` : 'Global (Multi-Tenant Hub)'}</strong>
          </p>
        </div>

        {/* Dynamic Capsule Tab Switcher */}
        <div className="tab-switcher" style={{ 
          display: 'flex', 
          background: 'var(--glass-bg)', 
          border: '1px solid var(--glass-border)', 
          padding: '6px', 
          borderRadius: '16px', 
          gap: '8px', 
          width: 'fit-content',
          boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
        }}>
          <button 
            onClick={() => setActiveTab('history')}
            className="tab-button"
            style={{ 
              padding: '10px 20px', 
              borderRadius: '12px', 
              border: 'none', 
              cursor: 'pointer', 
              background: activeTab === 'history' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: activeTab === 'history' ? 'white' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <History size={16} />
            <span>Notification History</span>
          </button>
          <button 
            onClick={() => setActiveTab('send')}
            className="tab-button"
            style={{ 
              padding: '10px 20px', 
              borderRadius: '12px', 
              border: 'none', 
              cursor: 'pointer', 
              background: activeTab === 'send' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: activeTab === 'send' ? 'white' : 'var(--text-dim)',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <Send size={16} />
            <span>Send Notification</span>
          </button>
        </div>
      </div>

      {status.message && (
        <div className="glass-card" style={{ 
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
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{status.message}</span>
        </div>
      )}

      {/* Tabs Content */}
      {activeTab === 'history' ? (
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '32px', alignItems: 'start' }}>
          
          {/* History Feed Card */}
          <div className="glass-card" style={{ padding: '32px', borderRadius: '32px' }}>
            <div className="flex-responsive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <History size={24} color="var(--primary)" />
                  History
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>Latest push dispatches across this tenant environment</p>
              </div>
              
              <button onClick={() => setActiveTab('send')} className="btn-primary" style={{ padding: '8px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <Plus size={16} />
                Send Push
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-dim)' }}>
                  <Bell size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <div>No notification dispatches found.</div>
                </div>
              ) : (
                notifications.map(n => {
                  const recipientConfig = recipients.find(r => r.value === n.recipient) || recipients[0];
                  return (
                    <div key={n._id} style={{ 
                      padding: '20px', 
                      borderRadius: '20px', 
                      background: 'var(--glass-bg)', 
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      gap: '16px'
                    }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '12px', 
                        background: `${recipientConfig.color}15`, 
                        color: recipientConfig.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <recipientConfig.icon size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '12px' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)', flexShrink: 0 }}>
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '12px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                          {n.message}
                        </p>

                        {n.image && (
                          <div style={{ 
                            marginBottom: '12px', 
                            borderRadius: '12px', 
                            overflow: 'hidden', 
                            maxHeight: '160px', 
                            border: '1px solid var(--glass-border)',
                            background: 'rgba(0,0,0,0.1)'
                          }}>
                            <img 
                              src={getImageUrl(n.image)} 
                              alt={n.title} 
                              style={{ width: '100%', height: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }} 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'var(--input-bg)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <recipientConfig.icon size={10} />
                              {recipientConfig.label}
                            </span>
                            {n.locationId && (
                              <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.05)', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={10} />
                                Branch Context
                              </span>
                            )}
                          </div>
                          <button onClick={() => handleDelete(n._id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* FCM Testing Lab & Delivery Insight */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* FCM Testing Lab Card */}
            <div className="glass-card" style={{ padding: '32px', borderRadius: '32px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Zap size={20} color="var(--primary)" />
                <h4 style={{ fontSize: '18px', fontWeight: 800 }}>FCM Testing Lab 🧪</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Segment 1: Quick Multicast Send */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>TEST BROWSER MULTICAST</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select 
                      className="input-field" 
                      value={testRole}
                      onChange={e => setTestRole(e.target.value)}
                      style={{ height: '40px', padding: '0 12px', fontSize: '13px', flex: 1 }}
                    >
                      <option value="all">All Roles</option>
                      <option value="b2b">B2B Partners</option>
                      <option value="b2c">B2C Customers</option>
                    </select>
                    <button 
                      onClick={handleTriggerTestSend} 
                      disabled={testLoading}
                      className="btn-primary" 
                      style={{ height: '40px', padding: '0 16px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {testLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Send Test
                    </button>
                  </div>

                  {testResponse && (
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '12px', 
                      borderRadius: '12px', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid var(--glass-border)',
                      fontSize: '11px',
                      lineHeight: '1.4'
                    }}>
                      <div style={{ fontWeight: 800, color: testResponse.success ? '#22c55e' : '#ef4444', marginBottom: '4px' }}>
                        {testResponse.success ? '✓ Send Success!' : '✗ Send Failed'}
                      </div>
                      {testResponse.success && (
                        <div>
                          <div>Targeted: {testResponse.targeted}</div>
                          <div>Delivered: {testResponse.successCount}</div>
                          <div>Failed: {testResponse.failureCount}</div>
                        </div>
                      )}
                      <div style={{ color: 'var(--text-dim)', marginTop: '2px' }}>{testResponse.message}</div>
                    </div>
                  )}
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: 0 }} />

                {/* Segment 2: Delayed Exit-Intent Cart Abandonment */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    DELAYED TRIGGER SIMULATION
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>SIMULATION TYPE</label>
                    <select 
                      className="input-field" 
                      value={exitType}
                      onChange={e => setExitType(e.target.value)}
                      style={{ height: '36px', padding: '0 8px', fontSize: '12px' }}
                    >
                      <option value="cart_abandon">Cart Abandonment (🛒)</option>
                      <option value="low_session">Leaving So Soon? (🥺)</option>
                    </select>
                  </div>

                  {exitType === 'cart_abandon' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>PRODUCT NAME</label>
                      <input 
                        type="text" 
                        className="input-field"
                        value={exitProduct}
                        onChange={e => setExitProduct(e.target.value)}
                        style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}
                        placeholder="e.g. Organic Avocados"
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-dim)' }}>FCM TOKEN / DEVICE ID</label>
                    <input 
                      type="text" 
                      className="input-field"
                      value={exitToken}
                      onChange={e => setExitToken(e.target.value)}
                      style={{ height: '36px', padding: '0 12px', fontSize: '12px' }}
                      placeholder="Device push token"
                    />
                  </div>

                  <button 
                    onClick={handleQueueExitNotification} 
                    disabled={exitLoading}
                    className="btn-secondary" 
                    style={{ height: '40px', borderRadius: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    {exitLoading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                    Queue Delayed Trigger (1-min delay)
                  </button>

                  {exitResponse && (
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '12px', 
                      background: 'rgba(255,255,255,0.03)', 
                      border: '1px solid var(--glass-border)',
                      fontSize: '11px',
                      color: exitResponse.success ? '#22c55e' : '#ef4444',
                      lineHeight: '1.4'
                    }}>
                      {exitResponse.message}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Insight */}
            <div className="glass-card" style={{ padding: '32px', borderRadius: '32px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.1))' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Delivery Insight</h4>
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
                Broadcast notifications are delivered in real-time to all active sessions in the selected recipient group. 
                Use B2B or B2C targeting to personalize updates.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Send Notification Tab Content */
        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', alignItems: 'start' }}>
          
          {/* Main Broadcast Send Form */}
          <div className="glass-card" style={{ padding: '40px', borderRadius: '32px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: 800 }}>Dispatch New Broadcast</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Trigger push dispatches and alert campaigns instantly</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Title Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>TITLE</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="E.g. Weekend Super Saver 🚀"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              {/* Image URL Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>IMAGE URL (OPTIONAL)</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="E.g. https://images.unsplash.com/photo-1610348725531-843dff14c78c?q=80"
                    value={formData.image}
                    onChange={e => setFormData({...formData, image: e.target.value})}
                    style={{ paddingLeft: '44px' }}
                  />
                  <ImageIcon size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Description Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>DESCRIPTION</label>
                <textarea 
                  className="input-field" 
                  rows="4" 
                  placeholder="E.g. Use code FRESH30 to unlock 30% discounts off fresh farm produce. Order today!"
                  style={{ resize: 'none' }}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              {/* Recipient User Group Selection */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>RECIPIENT USER GROUP</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                  {recipients.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setFormData({...formData, recipient: r.value})}
                      style={{
                        padding: '16px 8px',
                        borderRadius: '16px',
                        border: '1px solid var(--glass-border)',
                        background: formData.recipient === r.value ? 'var(--primary)' : 'var(--glass-bg)',
                        color: formData.recipient === r.value ? 'white' : 'var(--text-main)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: formData.recipient === r.value ? '0 4px 15px rgba(99, 102, 241, 0.25)' : 'none'
                      }}
                    >
                      <r.icon size={20} />
                      <span style={{ fontSize: '11px', fontWeight: 700 }}>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button disabled={actionLoading} className="btn-primary" style={{ width: '100%', height: '54px', marginTop: '12px' }}>
                {actionLoading ? <Loader2 className="animate-spin" /> : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <Send size={20} />
                    <span>Send Broadcast</span>
                  </div>
                )}
              </button>
            </form>
          </div>

          {/* Premium Mobile Phone Live Push Notification Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '32px' }}>
            <div className="glass-card" style={{ padding: '32px', borderRadius: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <Smartphone size={20} color="var(--primary)" />
                <h4 style={{ fontSize: '15px', fontWeight: 800 }}>Real-Time Simulator 📱</h4>
              </div>

              {/* iPhone Styled Chassis */}
              <div style={{
                width: '100%',
                maxWidth: '280px',
                aspectRatio: '9 / 18.5',
                background: '#09090b',
                borderRadius: '40px',
                border: '10px solid #27272a',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8), 0 0 0 2px #3f3f46',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 12px'
              }}>
                {/* Notch */}
                <div style={{
                  position: 'absolute',
                  top: '0',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90px',
                  height: '18px',
                  background: '#27272a',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px',
                  zIndex: 20
                }} />

                {/* Simulated Wallpaper Background */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(210deg, #180b3d 0%, #030008 100%)',
                  zIndex: 1,
                  opacity: 0.95
                }} />

                {/* Lock Screen Content */}
                <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
                  
                  {/* Time Indicator */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', gap: '2px' }}>
                    <div style={{ fontSize: '32px', fontWeight: 300, color: '#ffffff', opacity: 0.9 }}>17:26</div>
                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.6, letterSpacing: '0.5px' }}>FRIDAY, MAY 22</div>
                  </div>

                  {/* Rich Banner Notification Container */}
                  <div style={{
                    background: 'rgba(25, 25, 25, 0.75)',
                    backdropFilter: 'blur(25px)',
                    WebkitBackdropFilter: 'blur(25px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(10px)',
                    animation: 'float 3s ease-in-out infinite'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '5px',
                          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '8px',
                          fontWeight: 900,
                          color: '#ffffff'
                        }}>
                          Z
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', opacity: 0.9 }}>ZUDO</span>
                      </div>
                      <span style={{ fontSize: '8px', color: '#ffffff', opacity: 0.4 }}>now</span>
                    </div>

                    {/* Content Block */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          color: '#ffffff', 
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {formData.title || 'Super Fresh Promo! 🥑'}
                        </div>
                        <div style={{ 
                          fontSize: '9px', 
                          color: '#ffffff', 
                          opacity: 0.7, 
                          lineHeight: '1.3',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {formData.description || 'Our finest farm fresh collection has arrived. Open Zudo to unlock exclusive rewards!'}
                        </div>
                      </div>

                      {/* Optional Banner Image */}
                      {formData.image && (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          flexShrink: 0,
                          border: '1px solid var(--glass-border)'
                        }}>
                          <img 
                            src={getImageUrl(formData.image)} 
                            alt="preview" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', lineHeight: '1.5' }}>
                Preview how the broadcast title, description, and rich media attachment will appear to targeted <strong>{recipients.find(r => r.value === formData.recipient)?.label}</strong>!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
