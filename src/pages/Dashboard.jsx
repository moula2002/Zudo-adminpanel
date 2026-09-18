import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  Package, Layers, Truck, Users, TrendingUp, ShoppingBag,
  CheckCircle, DollarSign, Store, FileText, Download,
  ArrowUpRight, ArrowDownRight, Activity, ShieldAlert, MapPin
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }) => (
  <div className="glass-card" style={{ flex: 1, padding: '24px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <div style={{ padding: '12px', background: `${color}15`, color: color, borderRadius: '12px' }}>
        <Icon size={24} />
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: trend > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
          {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '4px' }}>{title}</p>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
      <h3 style={{ fontSize: '28px', fontWeight: 800 }}>{value}</h3>
      {subValue && <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{subValue}</span>}
    </div>
    <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
      <Icon size={80} />
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0, categories: 0, drivers: 0, deliveries: 0,
    pendingPayments: 0, sellers: 0, b2bOrders: 0, b2cOrders: 0,
    totalRevenue: 0, locations: 0
  });
  const [chartData, setChartData] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

  const hasPerm = (perm) => user.role === 'super_admin' || user.role === 'manager' || (user.permissions && user.permissions.includes(perm));

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const results = await Promise.allSettled([
        hasPerm('manage_products') ? api.get('/products') : Promise.resolve({ data: [] }),
        hasPerm('manage_categories') ? api.get('/categories') : Promise.resolve({ data: [] }),
        hasPerm('manage_drivers') ? api.get('/drivers') : Promise.resolve({ data: [] }),
        hasPerm('manage_orders') ? api.get('/orders/admin/all') : Promise.resolve({ data: [] }),
        hasPerm('manage_sellers') ? api.get('/sellers') : Promise.resolve({ data: [] }),
        hasPerm('manage_locations') ? api.get('/locations') : Promise.resolve({ data: [] })
      ]);

      const [p, c, d, o, s, l] = results.map(r => r.status === 'fulfilled' ? r.value : { data: [] });

      const productsList = p.data;
      const ordersList = o.data;

      const deliveries = ordersList.filter(order => order.orderStatus === 'Delivered').length;
      const pendingPayments = ordersList.filter(order => order.paymentStatus === 'Pending').length;
      const b2bOrders = ordersList.filter(order => order.userId?.role === 'b2b').length;
      const b2cOrders = ordersList.filter(order => order.userId?.role === 'b2c' || !order.userId?.role).length;
      const totalRevenue = ordersList.reduce((sum, order) => sum + (order.orderStatus !== 'Cancelled' ? order.totalAmount : 0), 0);

      setStats({
        products: productsList.length,
        categories: c.data.length,
        drivers: d.data.length,
        deliveries,
        pendingPayments,
        sellers: s.data.length,
        b2bOrders,
        b2cOrders,
        totalRevenue,
        locations: l.data.length
      });

      // Calculate sales by category
      const categoryMap = {};
      productsList.forEach(prod => {
        const catName = prod.categoryId?.name || 'Uncategorized';
        categoryMap[prod._id] = catName;
      });

      const categorySales = {};
      ordersList.forEach(order => {
        if (order.orderStatus !== 'Cancelled') {
          order.items.forEach(item => {
            const catName = categoryMap[item.productId] || 'Other';
            if (!categorySales[catName]) categorySales[catName] = 0;
            categorySales[catName] += item.price * item.quantity;
          });
        }
      });

      const cData = Object.keys(categorySales).map(key => ({
        name: key,
        value: categorySales[key]
      })).sort((a, b) => b.value - a.value);
      setChartData(cData);

      const rData = [
        { name: 'Mon', revenue: totalRevenue * 0.1 },
        { name: 'Tue', revenue: totalRevenue * 0.15 },
        { name: 'Wed', revenue: totalRevenue * 0.12 },
        { name: 'Thu', revenue: totalRevenue * 0.18 },
        { name: 'Fri', revenue: totalRevenue * 0.22 },
        { name: 'Sat', revenue: totalRevenue * 0.13 },
        { name: 'Sun', revenue: totalRevenue * 0.1 },
      ];
      setRevenueData(rData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = [
      ['Metric', 'Value'],
      ['Total Revenue', `₹${stats.totalRevenue}`],
      ['B2B Orders', stats.b2bOrders],
      ['B2C Orders', stats.b2cOrders],
      ['Total Sellers', stats.sellers],
      ['Inventory Depth', stats.products],
      ['Active Locations', stats.locations]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `${user.name}_Sales_Dashboard.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            {user.role === 'sales' ? 'Sales Intel Command' : 'Dashboard Overview'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Synchronized data from {stats.locations} active business zones
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
        >
          <Download size={18} />
          <span>Export Analytics</span>
        </button>
      </div>

      {/* Main Stats Grid */}
      <div style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', display: 'grid', gap: '24px' }}>
        {hasPerm('manage_orders') && (
          <StatCard title="Sales Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} color="#6366f1" trend={12} />
        )}

        {hasPerm('manage_orders') && (!user.targetSegment || user.targetSegment === 'Both' || user.targetSegment === 'B2B') && (
          <StatCard title="B2B Traction" value={stats.b2bOrders} subValue="Orders" icon={ShoppingBag} color="#8b5cf6" trend={8} />
        )}

        {hasPerm('manage_sellers') && (
          <StatCard title="Partner Network" value={stats.sellers} subValue="Active Sellers" icon={Store} color="#f59e0b" trend={15} />
        )}

        {hasPerm('manage_products') && (
          <StatCard title="Catalog Depth" value={stats.products} subValue="SKUs" icon={Package} color="#10b981" />
        )}
      </div>

      {/* Sub Stats Grid */}
      <div style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', display: 'grid', gap: '24px' }}>
        {hasPerm('manage_locations') && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '12px' }}>
              <MapPin size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Operational Zones</p>
              <h4 style={{ fontSize: '20px', fontWeight: 800 }}>{stats.locations} Locations</h4>
            </div>
          </div>
        )}
        {hasPerm('manage_categories') && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderRadius: '12px' }}>
              <Layers size={20} />
            </div>
            <div>
              <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Market Categories</p>
              <h4 style={{ fontSize: '20px', fontWeight: 800 }}>{stats.categories} Depts</h4>
            </div>
          </div>
        )}
        {hasPerm('manage_orders') && (!user.targetSegment || user.targetSegment === 'Both' || user.targetSegment === 'B2C') && (
          <StatCard title="Retail B2C" value={stats.b2cOrders} subValue="Orders" icon={TrendingUp} color="#ec4899" />
        )}
      </div>

      {/* Visual Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: hasPerm('manage_products') ? '2fr 1fr' : '1fr', gap: '24px' }}>
        {hasPerm('manage_orders') && (
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '32px' }}>Revenue Trajectory</h3>
            <div style={{ height: '300px', width: '100%', minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height={300} debounce={100} minWidth={0}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-dim)" axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--text-dim)" axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--glass-border)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {hasPerm('manage_products') && (
          <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>Sales Contribution</h3>
            <div style={{ height: '240px', width: '100%', minHeight: '240px' }}>
              <ResponsiveContainer width="100%" height={240} debounce={100} minWidth={0}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats - Hidden if no permissions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {hasPerm('manage_drivers') && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
            <Truck size={24} style={{ color: '#6366f1', margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: '20px', fontWeight: 800 }}>{stats.drivers}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Fleet Drivers</p>
          </div>
        )}
        {hasPerm('manage_cash') && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', textAlign: 'center' }}>
            <Activity size={24} style={{ color: '#f59e0b', margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: '20px', fontWeight: 800 }}>{stats.pendingPayments}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Pending Collections</p>
          </div>
        )}
      </div>

      {!hasPerm('view_dashboard') && (
        <div style={{ padding: '80px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '32px', border: '1px dashed #ef4444' }}>
          <ShieldAlert size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>Access Restricted</h3>
          <p style={{ color: 'var(--text-dim)', marginTop: '8px' }}>Security Clearance Required</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
