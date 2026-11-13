import React, { useState } from 'react';
import api from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import {
  FileSpreadsheet,
  Download,
  Loader2,
  ShoppingBag,
  Users,
  Store,
  Truck,
  Wallet,
  MessageSquare,
  Clock,
  Percent,
  Coins,
  FileText,
  CheckCircle,
  CalendarRange,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterActive, setFilterActive] = useState(false);

  const applyFilter = () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date.');
      return;
    }
    setFilterActive(!!(startDate || endDate));
  };

  const clearFilter = () => {
    setStartDate('');
    setEndDate('');
    setFilterActive(false);
  };

  // Filter rows by date range using a date string field
  const filterByDate = (rows, dateField) => {
    if (!filterActive || (!startDate && !endDate)) return rows;
    return rows.filter(row => {
      const val = row[dateField];
      if (!val || val === 'N/A') return false;
      const d = new Date(val);
      if (isNaN(d)) return false;
      if (startDate && d < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  };

  const reportTypes = [
    {
      id: 'orders',
      title: 'Orders Registry Ledger',
      description: 'Comprehensive log of all customer transactions, shipping addresses, order values, and fulfillment states.',
      endpoint: '/orders/admin/all',
      icon: ShoppingBag,
      color: '#6366f1',
      mapFn: (data) => data.map((order) => ({
        'Order ID': order._id,
        'Company / Customer Name': order.userId?.businessName || order.userId?.companyName || order.shippingAddress?.companyName || order.shippingAddress?.businessName || order.userId?.name || 'Anonymous',
        'Customer Email': order.userId?.email || 'N/A',
        'Customer Phone': order.userId?.phone || order.shippingAddress?.phone || 'N/A',
        'Customer Segment': order.userId?.role?.toUpperCase() || 'B2C',
        'Order Status': order.orderStatus,
        'Payment Status': order.paymentStatus,
        'Payment Method': order.paymentMethod,
        'Total Amount (INR)': order.totalAmount,
        'Tax / GST (INR)': order.taxAmount || 0,
        'Discount Applied (INR)': order.discountAmount || 0,
        'Total Items': (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0),
        'Items Detail': (order.items || []).map(i => `${i.name} (x${i.quantity})`).join(', '),
        'Shipping Address': order.shippingAddress ? `${order.shippingAddress.address || ''}, ${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} - ${order.shippingAddress.pincode || ''}`.trim() : 'N/A',
        'City Zone': order.locationId?.city || 'Global',
        'Driver Assigned': order.driverId?.name || 'Unassigned',
        'Delivery Status': order.deliveryStatus || 'N/A',
        'Admin Notes': order.adminNotes || 'N/A',
        'Date Placed': new Date(order.createdAt).toLocaleString(),
        'Last Updated': new Date(order.updatedAt).toLocaleString()
      }))
    },
    {
      id: 'users',
      title: 'Customer Directory List',
      description: 'Directory of registered customer profiles, credentials, role privileges, and account sign-up history.',
      endpoint: '/auth/users',
      icon: Users,
      color: '#ec4899',
      mapFn: (data) => data.map((user) => ({
        'User ID': user._id,
        'Full Name': user.name,
        'Business Name': user.businessName || 'N/A',
        'Email Address': user.email,
        'Contact Number': user.phone || 'N/A',
        'Profile Status': user.status || 'Active',
        'Customer Segment': user.role?.toUpperCase() || 'B2C',
        'Account Verification': user.isVerified ? 'Verified' : 'Unverified',
        'GST Number': user.gstNumber || 'N/A',
        'Wallet Balance (INR)': user.wallet || 0,
        'Default Address': (user.addresses && user.addresses.length > 0) ? `${user.addresses[0].address || ''}, ${user.addresses[0].city || ''}`.trim() : 'N/A',
        'Operational Zone ID': user.locationId || 'Global',
        'Date Registered': new Date(user.createdAt).toLocaleString(),
        'Last Updated': new Date(user.updatedAt).toLocaleString()
      }))
    },
    {
      id: 'sellers',
      title: 'Seller Partner Network',
      description: 'Directory of all onboarded merchant organizations, active categories, contact details, and approvals.',
      endpoint: '/sellers',
      icon: Store,
      color: '#f59e0b',
      mapFn: (data) => data.map((seller) => ({
        'Merchant ID': seller._id,
        Name: seller.name,
        Email: seller.email,
        'Business/Store Name': seller.businessName || seller.storeName || 'Undisclosed',
        'Business Address': seller.businessAddress || 'Not listed',
        Phone: seller.phone || 'No phone',
        'GST Registration': seller.gstNumber || 'N/A',
        'PAN Card No.': seller.panNumber || 'N/A',
        'Allowed Credit Terms (Days)': seller.creditDays || 0,
        'Store Logo URL': seller.storePic ? getFullUrl(seller.storePic) : 'N/A',
        'GST Document URL': seller.gstDoc ? getFullUrl(seller.gstDoc) : 'N/A',
        'PAN Document URL': seller.panDoc ? getFullUrl(seller.panDoc) : 'N/A',
        'Trade Licence URL': seller.tradeLicenseDoc ? getFullUrl(seller.tradeLicenseDoc) : 'N/A',
        'RMC/AMPC URL': seller.rmcAmpcDoc ? getFullUrl(seller.rmcAmpcDoc) : 'N/A',
        'Food Licence URL': seller.foodLicenseDoc ? getFullUrl(seller.foodLicenseDoc) : 'N/A',
        'Verification Status': seller.status || 'pending',
        'Verified Access': seller.isVerified ? 'Verified' : 'Limited Access',
        'Approval Status': seller.isApproved ? 'Approved' : 'Pending'
      }))
    },
    {
      id: 'drivers',
      title: 'Logistics Fleet Directory',
      description: 'Operational logs of active courier and dispatch drivers, assigned zones, and logistics status.',
      endpoint: '/drivers',
      icon: Truck,
      color: '#10b981',
      mapFn: (data) => data.map((driver) => ({
        'Driver ID': driver._id,
        'Full Name': driver.name,
        'Email Address': driver.email,
        'Mobile Phone': driver.phone,
        'Duty Status': driver.status === 'active' ? 'On Duty' : 'Off Duty',
        'Approval Status': driver.isApproved ? 'Approved' : 'Suspended',
        'Vehicle Type': driver.vehicleType || 'N/A',
        'Vehicle Number': driver.vehicleNumber || 'N/A',
        'License Number': driver.licenseNumber || 'N/A',
        'Cash Management Enabled': driver.cashManagement ? 'Yes' : 'No',
        'Wallet Balance (INR)': driver.wallet || 0,
        'Completed Deliveries': driver.completedDeliveries || 0,
        'Operational Zone': driver.locationId?.city || 'Global',
        'Registration Date': new Date(driver.createdAt).toLocaleString(),
        'Last Updated': new Date(driver.updatedAt).toLocaleString()
      }))
    },
    {
      id: 'payments',
      title: 'Merchant Settlement Ledgers',
      description: 'Seller accounting ledgers, pending payments, payout approvals, and historical settlements.',
      endpoint: '/payments/sellers',
      icon: Wallet,
      color: '#3b82f6',
      mapFn: (data) => data.map((item) => ({
        'Seller ID': item.seller?._id || 'N/A',
        'Merchant Business Name': item.seller?.businessName || item.seller?.storeName || item.seller?.companyName || item.seller?.name || 'Unknown',
        'Merchant Owner': item.seller?.name || 'N/A',
        'Merchant Email': item.seller?.email || 'N/A',
        'Merchant Phone': item.seller?.phone || 'N/A',
        'Active Balance (INR)': item.balance || 0,
        'Pending Clearance (INR)': item.pendingBalance || 0,
        'Total Earned (INR)': item.totalEarned || 0,
        'Bank Name': item.seller?.bankDetails?.bankName || 'N/A',
        'Account Number': item.seller?.bankDetails?.accountNumber || 'N/A',
        'IFSC Code': item.seller?.bankDetails?.ifscCode || 'N/A',
        'Last Settled Payout': item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'N/A'
      }))
    },
    {
      id: 'reviews',
      title: 'Customer Feedback Registry',
      description: 'Complete listing of all product reviews, verified purchases, satisfaction ratings, and customer quotes.',
      endpoint: '/reviews',
      icon: MessageSquare,
      color: '#8b5cf6',
      mapFn: (data) => data.map((review) => ({
        'Review ID': review._id,
        'Reviewer Name': review.userId?.name || 'Anonymous',
        'Reviewer Email': review.userId?.email || 'N/A',
        'Product Name': review.productId?.name || 'Deleted Product',
        'Product ID': review.productId?._id || 'N/A',
        'Satisfaction Rating': review.rating,
        'Review Title': review.title || 'N/A',
        'Review Content': review.comment || 'N/A',
        'Attachments Count': (review.media || []).length,
        'Verification Status': review.isVerifiedPurchase ? 'Verified Purchase' : 'Unverified',
        'Approval Status': review.isApproved ? 'Approved' : 'Pending',
        'Date Received': new Date(review.createdAt).toLocaleString()
      }))
    },
    {
      id: 'deliveries',
      title: 'Logistics Delivery Slots',
      description: 'Operational logs of operational hours slots, active capacities, and service windows settings.',
      endpoint: '/deliveries/slots',
      icon: Clock,
      color: '#06b6d4',
      mapFn: (data) => data.map((slot, index) => ({
        'Slot Sequence ID': index + 1,
        'Slot ID': slot._id,
        'Start Time': slot.startTime,
        'End Time': slot.endTime,
        'Capacity (Orders)': slot.capacity || 'Unlimited',
        'Current Orders Count': slot.ordersCount || 0,
        'Status': slot.isActive ? 'Active' : 'Inactive',
        'Operational Zone': slot.locationId || 'Global',
        'Created At': slot.createdAt ? new Date(slot.createdAt).toLocaleString() : 'N/A',
        'Last Updated': slot.updatedAt ? new Date(slot.updatedAt).toLocaleString() : 'N/A'
      }))
    },
    {
      id: 'commissions',
      title: 'Category Commission Matrix',
      description: 'Listings of active sales commissions rules and structures assigned per category unit.',
      endpoint: '/categories',
      icon: Percent,
      color: '#a855f7',
      mapFn: (data) => data.map(cat => ({
        'Category Name': cat.name,
        'Subcategories Count': (cat.subCategories || []).length,
        'Commission Matrix Count': (cat.commissions || []).length
      }))
    },
    {
      id: 'cash',
      title: 'B2B Manual Cash Register',
      endpoint: '/cash',
      description: 'Cash logs, manual field collector entries, and pending office deposits records.',
      icon: Coins,
      color: '#14b8a6',
      mapFn: (data) => data.map((tx) => ({
        'Transaction ID': tx._id,
        'Collector / User Name': tx.name || 'N/A',
        'Phone Reference': tx.phone || 'N/A',
        'Email Address': tx.email || 'N/A',
        'Ledger Type': tx.type || 'B2C',
        'Cash Amount (INR)': tx.amount,
        'Deposit Method': tx.paymentMethod || 'Cash',
        'Verification Method': tx.type === 'B2B' ? 'Password' : 'OTP',
        'Notes / Description': tx.description || 'Manual Settlement',
        'Transaction Status': 'Completed',
        'Timestamp Record': new Date(tx.createdAt || tx.date).toLocaleString()
      }))
    }
  ];

  const handleExportSingle = async (report) => {
    setLoading(true);
    setActiveReport(report.id);
    setStatusMsg(`Polling active database for ${report.title}...`);

    try {
      let endpoint = report.endpoint;
      let finalData = [];

      if (report.id === 'commissions') {
        const [catRes, commRes] = await Promise.all([
          api.get('/categories'),
          api.get('/commissions')
        ]);
        const cats = catRes.data;
        const comms = commRes.data;

        cats.forEach(cat => {
          const catComms = comms.filter(c => c.categoryId === cat._id);
          if (catComms.length > 0) {
            catComms.forEach(c => {
              finalData.push({
                'Category ID': cat._id,
                'Category Name': cat.name,
                'Subcategories Count': (cat.subCategories || []).length,
                'Commission ID': c._id,
                'Packaging Unit': c.unit,
                'Commission Type': c.commissionType === 'percentage' ? 'Percentage (%)' : 'Flat (₹)',
                'Commission Rate / Value': c.commissionValue,
                'Created At': c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A'
              });
            });
          } else {
            finalData.push({
              'Category ID': cat._id,
              'Category Name': cat.name,
              'Subcategories Count': (cat.subCategories || []).length,
              'Commission ID': 'N/A',
              'Packaging Unit': 'N/A',
              'Commission Type': 'None',
              'Commission Rate / Value': 0,
              'Created At': 'N/A'
            });
          }
        });
      } else {
        const { data } = await api.get(endpoint);
        finalData = report.mapFn(data);
        if (report.id === 'orders') finalData = filterByDate(finalData, 'Date Placed');
        if (report.id === 'cash') finalData = filterByDate(finalData, 'Timestamp Record');
        if (report.id === 'reviews') finalData = filterByDate(finalData, 'Date Received');
        if (report.id === 'users') finalData = filterByDate(finalData, 'Date Registered');
      }

      setStatusMsg(`Compiling spreadsheet grid...`);
      const ws = XLSX.utils.json_to_sheet(finalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, report.title.substring(0, 31));

      setStatusMsg(`Writing file stream...`);
      XLSX.writeFile(wb, `Zudo_${report.id.charAt(0).toUpperCase() + report.id.slice(1)}_Report.xlsx`);
      setStatusMsg(`Successfully generated!`);
    } catch (err) {
      console.error(err);
      setStatusMsg(`Generation failed: ${err.message || 'Server timeout'}`);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setActiveReport(null);
        setStatusMsg('');
      }, 3000);
    }
  };

  const handleExportMaster = async () => {
    setLoading(true);
    setActiveReport('master');
    setStatusMsg('Initializing bulk database extraction pipeline...');

    try {
      const wb = XLSX.utils.book_new();
      let totalRevenue = 0;
      let totalOrders = 0;
      let activeSellers = 0;
      let activeDrivers = 0;
      let activeLocations = 0;

      for (const report of reportTypes) {
        setStatusMsg(`Downloading ${report.title}...`);
        let finalData = [];

        if (report.id === 'commissions') {
          const [catRes, commRes] = await Promise.all([
            api.get('/categories'),
            api.get('/commissions')
          ]);
          const cats = catRes.data;
          const comms = commRes.data;
          cats.forEach(cat => {
            const catComms = comms.filter(c => c.categoryId === cat._id);
            if (catComms.length > 0) {
              catComms.forEach(c => {
                finalData.push({
                  'Category ID': cat._id,
                  'Category Name': cat.name,
                  'Subcategories Count': (cat.subCategories || []).length,
                  'Commission ID': c._id,
                  'Packaging Unit': c.unit,
                  'Commission Type': c.commissionType === 'percentage' ? 'Percentage (%)' : 'Flat (₹)',
                  'Commission Rate / Value': c.commissionValue,
                  'Created At': c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A'
                });
              });
            } else {
              finalData.push({
                'Category ID': cat._id,
                'Category Name': cat.name,
                'Subcategories Count': (cat.subCategories || []).length,
                'Commission ID': 'N/A',
                'Packaging Unit': 'N/A',
                'Commission Type': 'None',
                'Commission Rate / Value': 0,
                'Created At': 'N/A'
              });
            }
          });
        } else {
          const { data } = await api.get(report.endpoint);
          finalData = report.mapFn(data);
          if (report.id === 'orders') finalData = filterByDate(finalData, 'Date Placed');
          if (report.id === 'cash') finalData = filterByDate(finalData, 'Timestamp Record');
          if (report.id === 'reviews') finalData = filterByDate(finalData, 'Date Received');
          if (report.id === 'users') finalData = filterByDate(finalData, 'Date Registered');

          if (report.id === 'orders') {
            totalOrders = data.length;
            totalRevenue = data.reduce((sum, o) => sum + (o.orderStatus !== 'Cancelled' ? o.totalAmount : 0), 0);
            activeLocations = [...new Set(data.map(o => o.locationId?.city).filter(Boolean))].length;
          }
          if (report.id === 'sellers') activeSellers = data.length;
          if (report.id === 'drivers') activeDrivers = data.length;
        }

        const ws = XLSX.utils.json_to_sheet(finalData);
        XLSX.utils.book_append_sheet(wb, ws, report.title.substring(0, 31));
      }

      setStatusMsg('Compiling Executive KPI Sheet...');
      const summaryData = [
        ['ZUDO METRIC EXECUTIVE KPI SUMMARY', ''],
        [],
        ['Indicator Title', 'Metric Value'],
        ['Gross Sales Volume (INR)', `₹${totalRevenue.toLocaleString()}`],
        ['Total Order Transactions', totalOrders],
        ['Sellers Onboarded Count', activeSellers],
        ['Logistics Fleet Drivers', activeDrivers],
        ['Active Operations Cities', activeLocations],
        ['Operational Security Check', 'Pass'],
        [],
        ['Report Generated At', new Date().toLocaleString()],
        ['Security Scope', 'Confidential - Administrative Access Only']
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      const finalWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(finalWb, wsSummary, 'Executive KPI Overview');

      wb.SheetNames.forEach(name => {
        XLSX.utils.book_append_sheet(finalWb, wb.Sheets[name], name);
      });

      setStatusMsg('Downloading Master Audit Workbook...');
      XLSX.writeFile(finalWb, 'Zudo_Master_Operational_Audit.xlsx');
      setStatusMsg('Master Audit Spreadsheet Generated Successfully!');
    } catch (err) {
      console.error(err);
      setStatusMsg(`Master Generation Failed: ${err.message || 'Timeout Error'}`);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setActiveReport(null);
        setStatusMsg('');
      }, 3000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Reports Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 4px' }}>Reports</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', margin: 0 }}>Export data as Excel spreadsheets</p>
        </div>
        <button
          onClick={handleExportMaster}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 20px', borderRadius: '10px',
            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)'
          }}
        >
          {loading && activeReport === 'master' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          Download All Reports
        </button>
      </div>

      {/* Custom Date Range Filter */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        borderRadius: '20px',
        border: filterActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--glass-border)',
        background: filterActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--card-bg)',
        transition: 'border 0.3s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <CalendarRange size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>Custom Date Filter</span>
          {filterActive && (
            <span style={{
              fontSize: '11px', fontWeight: 700, background: 'rgba(99,102,241,0.15)',
              color: '#8b5cf6', padding: '3px 10px', borderRadius: '20px',
              border: '1px solid rgba(139,92,246,0.3)', letterSpacing: '0.5px'
            }}>ACTIVE</span>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>From Date</label>
            <input
              type="date"
              className="input-field"
              style={{ height: '40px', fontSize: '13px', padding: '0 12px', minWidth: '160px', borderRadius: '10px' }}
              value={startDate}
              max={endDate || undefined}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Date</label>
            <input
              type="date"
              className="input-field"
              style={{ height: '40px', fontSize: '13px', padding: '0 12px', minWidth: '160px', borderRadius: '10px' }}
              value={endDate}
              min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', paddingBottom: '1px' }}>
            <button
              onClick={applyFilter}
              style={{
                height: '40px', padding: '0 20px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              Apply Filter
            </button>
            {filterActive && (
              <button
                onClick={clearFilter}
                style={{
                  height: '40px', padding: '0 16px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.3)', fontWeight: 600,
                  fontSize: '13px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', gap: '6px', transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              >
                <X size={14} /> Clear
              </button>
            )}
          </div>
        </div>
        {filterActive && (
          <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-dim)', margin: '12px 0 0' }}>
            📅 Filtering reports by date range: <strong style={{ color: 'var(--text-main)' }}>{startDate || '—'}</strong> → <strong style={{ color: 'var(--text-main)' }}>{endDate || '—'}</strong>. Applies to Orders, Cash, Reviews, and Users exports.
          </p>
        )}
      </div>

      {/* Progress & Feedback Billboard */}
      {statusMsg && (
        <div className="glass-card" style={{
          padding: '16px 24px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {loading ? (
            <Loader2 className="animate-spin" style={{ color: '#8b5cf6' }} size={20} />
          ) : (
            <CheckCircle style={{ color: '#10b981' }} size={20} />
          )}
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{statusMsg}</span>
        </div>
      )}

      {/* Reports Catalog Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <FileText size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>Export by Category</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isProcessing = loading && activeReport === report.id;
            return (
              <div
                key={report.id}
                className="glass-card hover-row"
                style={{
                  padding: '28px',
                  borderRadius: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '20px',
                  border: '1px solid var(--glass-border)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Visual back glow corresponding to card color */}
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: `${report.color}0c`,
                  filter: 'blur(10px)',
                  pointerEvents: 'none'
                }}></div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{
                      padding: '12px',
                      borderRadius: '16px',
                      background: `${report.color}15`,
                      color: report.color
                    }}>
                      <Icon size={22} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {report.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.6', margin: 0 }}>
                    {report.description}
                  </p>
                </div>

                <button
                  onClick={() => handleExportSingle(report)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'var(--glass-bg)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--glass-border)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = `${report.color}10`;
                      e.currentTarget.style.border = `1px solid ${report.color}35`;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'var(--glass-bg)';
                      e.currentTarget.style.border = '1px solid var(--glass-border)';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" style={{ color: report.color }} />
                  ) : (
                    <Download size={16} />
                  )}
                  <span>{isProcessing ? 'Generating...' : 'Export Excel'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default Reports;
