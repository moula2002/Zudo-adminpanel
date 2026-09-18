import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Truck,
  Users,
  Upload,
  LogOut,
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  MessageSquare,
  BarChart3,
  Store,
  Wallet,
  Bell,
  Megaphone,
  Sun,
  Moon,
  MapPin,
  Image,
  User,
  ChevronDown,
  CheckCircle2,
  Percent,
  FileSpreadsheet,
  Receipt,
  Menu,
  X,
  Settings
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

const DashboardLayout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');

  const [locations, setLocations] = React.useState([]);
  const [locDropdownOpen, setLocDropdownOpen] = React.useState(false);
  const currentLocId = localStorage.getItem('zudo_admin_location') || admin.locationId;

  // Responsive state
  const [isMobile, setIsMobile] = React.useState(false);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto close sidebar on path change for mobile
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  React.useEffect(() => {
    if (admin.role === 'super_admin') {
      fetchLocations();
    }
  }, [admin.role]);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/locations/active');
      setLocations(data);
    } catch (err) {
      console.error('Failed to fetch locations', err);
    }
  };

  const handleLocationChange = (locId) => {
    localStorage.setItem('zudo_admin_location', locId);
    window.location.reload();
  };

  const handleLogout = () => {
    localStorage.removeItem('zudo_admin_token');
    localStorage.removeItem('zudo_admin_user');
    localStorage.removeItem('zudo_admin_location');
    navigate('/login');
  };

  const hasPerm = (perm) => {
    if (admin.role === 'super_admin') return true;
    return admin.permissions && admin.permissions.includes(perm);
  };

  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', perm: 'view_dashboard' },
    { to: '/reports', icon: FileSpreadsheet, label: 'Reports Hub', perm: 'view_dashboard' },
    { to: '/invoices', icon: Receipt, label: 'Invoices', perm: 'manage_invoices' },
    { to: '/notifications', icon: Bell, label: 'Notifications', perm: 'view_dashboard' },
    { to: '/popup-ads', icon: Megaphone, label: 'Popup Ads', perm: 'view_dashboard' },
    { to: '/banners', icon: Image, label: 'Banners', perm: 'view_dashboard' },
    { to: '/products', icon: Package, label: 'Products', perm: 'manage_products' },
    { to: '/categories', icon: Layers, label: 'Categories', perm: 'manage_categories' },
    { to: '/subcategories', icon: Layers, label: 'Sub Categories', perm: 'manage_subcategories' },
    { to: '/commissions', icon: Percent, label: 'Commissions & Min Billing', perm: 'manage_categories' },
    { to: '/drivers', icon: Truck, label: 'Drivers', perm: 'manage_drivers' },
    { to: '/admins', icon: Users, label: 'Admin Management', perm: 'manage_admins' },
    { to: '/sales', icon: Users, label: 'Sales Team', perm: 'manage_admins' },
    { to: '/bulk-upload', icon: Upload, label: 'Bulk Upload', perm: 'manage_bulk_upload' },
    { to: '/b2b-verification', icon: ShieldCheck, label: 'B2B Verification', perm: 'manage_b2b_verification' },
    { to: '/users', icon: Users, label: 'Users', perm: 'manage_users' },
    { to: '/orders', icon: ShoppingBag, label: 'Orders', perm: 'manage_orders' },
    { to: '/reviews', icon: MessageSquare, label: 'Reviews', perm: 'manage_reviews' },
    { to: '/deliveries', icon: BarChart3, label: 'Deliveries Slots', perm: 'manage_deliveries' },
    { to: '/sellers', icon: Store, label: 'Sellers', perm: 'manage_sellers' },
    { to: '/payments', icon: Wallet, label: 'Payments', perm: 'manage_sellers' },
    { to: '/cash', icon: Wallet, label: 'Cash Management', perm: 'manage_cash' },
    { to: '/locations', icon: MapPin, label: 'Locations', perm: 'manage_locations' },
    { to: '/settings', icon: Settings, label: 'Settings', perm: 'view_dashboard' },
    { to: '/profile', icon: User, label: 'My Profile', perm: 'manage_profile' },
  ].filter(item => !item.perm || hasPerm(item.perm));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'row', position: 'relative' }}>
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Sidebar */}
      <aside className="glass animate-slide" style={{
        width: '280px',
        padding: '32px 16px',
        margin: isMobile ? '0' : '16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: isMobile ? '100vh' : 'calc(100vh - 32px)',
        zIndex: isMobile ? 999 : 10,
        top: isMobile ? 0 : undefined,
        left: isMobile ? 0 : undefined,
        borderRadius: isMobile ? '0 24px 24px 0' : '16px',
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-110%)') : 'none',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), margin 0.3s, height 0.3s, border-radius 0.3s'
      }}>
        <div style={{ padding: '0 16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>ZUDO</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>Admin Panel v1.0</p>
          </div>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '8px',
                textDecoration: 'none',
                color: location.pathname === item.to ? '#fff' : 'var(--text-dim)',
                background: location.pathname === item.to ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                transition: '0.3s',
                boxShadow: location.pathname === item.to ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
              }}
            >
              <item.icon size={20} />
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="glass-card" style={{ padding: '16px', borderRadius: '16px', marginTop: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {admin.name?.[0]}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{admin.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{admin.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              border: 'none',
              background: 'var(--glass-bg)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: isMobile ? '0' : '312px',
        padding: isMobile ? '16px' : '32px',
        minWidth: 0,
        transition: 'margin-left 0.3s, padding 0.3s'
      }}>
        <header style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '16px' : '24px',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: '32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'var(--card-bg)',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                }}
                className="glass-card"
              >
                <Menu size={20} />
              </button>
            )}
            <h2 style={{ fontSize: '24px', fontWeight: 700 }}>
              {menuItems.find(i => i.to === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            flexWrap: 'wrap'
          }}>

            {admin.role === 'super_admin' && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setLocDropdownOpen(!locDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    borderRadius: '14px',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03))',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.5)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.25)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: '#6366f1'
                  }}>
                    <MapPin size={14} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.3px' }}>
                    {currentLocId === 'global' ? 'Global Access' : (locations.find(l => l._id === currentLocId)?.city || 'Select Branch')}
                  </span>
                  <ChevronDown size={14} style={{ transition: '0.3s', transform: locDropdownOpen ? 'rotate(180deg)' : 'none', color: 'var(--text-dim)' }} />
                </button>

                {locDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    width: '240px',
                    zIndex: 1000,
                    padding: '8px',
                    boxShadow: '0 15px 35px rgba(0,0,0,0.12), 0 5px 15px rgba(99, 102, 241, 0.05)',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--text-dim)',
                      padding: '6px 12px 8px',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      borderBottom: '1px solid var(--glass-border)',
                      marginBottom: '6px'
                    }}>
                      Operational Branches
                    </div>

                    <button
                      onClick={() => {
                        localStorage.setItem('zudo_admin_location', 'global');
                        window.location.reload();
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        background: (!currentLocId || currentLocId === 'global') ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: 'none',
                        borderRadius: '10px',
                        color: (!currentLocId || currentLocId === 'global') ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: (!currentLocId || currentLocId === 'global') ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (currentLocId && currentLocId !== 'global') e.currentTarget.style.background = 'var(--card-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (currentLocId && currentLocId !== 'global') e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <span style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🌐 Global Access
                      </span>
                      {(!currentLocId || currentLocId === 'global') && <CheckCircle2 size={15} style={{ color: '#6366f1' }} />}
                    </button>

                    {locations.map(loc => {
                      const isActive = currentLocId === loc._id;
                      return (
                        <button
                          key={loc._id}
                          onClick={() => handleLocationChange(loc._id)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                            border: 'none',
                            borderRadius: '10px',
                            color: isActive ? 'var(--primary)' : 'var(--text-main)',
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'var(--card-hover)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <span style={{ fontSize: '13px' }}>
                            📍 {loc.city}
                          </span>
                          {isActive && <CheckCircle2 size={15} style={{ color: '#6366f1' }} />}
                        </button>
                      );
                    })}
                    {locations.length === 0 && (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-dim)', textAlign: 'center' }}>
                        Loading branches...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={toggleTheme}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: '0.3s'
                }}
                className="glass-card"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div style={{ fontSize: '14px', color: 'var(--text-dim)' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
        </header>

        <div style={{ position: 'relative' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
