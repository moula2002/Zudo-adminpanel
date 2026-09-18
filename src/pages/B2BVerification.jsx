import React, { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import * as XLSX from 'xlsx';
import { getFullUrl } from '../utils/media_utils';
import { 
  Users, 
  FileText, 
  Check, 
  X, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  Download,
  XCircle
} from 'lucide-react';

const B2BVerification = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [activeTab, setActiveTab] = useState('Pending');
  const [showImageModal, setShowImageModal] = useState(null);
  const [counts, setCounts] = useState({ pending: 0, verified: 0 });

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'Pending' ? '/auth/b2b-pending' : '/auth/b2b-verified';
      const { data } = await api.get(endpoint);
      setPendingUsers(data);
      
      // Also fetch counts for tabs
      const [pendingRes, verifiedRes] = await Promise.all([
        api.get('/auth/b2b-pending'),
        api.get('/auth/b2b-verified')
      ]);
      setCounts({
        pending: pendingRes.data.length,
        verified: verifiedRes.data.length
      });
    } catch (err) {
      console.error('Failed to fetch B2B users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [activeTab]);

  const handleVerify = async (id) => {
    if (!window.confirm('Are you sure you want to verify this business?')) return;
    setActionLoading(id);
    try {
      await api.put(`/auth/verify-b2b/${id}`);
      fetchPendingUsers();
    } catch (err) {
      alert('Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this business?')) return;
    setActionLoading(id);
    try {
      await api.put(`/auth/reject-b2b/${id}`);
      fetchPendingUsers();
    } catch (err) {
      alert('Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };


  const openPdfModal = (path) => {
    setSelectedPdf(getImageUrl(path));
  };

  const downloadFile = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', url.split('/').pop());
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (!pendingUsers || pendingUsers.length === 0) {
      alert(`No B2B ${activeTab.toLowerCase()} applications to export!`);
      return;
    }

    const mappedData = pendingUsers.map(user => ({
      "User ID": user._id,
      "Business Name": user.businessName,
      "Owner Name": user.name,
      "Role": user.role,
      "GST Number": user.gstNumber || 'N/A',
      "PAN Number": user.panNumber || 'N/A',
      "Aadhaar Number": user.aadhaarNumber || 'N/A',
      "Email": user.email,
      "Phone": user.phone,
      "Business Address": user.businessAddress || 'N/A',
      "Applied Date": new Date(user.createdAt).toLocaleDateString(),
      "Verification Status": activeTab === 'Pending' ? 'PENDING REVIEW' : 'VERIFIED'
    }));

    const ws = XLSX.utils.json_to_sheet(mappedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeTab} Applications`);
    XLSX.writeFile(wb, `Zudo_B2B_Verification_${activeTab}_Applications.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div>
          <h3 style={{ fontSize: '18px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} />
            B2B Identity Management
          </h3>
        </div>
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
          <span>Export {activeTab} Applications</span>
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
        {['Pending', 'Verified'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent', border: 'none', color: activeTab === tab ? '#6366f1' : '#64748b',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer', padding: '8px 16px',
              borderBottom: activeTab === tab ? '2px solid #6366f1' : 'none', transition: '0.3s',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            {tab} Applications
            <span style={{ 
              fontSize: '10px', background: activeTab === tab ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)', 
              padding: '2px 8px', borderRadius: '6px', color: activeTab === tab ? '#6366f1' : '#94a3b8' 
            }}>
              {tab === 'Pending' ? counts.pending : counts.verified}
            </span>
          </button>
        ))}
      </div>

      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'var(--card-bg)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Business Info</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Documents</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>ID Credentials</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Created At</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>{activeTab === 'Pending' ? 'Actions' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ padding: '48px', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" style={{ margin: '0 auto', color: '#6366f1' }} />
                </td>
              </tr>
            ) : pendingUsers.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No {activeTab.toLowerCase()} B2B users found
                </td>
              </tr>
            ) : pendingUsers.map((user) => (
              <tr key={user._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="hover:bg-white/2">
                <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {user.storePic && (
                        <img 
                          src={getImageUrl(user.storePic)} 
                          alt="Store" 
                          style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '1px solid var(--glass-border)' }}
                        />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--text-main)' }}>
                          <Building2 size={16} color="#6366f1" />
                          {user.businessName}
                          <span style={{ 
                            fontSize: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', 
                            padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase', marginLeft: '4px' 
                          }}>
                            {user.role}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{user.name} (Owner)</div>
                        {user.gstNumber && (
                          <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>GST: {user.gstNumber}</div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                          <Mail size={12} /> {user.email}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-dim)' }}>
                          <Phone size={12} /> {user.phone}
                        </div>
                      </div>
                    </div>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {user.gstPdf && (
                      <button 
                        onClick={() => openPdfModal(user.gstPdf)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
                          padding: '4px 10px', borderRadius: '8px', border: 'none',
                          fontSize: '11px', cursor: 'pointer', fontWeight: 600
                        }}
                      >
                        <FileText size={14} /> GST Doc
                      </button>
                    )}
                    {user.panPdf && (
                      <button 
                        onClick={() => openPdfModal(user.panPdf)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899',
                          padding: '4px 10px', borderRadius: '8px', border: 'none',
                          fontSize: '11px', cursor: 'pointer', fontWeight: 600
                        }}
                      >
                        <FileText size={14} /> PAN Doc
                      </button>
                    )}
                    {user.storePic && (
                      <button 
                        onClick={() => setShowImageModal(user.storePic)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '6px', 
                          background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                          padding: '4px 10px', borderRadius: '8px', border: 'none',
                          fontSize: '11px', cursor: 'pointer', fontWeight: 600
                        }}
                      >
                        <ExternalLink size={14} /> Store Pic
                      </button>
                    )}
                  </div>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                    <div style={{ color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>GST:</span>
                      <span style={{ color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>{user.gstNumber || 'N/A'}</span>
                    </div>
                    <div style={{ color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>PAN:</span>
                      <span style={{ color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>{user.panNumber || 'N/A'}</span>
                    </div>
                    <div style={{ color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span>Aadhaar:</span>
                      <span style={{ color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>{user.aadhaarNumber || 'N/A'}</span>
                    </div>
                    {user.businessAddress && (
                      <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '4px', borderTop: '1px solid var(--glass-border)', paddingTop: '4px' }}>
                        📍 {user.businessAddress}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '20px 24px', color: 'var(--text-dim)', fontSize: '13px' }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                {activeTab === 'Pending' ? (
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleVerify(user._id)}
                        disabled={actionLoading === user._id}
                        title="Verify"
                        style={{ 
                          width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                          background: '#22c55e', color: 'var(--text-main)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {actionLoading === user._id ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      </button>
                      <button 
                        onClick={() => handleReject(user._id)}
                        disabled={actionLoading === user._id}
                        title="Reject"
                        style={{ 
                          width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                          background: '#ef4444', color: 'var(--text-main)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {actionLoading === user._id ? <Loader2 size={18} className="animate-spin" /> : <X size={18} />}
                      </button>
                    </div>
                  </td>
                ) : (
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ 
                      padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 800,
                      background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', textTransform: 'uppercase',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }}>
                      <Check size={14} /> Verified
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Image Viewer Modal */}
      {showImageModal && (
        <div style={{ 
          position: 'fixed', inset: 0, 
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          padding: '40px'
        }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button 
              onClick={() => setShowImageModal(null)}
              style={{ 
                position: 'absolute', top: '-40px', right: '-40px',
                background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer'
              }}
            >
              <X size={32} />
            </button>
            <img 
              src={getImageUrl(showImageModal)} 
              alt="Store" 
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} 
            />
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {selectedPdf && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '40px'
        }}>
          <div style={{ 
            width: '100%', maxWidth: '1000px', height: '100%', 
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-main)', fontSize: '20px', fontWeight: 600 }}>Document Preview</h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => downloadFile(selectedPdf)}
                  style={{ 
                    padding: '10px 20px', borderRadius: '12px', border: 'none', 
                    background: '#6366f1', color: 'var(--text-main)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600
                  }}
                >
                  <Download size={18} /> Download
                </button>
                <button 
                  onClick={() => setSelectedPdf(null)}
                  style={{ 
                    padding: '10px', borderRadius: '12px', border: 'none', 
                    background: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', cursor: 'pointer'
                  }}
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, background: '#fff', borderRadius: '20px', overflow: 'hidden', position: 'relative' }}>
              <iframe 
                src={selectedPdf} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BVerification;
