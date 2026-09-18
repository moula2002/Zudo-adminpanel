import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { User, Mail, Shield, UserCheck, ShieldAlert, FileText, ShoppingBag, MessageSquare, ExternalLink, Search, Loader2, Calendar, Edit, Trash2, Ban, Download } from 'lucide-react';
import * as XLSX from 'xlsx';


const Users = () => {
  const user = JSON.parse(localStorage.getItem('zudo_admin_user') || '{}');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(user.targetSegment && user.targetSegment !== 'Both' ? user.targetSegment.toLowerCase() : 'b2c');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', phone: '', password: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDocuments = (user) => {

    const gstUrl = getFullUrl(user.gstPdf);
    const panUrl = getFullUrl(user.panPdf);

    if (gstUrl) window.open(gstUrl, '_blank');
    if (panUrl) window.open(panUrl, '_blank');
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditFormData({ name: user.name || '', email: user.email || '', phone: user.phone || '', password: '' });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/auth/users/${editingUser._id}`, editFormData);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error.response?.data?.message || 'Error updating user');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Error deleting user');
    }
  };

  const handleToggleBlock = async (userId, isBlocked) => {
    const action = isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await api.put(`/auth/users/${userId}/block`);
      fetchUsers();
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      alert(error.response?.data?.message || 'Error updating user status');
    }
  };

  const filteredUsers = users.filter(user =>
    user.role?.toLowerCase() === activeTab.toLowerCase() &&
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportUsers = () => {
    const exportData = filteredUsers.map(user => ({
      ID: user._id,
      Name: user.name,
      Email: user.email,
      Phone: user.phone || 'N/A',
      'Business Name': user.businessName || 'N/A',
      'GST Number': user.gstNumber || 'N/A',
      'Role/Type': user.role,
      Verified: user.isVerified ? 'YES' : 'NO',
      Blocked: user.isBlocked ? 'YES' : 'NO',
      'Joined Date': new Date(user.createdAt).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "Zudo_Users_Report.xlsx");
  };


  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={40} />
      <div style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Loading User Directory...</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search users..."
            className="input-field"
            style={{ paddingLeft: '40px', paddingBottom: '10px', paddingTop: '10px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={exportUsers} className="btn-primary" style={{ background: 'var(--glass-bg)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} /> Export
          </button>
          {(!user.targetSegment || user.targetSegment === 'Both') && (
            <div style={{ display: 'flex', background: 'var(--glass-bg)', padding: '4px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <button
                onClick={() => setActiveTab('b2c')}
                style={{
                  padding: '8px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: '0.3s',
                  background: activeTab === 'b2c' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'b2c' ? 'white' : 'var(--text-dim)'
                }}
              >
                Personal (B2C)
              </button>
              <button
                onClick={() => setActiveTab('b2b')}
                style={{
                  padding: '8px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', transition: '0.3s',
                  background: activeTab === 'b2b' ? '#f59e0b' : 'transparent',
                  color: activeTab === 'b2b' ? 'white' : 'var(--text-dim)'
                }}
              >
                Business (B2B)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>User Identity</th>
              {activeTab === 'b2b' && <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Business Info</th>}
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Communication</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '16px 24px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id} style={{ borderBottom: '1px solid var(--glass-border)' }} className="hover-row">
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden'
                    }}>
                      {user.profilePicture ? (
                        <img src={getFullUrl(user.profilePicture)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        user.name ? user.name[0].toUpperCase() : 'U'
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </td>

                {activeTab === 'b2b' && (
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.businessName || 'N/A'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--primary)' }}>GST: {user.gstNumber || 'N/A'}</div>
                  </td>
                )}

                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-dim)' }}><Mail size={12} /> {user.email}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-dim)' }}>📱 {user.phone || 'N/A'}</div>
                  </div>
                </td>

                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {user.isVerified ? (
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                      VERIFIED
                    </span>
                  ) : (
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'var(--glass-bg)', color: 'var(--text-dim)' }}>
                      PENDING
                    </span>
                  )}
                  {user.isBlocked && (
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                      BLOCKED
                    </span>
                  )}
                  </div>
                </td>

                <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {activeTab === 'b2b' && (
                      <button
                        onClick={() => viewDocuments(user)}
                        title="View Documents"
                        style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: 'none', color: '#f59e0b', cursor: 'pointer' }}
                      >
                        <FileText size={18} />
                      </button>
                    )}
                    <button onClick={() => handleEdit(user)} title="Edit User" style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', cursor: 'pointer' }}>
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleToggleBlock(user._id, user.isBlocked)} title={user.isBlocked ? "Unblock User" : "Block User"} style={{ padding: '8px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.1)', border: 'none', color: '#eab308', cursor: 'pointer' }}>
                      <Ban size={18} />
                    </button>
                    <button onClick={() => handleDelete(user._id)} title="Delete User" style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <User size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p>No records found matching your search</p>
          </div>
        )}
      </div>
      
      {/* Edit User Modal */}
      {editingUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '400px', padding: '24px', borderRadius: '24px' }}>
            <h2 style={{ margin: '0 0 24px 0' }}>Edit User</h2>
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>Email</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>Phone</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dim)', fontSize: '13px' }}>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="input-field"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'var(--text-main)', cursor: 'pointer' }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
