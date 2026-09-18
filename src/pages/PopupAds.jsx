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
  MousePointer2,
  AlertCircle
} from 'lucide-react';

const PopupAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    link: '',
    showOn: 'Home',
    isActive: true,
    image: null,
    expiresAt: ''
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data } = await api.get('/popup-ads');
      setAds(data);
    } catch (err) {
      console.error('Failed to fetch ads', err);
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
      let imageUrl = editingAd?.imageUrl || '';

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
        showOn: formData.showOn,
        isActive: formData.isActive,
        imageUrl,
        expiresAt: formData.expiresAt || null
      };

      if (editingAd) {
        await api.put(`/popup-ads/${editingAd._id}`, payload);
      } else {
        await api.post('/popup-ads', payload);
      }

      setShowModal(false);
      resetForm();
      fetchAds();
    } catch (err) {
      alert('Failed to save popup ad');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      link: '',
      showOn: 'Home',
      isActive: true,
      image: null,
      expiresAt: ''
    });
    setEditingAd(null);
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      link: ad.link || '',
      showOn: ad.showOn,
      isActive: ad.isActive,
      image: null,
      expiresAt: ad.expiresAt ? new Date(ad.expiresAt).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) return;
    try {
      await api.delete(`/popup-ads/${id}`);
      setAds(ads.filter(ad => ad._id !== id));
    } catch (err) {
      alert('Failed to delete ad');
    }
  };

  const toggleStatus = async (ad) => {
    try {
      const { data } = await api.put(`/popup-ads/${ad._id}`, { isActive: !ad.isActive });
      setAds(ads.map(a => a._id === ad._id ? data : a));
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
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Popup Advertisements</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)' }}>Manage promotional popups for your mobile and web apps</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={18} /> <span>New Popup Ad</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {ads.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '80px', background: 'var(--card-bg)', borderRadius: '32px', border: '1px dashed var(--glass-border)' }}>
            <ImageIcon size={48} style={{ color: 'var(--text-dim)', marginBottom: '16px' }} />
            <p style={{ color: 'var(--text-dim)' }}>No popup ads configured yet.</p>
          </div>
        ) : ads.map(ad => (
          <div key={ad._id} className="glass-card" style={{ borderRadius: '28px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative', height: '180px' }}>
              <img src={getFullUrl(ad.imageUrl)} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleStatus(ad)}
                  style={{
                    padding: '8px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: 'none', cursor: 'pointer',
                    background: ad.isActive ? 'rgba(34, 197, 94, 0.9)' : 'rgba(15, 23, 42, 0.8)',
                    color: 'var(--text-main)'
                  }}
                >
                  {ad.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
                <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.9)', color: 'var(--text-main)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {ad.showOn}
                </span>
              </div>
            </div>

            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{ad.title}</h3>
                {ad.link && (
                  <a href={ad.link} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ExternalLink size={12} /> {ad.link}
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(ad)} style={{ padding: '8px', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-dim)', border: 'none', cursor: 'pointer' }}>
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(ad._id)} style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{editingAd ? 'Refine Popup Ad' : 'New Popup Ad'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Campaign Title</label>
                  <input type="text" className="input-field" style={{ height: '38px', fontSize: '13px', padding: '0 12px' }} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="E.g. Summer Sale 2024" />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Show On</label>
                  <select className="input-field" style={{ height: '38px', fontSize: '13px', padding: '0 12px' }} value={formData.showOn} onChange={e => setFormData({ ...formData, showOn: e.target.value })}>
                    <option value="Home">Home Screen</option>
                    <option value="Categories">Categories</option>
                    <option value="Products">Product Details</option>
                    <option value="All">Everywhere</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Target Link (Optional)</label>
                  <input type="url" className="input-field" style={{ height: '38px', fontSize: '13px', padding: '0 12px' }} value={formData.link} onChange={e => setFormData({ ...formData, link: e.target.value })} placeholder="https://..." />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Creative Image</label>
                  <input type="file" className="input-field" style={{ height: '38px', fontSize: '13px', padding: '6px 12px' }} onChange={handleImageChange} accept="image/*" required={!editingAd} />
                  {editingAd && <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Leave blank to keep current image</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card-bg)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} />
                  <label htmlFor="isActive" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>Enabled and Active</label>
                </div>

                <button type="submit" className="btn-primary" disabled={submitting} style={{ height: '42px', marginTop: '6px', fontSize: '14px' }}>
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : (editingAd ? 'Update Campaign' : 'Launch Campaign')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PopupAds;
