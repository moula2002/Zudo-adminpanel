import toast from 'react-hot-toast';
import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Maximize2
} from 'lucide-react';

const PopupAds = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [zoomImage, setZoomImage] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    link: '',
    showOn: 'Home',
    isActive: true,
    image: null,
    imageUrl: '',
    expiresAt: ''
  });

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data } = await api.get('/popup-ads');
      setAds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch ads', err);
      toast.error('Failed to load popup ads');
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, imageUrl: url, image: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImagePreview(url ? getFullUrl(url) : '');
  };

  const clearImage = () => {
    setImagePreview('');
    setFormData(prev => ({ ...prev, image: null, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title?.trim()) {
      toast.error('Please enter a campaign title');
      return;
    }

    let finalImageUrl = formData.imageUrl?.trim() || editingAd?.imageUrl || '';

    if (!formData.image && !finalImageUrl) {
      toast.error('Please upload or provide an image for the popup ad');
      return;
    }

    setSubmitting(true);
    try {
      // Upload new image if provided
      if (formData.image) {
        const fileData = new FormData();
        fileData.append('file', formData.image);
        const uploadRes = await uploadApi.post('/upload', fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data?.url || uploadRes.data?.fileUrl;
        if (!finalImageUrl) {
          toast.error('Image upload failed. Please try again.');
          setSubmitting(false);
          return;
        }
      }

      if (!finalImageUrl) {
        toast.error('Creative image is required');
        setSubmitting(false);
        return;
      }

      const payload = {
        title: formData.title.trim(),
        link: formData.link ? formData.link.trim() : '',
        showOn: formData.showOn,
        isActive: formData.isActive,
        imageUrl: finalImageUrl,
        expiresAt: formData.expiresAt || null
      };

      if (editingAd) {
        await api.put(`/popup-ads/${editingAd._id}`, payload);
        toast.success('Popup ad updated successfully');
      } else {
        await api.post('/popup-ads', payload);
        toast.success('Popup ad created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchAds();
    } catch (err) {
      console.error('Error saving popup ad:', err);
      toast.error(err.response?.data?.message || 'Failed to save popup ad');
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
      imageUrl: '',
      expiresAt: ''
    });
    setImagePreview('');
    setEditingAd(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    const existingUrl = ad.imageUrl ? getFullUrl(ad.imageUrl) : '';
    setFormData({
      title: ad.title || '',
      link: ad.link || '',
      showOn: ad.showOn || 'Home',
      isActive: ad.isActive !== undefined ? ad.isActive : true,
      image: null,
      imageUrl: ad.imageUrl || '',
      expiresAt: ad.expiresAt ? new Date(ad.expiresAt).toISOString().split('T')[0] : ''
    });
    setImagePreview(existingUrl);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ad?')) return;
    try {
      await api.delete(`/popup-ads/${id}`);
      setAds(ads.filter(ad => ad._id !== id));
      toast.success('Ad removed successfully');
    } catch (err) {
      toast.error('Failed to delete ad');
    }
  };

  const toggleStatus = async (ad) => {
    try {
      const { data } = await api.put(`/popup-ads/${ad._id}`, { isActive: !ad.isActive });
      setAds(ads.map(a => a._id === ad._id ? data : a));
      toast.success(ad.isActive ? 'Ad deactivated' : 'Ad activated');
    } catch (err) {
      toast.error('Failed to update status');
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
            {/* Image Container with contain fit and fallback */}
            <div style={{ position: 'relative', height: '240px', background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img
                src={getFullUrl(ad.imageUrl)}
                alt={ad.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://placehold.co/600x600?text=Image+Not+Available';
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {/* Action buttons on image */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  title="View full image"
                  onClick={() => setZoomImage(getFullUrl(ad.imageUrl))}
                  style={{
                    padding: '8px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: 'none', cursor: 'pointer',
                    background: 'rgba(15, 23, 42, 0.75)', color: '#fff'
                  }}
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  type="button"
                  title={ad.isActive ? 'Active - click to deactivate' : 'Inactive - click to activate'}
                  onClick={() => toggleStatus(ad)}
                  style={{
                    padding: '8px', borderRadius: '12px', backdropFilter: 'blur(10px)', border: 'none', cursor: 'pointer',
                    background: ad.isActive ? 'rgba(34, 197, 94, 0.9)' : 'rgba(15, 23, 42, 0.8)',
                    color: '#fff'
                  }}
                >
                  {ad.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
                <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.9)', color: '#fff', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                  {ad.showOn}
                </span>
              </div>
            </div>

            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px' }}>{ad.title}</h3>
                {ad.link ? (
                  <a href={ad.link} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ExternalLink size={12} /> {ad.link}
                  </a>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>No link configured</span>
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

      {/* Lightbox / Zoom Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '24px' }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={zoomImage} alt="Enlarged preview" style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} />
            <button
              onClick={() => setZoomImage(null)}
              style={{ position: 'absolute', top: '-16px', right: '-16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--glass-border)', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>{editingAd ? 'Refine Popup Ad' : 'New Popup Ad'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Campaign Title</label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="E.g. Summer Mega Discount"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Show On Screen</label>
                  <select
                    className="input-field"
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.showOn}
                    onChange={e => setFormData({ ...formData, showOn: e.target.value })}
                  >
                    <option value="Home">Home Screen</option>
                    <option value="Categories">Categories</option>
                    <option value="Products">Product Details</option>
                    <option value="All">Everywhere</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase' }}>Target Link (Optional)</label>
                  <input
                    type="url"
                    className="input-field"
                    style={{ height: '38px', fontSize: '13px', padding: '0 12px' }}
                    value={formData.link}
                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://example.com/offers"
                  />
                </div>

                {/* Creative Image Section with Clear Preview */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Creative Image</label>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={clearImage}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  {/* Image Preview Box */}
                  {imagePreview ? (
                    <div style={{ position: 'relative', height: '180px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      <img
                        src={imagePreview}
                        alt="Creative preview"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/600x400?text=Invalid+Image';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '6px', color: '#fff', fontSize: '10px' }}>
                        Image Preview
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        height: '120px',
                        borderRadius: '16px',
                        border: '2px dashed var(--glass-border)',
                        background: 'rgba(255,255,255,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        marginBottom: '10px'
                      }}
                    >
                      <Upload size={24} style={{ color: 'var(--text-dim)' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Click to browse or upload creative image</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Recommended: PNG, JPG, WEBP (Square or Vertical)</span>
                    </div>
                  )}

                  {/* File Upload Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    style={{ display: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--glass-border)',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Upload size={14} /> {imagePreview ? 'Change File' : 'Choose File'}
                    </button>
                    <input
                      type="text"
                      className="input-field"
                      style={{ height: '36px', fontSize: '12px', padding: '0 12px', flex: 1 }}
                      value={formData.imageUrl}
                      onChange={handleImageUrlChange}
                      placeholder="Or paste image web URL (https://...)"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--card-bg)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                  />
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
