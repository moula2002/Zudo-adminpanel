import React, { useState, useEffect } from 'react';
import api, { uploadApi } from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Loader2, 
  X,
  Layout,
  Flag
} from 'lucide-react';

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    type: 'Main',
    isActive: true,
    image: null
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/banners');
      setBanners(data);
    } catch (err) {
      console.error('Failed to fetch banners', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = editingBanner?.imageUrl || '';
      
      // Upload new image if provided
      if (formData.image) {
        const fileData = new FormData();
        fileData.append('file', formData.image);
        const uploadRes = await uploadApi.post('/upload', fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        imageUrl = uploadRes.data.url;
      }

      const payload = {
        title: formData.title,
        link: formData.link,
        type: formData.type,
        isActive: formData.isActive,
        imageUrl
      };

      if (editingBanner) {
        await api.put(`/banners/${editingBanner._id}`, payload);
      } else {
        await api.post('/banners', payload);
      }

      setShowModal(false);
      resetForm();
      fetchBanners();
    } catch (err) {
      alert('Failed to save banner');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      link: '',
      type: 'Main',
      isActive: true,
      image: null
    });
    setEditingBanner(null);
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      link: banner.link || '',
      type: banner.type || 'Main',
      isActive: banner.isActive,
      image: null
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    try {
      await api.delete(`/banners/${id}`);
      setBanners(banners.filter(b => b._id !== id));
    } catch (err) {
      alert('Failed to delete banner');
    }
  };

  const toggleStatus = async (banner) => {
    try {
      const { data } = await api.put(`/banners/${banner._id}`, { isActive: !banner.isActive });
      setBanners(banners.map(b => b._id === banner._id ? data : b));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Promotional Banners</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Manage carousel and promotional banners for your store</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> <span>New Banner</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {banners.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px', background: 'var(--card-bg)', borderRadius: '32px', border: '1px dashed var(--glass-border)' }}>
            <Flag size={48} style={{ color: 'var(--text-dim)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-dim)' }}>No banners configured yet.</p>
          </div>
        ) : banners.map(banner => (
          <div key={banner._id} className="glass-card" style={{ borderRadius: '28px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', height: '200px' }}>
              <img src={getFullUrl(banner.imageUrl)} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => toggleStatus(banner)}
                  style={{ 
                    padding: '8px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: 'none', cursor: 'pointer',
                    background: banner.isActive ? 'rgba(34, 197, 94, 0.9)' : 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-main)'
                  }}
                >
                  {banner.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
                <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.9)', color: 'var(--text-main)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {banner.type}
                </span>
              </div>
            </div>
            
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{banner.title || 'Untitled Banner'}</h3>
                {banner.link && (
                  <a href={banner.link} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ExternalLink size={12} /> {banner.link}
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                <button onClick={() => handleEdit(banner)} style={{ padding: '8px', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-dim)', border: 'none', cursor: 'pointer' }}>
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDelete(banner._id)} style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{editingBanner ? 'Edit Banner' : 'New Banner'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Banner Title</label>
                  <input type="text" className="input-field" style={{ height: '38px', fontSize: '13px', padding: '0 12px' }} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="E.g. Festival Special" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Banner Type</label>
                  <select className="input-field" style={{ height: '38px', fontSize: '13px', padding: '0 12px' }} value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    <option value="Main">Main Carousel</option>
                    <option value="Sidebar">Sidebar Promotion</option>
                    <option value="Promotion">Full Width Promotion</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Target Link (Optional)</label>
                  <input type="url" className="input-field" style={{ height: '38px', fontSize: '13px', padding: '0 12px' }} value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Creative Image</label>
                  <input type="file" className="input-field" style={{ height: '38px', fontSize: '13px', padding: '6px 12px' }} onChange={handleImageChange} accept="image/*" required={!editingBanner} />
                  {editingBanner && <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Leave blank to keep current image</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card-bg)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} />
                  <label htmlFor="isActive" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>Enabled and Visible</label>
                </div>

                <button type="submit" className="btn-primary" disabled={submitting} style={{ height: '42px', marginTop: '6px', fontSize: '14px' }}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : (editingBanner ? 'Update Banner' : 'Create Banner')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;
