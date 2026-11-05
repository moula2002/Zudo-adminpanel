import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
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
  Flag,
  RefreshCw,
  Search,
  Filter,
  Layers,
  UploadCloud,
  Globe,
  MapPin,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const BANNER_TYPES = [
  { value: 'Main', label: 'Main Carousel', desc: 'Top home carousel banner' },
  { value: 'Sidebar', label: 'Sidebar Promotion', desc: 'Side card promotional placement' },
  { value: 'Promotion', label: 'Full Width Promotion', desc: 'Wide banner between product feeds' }
];

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    type: 'Main',
    locationId: '',
    isActive: true,
    imageUrl: '',
    imageFile: null
  });

  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchBanners();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get('/locations/active');
      if (Array.isArray(data)) {
        setLocations(data);
      }
    } catch (err) {
      console.warn('Could not fetch active locations for banners:', err.message);
    }
  };

  const fetchBanners = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const { data } = await api.get('/banners', {
        headers: {
          'Cache-Control': 'no-cache',
          pragma: 'no-cache',
          'x-location': 'global'
        },
        skipCache: true
      });
      setBanners(Array.isArray(data) ? data : []);
      if (isManual) {
        toast.success('Banners refreshed');
      }
    } catch (err) {
      console.error('Failed to fetch banners:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch banners');
      setBanners([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      link: '',
      type: 'Main',
      locationId: '',
      isActive: true,
      imageUrl: '',
      imageFile: null
    });
    setImagePreview('');
    setEditingBanner(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      link: banner.link || '',
      type: banner.type || 'Main',
      locationId: banner.locationId || banner.location?._id || '',
      isActive: banner.isActive !== undefined ? banner.isActive : true,
      imageUrl: banner.imageUrl || '',
      imageFile: null
    });
    setImagePreview(banner.imageUrl ? getFullUrl(banner.imageUrl) : '');
    setShowModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, imageFile: file }));
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  const handleImageUrlChange = (e) => {
    const url = e.target.value;
    setFormData(prev => ({ ...prev, imageUrl: url, imageFile: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImagePreview(url ? getFullUrl(url) : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.imageFile && !formData.imageUrl && !editingBanner?.imageUrl) {
      toast.error('Please upload an image file or provide an image URL');
      return;
    }

    setSubmitting(true);
    try {
      let finalImageUrl = formData.imageUrl || editingBanner?.imageUrl || '';

      // Upload new image if file chosen
      if (formData.imageFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', formData.imageFile);
        const uploadRes = await uploadApi.post('/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data?.url || uploadRes.data?.secure_url || uploadRes.data?.filename || '';
      }

      if (!finalImageUrl) {
        throw new Error('Image URL is missing. Please select an image.');
      }

      const validLocationId = (formData.locationId && formData.locationId.length === 24)
        ? formData.locationId
        : null;

      const payload = {
        title: formData.title?.trim() || '',
        link: formData.link?.trim() || '',
        type: formData.type || 'Main',
        isActive: formData.isActive !== false,
        imageUrl: finalImageUrl,
        locationId: validLocationId
      };

      // Explicitly pass x-location header to prevent api.js from auto-injecting
      // non-ObjectId tenant strings like 'zudo-bengaluru' which triggers 400 CastError
      const requestConfig = {
        headers: {
          'x-location': validLocationId || 'global'
        }
      };

      if (editingBanner) {
        await api.put(`/banners/${editingBanner._id}`, payload, requestConfig);
        toast.success('Banner updated successfully');
      } else {
        await api.post('/banners', payload, requestConfig);
        toast.success('Banner created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchBanners();
    } catch (err) {
      console.error('Save banner error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      const bannerLoc = (banner.locationId && String(banner.locationId).length === 24)
        ? banner.locationId
        : 'global';

      await api.delete(`/banners/${banner._id}`, {
        headers: { 'x-location': bannerLoc }
      });
      setBanners(prev => prev.filter(b => b._id !== banner._id));
      toast.success('Banner deleted');
    } catch (err) {
      console.error('Delete banner error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete banner');
    }
  };

  const toggleStatus = async (banner) => {
    const updatedStatus = !banner.isActive;
    try {
      const bannerLoc = (banner.locationId && String(banner.locationId).length === 24)
        ? banner.locationId
        : 'global';

      const { data } = await api.put(
        `/banners/${banner._id}`,
        { isActive: updatedStatus },
        { headers: { 'x-location': bannerLoc } }
      );
      setBanners(prev => prev.map(b => (b._id === banner._id ? { ...b, isActive: updatedStatus, ...data } : b)));
      toast.success(updatedStatus ? 'Banner activated' : 'Banner paused');
    } catch (err) {
      console.error('Toggle status error:', err);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Filtered & Searched banners
  const filteredBanners = useMemo(() => {
    return banners.filter(banner => {
      // Type filter
      if (typeFilter !== 'ALL' && banner.type !== typeFilter) return false;

      // Status filter
      if (statusFilter === 'ACTIVE' && !banner.isActive) return false;
      if (statusFilter === 'INACTIVE' && banner.isActive) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = banner.title?.toLowerCase().includes(q);
        const linkMatch = banner.link?.toLowerCase().includes(q);
        const typeMatch = banner.type?.toLowerCase().includes(q);
        if (!titleMatch && !linkMatch && !typeMatch) return false;
      }

      return true;
    });
  }, [banners, typeFilter, statusFilter, searchQuery]);

  // Quick stats
  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter(b => b.isActive).length;
    const inactive = total - active;
    const main = banners.filter(b => b.type === 'Main').length;
    return { total, active, inactive, main };
  }, [banners]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
        <Loader2 className="animate-spin" size={42} color="var(--primary)" />
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', fontWeight: 500 }}>Loading banners...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Promotional Banners</h2>
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              {banners.length} total
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Manage promotional carousels, sidebar graphics, and featured banners across your application
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchBanners(true)}
            disabled={refreshing}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            title="Refresh Banners"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button className="btn-primary" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> <span>New Banner</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Total Banners</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.active}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Active & Visible</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.inactive}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Paused / Inactive</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px 20px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{stats.main}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Main Carousels</div>
          </div>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="glass-card" style={{ padding: '14px 18px', borderRadius: '18px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px', maxWidth: '420px', background: 'var(--input-bg)', padding: '8px 14px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
          <Search size={16} style={{ color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="Search banners by title or link..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '13px', width: '100%' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Type filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: 'var(--text-dim)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field"
              style={{ height: '34px', fontSize: '12px', padding: '0 10px', borderRadius: '10px', cursor: 'pointer' }}
            >
              <option value="ALL">All Types</option>
              <option value="Main">Main Carousel</option>
              <option value="Sidebar">Sidebar Promotion</option>
              <option value="Promotion">Full Width Promotion</option>
            </select>
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ height: '34px', fontSize: '12px', padding: '0 10px', borderRadius: '10px', cursor: 'pointer' }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Banners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
        {filteredBanners.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 24px', background: 'var(--card-bg)', borderRadius: '28px', border: '1px dashed var(--glass-border)' }}>
            <Flag size={44} style={{ color: 'var(--text-dim)', marginBottom: '14px', opacity: 0.7 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              {banners.length === 0 ? 'No banners configured yet' : 'No banners match your filter'}
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 18px' }}>
              {banners.length === 0
                ? 'Create your first promotional carousel banner to display featured products, offers, or announcements to your customers.'
                : 'Try adjusting your search query or status filter to see other banners.'}
            </p>
            {banners.length === 0 && (
              <button className="btn-primary" onClick={handleOpenCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} /> <span>Create First Banner</span>
              </button>
            )}
          </div>
        ) : (
          filteredBanners.map(banner => {
            const locName = banner.locationName || banner.location?.city || banner.location?.name;
            return (
              <div
                key={banner._id}
                className="glass-card"
                style={{
                  borderRadius: '24px',
                  overflow: 'hidden',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.25s ease'
                }}
              >
                {/* Banner Thumbnail */}
                <div style={{ position: 'relative', height: '190px', background: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                  <img
                    src={getFullUrl(banner.imageUrl)}
                    alt={banner.title || 'Promotional Banner'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/600x300?text=Banner+Image+Unavailable';
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Gradient Overlay for badges readability */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 40%, rgba(0,0,0,0.6) 100%)', pointerEvents: 'none' }} />

                  {/* Top Badges */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '10px',
                        background: 'rgba(99, 102, 241, 0.85)',
                        backdropFilter: 'blur(8px)',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {banner.type || 'Main'}
                    </span>

                    <button
                      onClick={() => toggleStatus(banner)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '10px',
                        backdropFilter: 'blur(10px)',
                        border: 'none',
                        cursor: 'pointer',
                        background: banner.isActive ? 'rgba(34, 197, 94, 0.9)' : 'rgba(15, 23, 42, 0.75)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        transition: 'all 0.2s'
                      }}
                      title={banner.isActive ? 'Click to Pause Banner' : 'Click to Activate Banner'}
                    >
                      {banner.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                      <span>{banner.isActive ? 'Active' : 'Paused'}</span>
                    </button>
                  </div>

                  {/* Bottom Location Indicator */}
                  <div style={{ position: 'absolute', bottom: '10px', left: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(8px)',
                        color: '#f8fafc',
                        fontSize: '10px',
                        fontWeight: 700
                      }}
                    >
                      {banner.locationId || locName ? (
                        <>
                          <MapPin size={11} style={{ color: '#ec4899' }} /> {locName || 'Target City'}
                        </>
                      ) : (
                        <>
                          <Globe size={11} style={{ color: '#38bdf8' }} /> Global Store
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Banner Details */}
                <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      {banner.title || 'Untitled Banner'}
                    </h3>
                    {banner.link ? (
                      <a
                        href={banner.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '12px',
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <ExternalLink size={12} /> {banner.link}
                      </a>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>No redirect link configured</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {banner.createdAt ? new Date(banner.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(banner)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '10px',
                          background: 'var(--input-bg)',
                          color: 'var(--text-main)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'all 0.2s'
                        }}
                        title="Edit Banner"
                      >
                        <Edit3 size={14} /> <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDelete(banner)}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                        title="Delete Banner"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '24px',
              overflow: 'hidden',
              border: '1px solid var(--glass-border)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ImageIcon size={18} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                  {editingBanner ? 'Edit Promotional Banner' : 'New Promotional Banner'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Banner Title (Optional / Internal reference)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    style={{ height: '42px', fontSize: '13px', padding: '0 14px', width: '100%', borderRadius: '12px' }}
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Festival Mega Sale, Organic Groceries"
                  />
                </div>

                {/* Banner Type */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Placement / Type *
                  </label>
                  <select
                    className="input-field"
                    style={{ height: '42px', fontSize: '13px', padding: '0 14px', width: '100%', borderRadius: '12px' }}
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                  >
                    {BANNER_TYPES.map(bt => (
                      <option key={bt.value} value={bt.value}>
                        {bt.label} ({bt.desc})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Scope */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Target Location Context
                  </label>
                  <select
                    className="input-field"
                    style={{ height: '42px', fontSize: '13px', padding: '0 14px', width: '100%', borderRadius: '12px' }}
                    value={formData.locationId}
                    onChange={e => setFormData({ ...formData, locationId: e.target.value })}
                  >
                    <option value="">Global (All Locations / Whole Store)</option>
                    {locations.map(loc => (
                      <option key={loc._id} value={loc._id}>
                        {loc.city} ({loc.name || loc.state})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Link */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Redirect Link on Click (Optional)
                  </label>
                  <input
                    type="url"
                    className="input-field"
                    style={{ height: '42px', fontSize: '13px', padding: '0 14px', width: '100%', borderRadius: '12px' }}
                    value={formData.link}
                    onChange={e => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://... or /products?category=..."
                  />
                </div>

                {/* Image Creative Section */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Banner Creative Image *
                  </label>

                  {/* Image Preview Box */}
                  {imagePreview && (
                    <div style={{ position: 'relative', height: '140px', borderRadius: '14px', overflow: 'hidden', marginBottom: '10px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.05)' }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/600x200?text=Invalid+Image+URL';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview('');
                          setFormData(prev => ({ ...prev, imageUrl: '', imageFile: null }));
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remove Image"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Upload file or enter URL */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div
                      style={{
                        border: '2px dashed var(--glass-border)',
                        borderRadius: '12px',
                        padding: '14px',
                        textAlign: 'center',
                        background: 'var(--input-bg)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <UploadCloud size={24} style={{ color: 'var(--primary)', margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                        Click to upload image file
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Supports JPG, PNG, WEBP (Recommended: 1200x500 for Main)
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        style={{ display: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Or Direct URL</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                    </div>

                    <input
                      type="url"
                      className="input-field"
                      style={{ height: '38px', fontSize: '12px', padding: '0 12px', width: '100%', borderRadius: '10px' }}
                      value={formData.imageUrl}
                      onChange={handleImageUrlChange}
                      placeholder="Paste image web link (https://...)"
                    />
                  </div>
                </div>

                {/* Visible / Active Toggle */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--card-bg)',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <input
                    type="checkbox"
                    id="isActiveCheckbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="isActiveCheckbox" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                    Publish Banner Immediately (Enabled & Visible)
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                  style={{
                    height: '44px',
                    marginTop: '8px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>{editingBanner ? 'Updating...' : 'Publishing...'}</span>
                    </>
                  ) : (
                    <span>{editingBanner ? 'Update Banner' : 'Create & Publish Banner'}</span>
                  )}
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
