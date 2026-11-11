import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { 
  Star, Trash2, MessageSquare, User, Package, Image as ImageIcon, Video, 
  Loader2, Calendar, Quote, Download, CheckCircle2, XCircle, Clock, 
  Search, Filter, RefreshCw, Send, ShieldCheck, Reply, AlertCircle, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [moderatingId, setModeratingId] = useState(null);

  const exportToExcel = () => {
    const exportData = reviews.map((review) => ({
      'Review ID': review._id,
      'Product Name': review.productId?.name || 'Deleted Product',
      'Reviewer Name': review.userId?.name || 'Anonymous',
      'Reviewer Email': review.userId?.email || 'N/A',
      'Rating': review.rating,
      'Title': review.title || '',
      'Comment': review.comment || '',
      'Status': review.status || 'Approved',
      'Verified Purchase': review.isVerifiedPurchase ? 'Yes' : 'No',
      'Helpful Votes': review.helpfulCount || (review.helpfulVotes || []).length,
      'Admin Reply': review.adminReply?.comment || '',
      'Submitted Date': new Date(review.createdAt).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Reviews");
    XLSX.writeFile(wb, "Zudo_Customer_Reviews_Ledger.xlsx");
    toast.success('Reviews ledger exported to Excel');
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, ratingFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (ratingFilter !== 'All') params.rating = ratingFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const { data } = await api.get('/reviews', { params });
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Moderate Status (Approve / Reject)
  const handleUpdateStatus = async (reviewId, newStatus) => {
    setModeratingId(reviewId);
    try {
      const { data } = await api.put(`/reviews/${reviewId}/status`, { status: newStatus });
      if (data?.success || data?.review) {
        toast.success(`Review ${newStatus.toLowerCase()} successfully`);
        setReviews(prev => prev.map(r => r._id === reviewId ? { ...r, status: newStatus } : r));
      } else {
        toast.error(data?.message || 'Failed to update review status');
      }
    } catch (error) {
      console.error('Status moderation error:', error);
      toast.error(error.response?.data?.message || 'Error updating review status');
    } finally {
      setModeratingId(null);
    }
  };

  // Submit Official Admin Reply
  const handleSubmitReply = async (reviewId) => {
    if (!replyText.trim()) {
      toast.error('Reply comment cannot be empty');
      return;
    }
    setSubmittingReply(true);
    try {
      const { data } = await api.post(`/reviews/${reviewId}/reply`, { comment: replyText.trim() });
      if (data?.success || data?.review) {
        toast.success(data?.message || 'Official reply posted successfully');
        setReviews(prev => prev.map(r => r._id === reviewId ? {
          ...r,
          adminReply: data.review?.adminReply || { comment: replyText.trim(), repliedAt: new Date() }
        } : r));
        setReplyingReviewId(null);
        setReplyText('');
      } else {
        toast.error(data?.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Delete Review
  const deleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this review? Product rating will be recalculated.')) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews(prev => prev.filter(r => r._id !== id));
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  // Filter reviews client-side for search
  const filteredReviews = useMemo(() => {
    if (!searchTerm.trim()) return reviews;
    const term = searchTerm.toLowerCase();
    return reviews.filter(r => 
      (r.productId?.name || '').toLowerCase().includes(term) ||
      (r.userId?.name || '').toLowerCase().includes(term) ||
      (r.userId?.email || '').toLowerCase().includes(term) ||
      (r.title || '').toLowerCase().includes(term) ||
      (r.comment || '').toLowerCase().includes(term)
    );
  }, [reviews, searchTerm]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = reviews.length;
    const sumRating = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = total > 0 ? (sumRating / total).toFixed(1) : '0.0';
    const pending = reviews.filter(r => (r.status || 'Approved') === 'Pending').length;
    const verified = reviews.filter(r => r.isVerifiedPurchase).length;
    const approved = reviews.filter(r => (r.status || 'Approved') === 'Approved').length;
    const rejected = reviews.filter(r => r.status === 'Rejected').length;
    return { total, avg, pending, verified, approved, rejected };
  }, [reviews]);

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={14} 
            className={i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} 
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--glass-bg)', 
        padding: '20px 24px', 
        borderRadius: '20px', 
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Star size={20} className="fill-amber-400 text-amber-400" />
            Customer Review Moderation
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0' }}>
            Inspect customer ratings, moderate public visibility, and submit official merchant replies
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={fetchReviews}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'var(--card-bg)', 
              color: 'var(--text-main)', 
              border: '1px solid var(--glass-border)',
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px'
            }}
            title="Refresh reviews"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            onClick={exportToExcel}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
              color: '#ffffff', 
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
              transition: 'all 0.3s ease',
              fontSize: '13px'
            }}
          >
            <Download size={15} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Reviews</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>{stats.total}</div>
          <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px', fontWeight: 600 }}>Recorded in system</div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Average Rating</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{stats.avg}</span>
            <Star size={20} className="fill-amber-400 text-amber-400" />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Across all submissions</div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Moderation</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: stats.pending > 0 ? '#f59e0b' : 'var(--text-main)', marginTop: '4px' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '11px', color: stats.pending > 0 ? '#f59e0b' : 'var(--text-dim)', marginTop: '4px', fontWeight: 600 }}>
            {stats.pending > 0 ? 'Requires attention' : 'All reviews reviewed'}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px 20px', borderRadius: '18px', border: '1px solid var(--glass-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verified Purchases</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{stats.verified}</div>
          <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>Confirmed customer orders</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: '16px',
        background: 'var(--glass-bg)',
        padding: '16px 20px',
        borderRadius: '16px',
        border: '1px solid var(--glass-border)'
      }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'All', label: 'All Reviews' },
            { id: 'Approved', label: 'Approved', count: stats.approved },
            { id: 'Pending', label: 'Pending', count: stats.pending },
            { id: 'Rejected', label: 'Rejected', count: stats.rejected }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === tab.id ? '1px solid #6366f1' : '1px solid var(--glass-border)',
                background: statusFilter === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--card-bg)',
                color: statusFilter === tab.id ? '#6366f1' : 'var(--text-dim)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span style={{ 
                  fontSize: '10px', 
                  padding: '2px 6px', 
                  borderRadius: '6px', 
                  background: statusFilter === tab.id ? '#6366f1' : 'rgba(255,255,255,0.06)',
                  color: statusFilter === tab.id ? '#ffffff' : 'var(--text-dim)' 
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Rating Filter and Keyword Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Star Filter Dropdown */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid var(--glass-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Star Ratings</option>
            <option value="5">5 Stars only</option>
            <option value="4">4 Stars only</option>
            <option value="3">3 Stars only</option>
            <option value="2">2 Stars only</option>
            <option value="1">1 Star only</option>
          </select>

          {/* Search Box */}
          <div style={{ 
            position: 'relative', 
            display: 'flex', 
            alignItems: 'center',
            minWidth: '240px' 
          }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)' }} />
            <input
              type="text"
              placeholder="Search product, customer, text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '10px',
                border: '1px solid var(--glass-border)',
                background: 'var(--card-bg)',
                color: 'var(--text-main)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '40vh', gap: '16px' }}>
          <Loader2 className="animate-spin" style={{ color: '#6366f1' }} size={40} />
          <div style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Fetching customer reviews...</div>
        </div>
      ) : (
        /* Reviews Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
          {filteredReviews.map((review) => {
            const isApproved = (review.status || 'Approved') === 'Approved';
            const isRejected = review.status === 'Rejected';
            const isPending = review.status === 'Pending';

            return (
              <div 
                key={review._id} 
                className="glass-card" 
                style={{ 
                  padding: '22px', 
                  borderRadius: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  border: isPending ? '1px solid rgba(245, 158, 11, 0.4)' : isRejected ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)'
                }}
              >
                {/* Header: User & Status Badge & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '42px', 
                      height: '42px', 
                      borderRadius: '12px', 
                      background: 'rgba(99, 102, 241, 0.12)', 
                      color: '#6366f1', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px'
                    }}>
                      {review.userId?.name ? review.userId.name.charAt(0).toUpperCase() : <User size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                        {review.userId?.name || 'Anonymous Customer'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {review.userId?.email || 'No email provided'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Status Pill */}
                    {isApproved && (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        color: '#10b981', 
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        fontSize: '10px', 
                        fontWeight: 800 
                      }}>
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    )}
                    {isPending && (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: 'rgba(245, 158, 11, 0.1)', 
                        color: '#f59e0b', 
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        fontSize: '10px', 
                        fontWeight: 800 
                      }}>
                        <Clock size={12} /> Pending
                      </span>
                    )}
                    {isRejected && (
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '4px', 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        color: '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        padding: '4px 8px', 
                        borderRadius: '8px', 
                        fontSize: '10px', 
                        fontWeight: 800 
                      }}>
                        <XCircle size={12} /> Rejected
                      </span>
                    )}

                    {/* Delete button */}
                    <button 
                      onClick={() => deleteReview(review._id)}
                      style={{ 
                        padding: '6px', 
                        borderRadius: '8px', 
                        background: 'rgba(239, 68, 68, 0.08)', 
                        border: 'none', 
                        color: '#ef4444', 
                        cursor: 'pointer',
                        transition: '0.2s'
                      }}
                      title="Purge review"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Product Info & Star Rating Banner */}
                <div style={{ 
                  padding: '10px 14px', 
                  background: 'var(--card-bg)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--glass-border)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Package size={14} style={{ color: '#6366f1', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {review.productId?.name || 'Deleted Product'}
                    </span>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {renderStars(review.rating)}
                  </div>
                </div>

                {/* Review Text & Title */}
                <div style={{ position: 'relative' }}>
                  {review.title && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      {review.title}
                    </div>
                  )}
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5', margin: 0, fontStyle: 'italic' }}>
                    "{review.comment}"
                  </p>
                </div>

                {/* Media attachments if any */}
                {review.media && review.media.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {review.media.map((item, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                        {item.type === 'image' ? (
                          <img src={getFullUrl(item.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'var(--bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Video size={18} style={{ color: 'var(--text-main)', opacity: 0.5 }} />
                          </div>
                        )}
                        <a href={getFullUrl(item.url)} target="_blank" rel="noreferrer" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 800, textDecoration: 'none' }} className="media-overlay">VIEW</a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Official Store Reply (if already replied) */}
                {review.adminReply?.comment && (
                  <div style={{ 
                    padding: '10px 14px', 
                    borderRadius: '12px', 
                    background: 'rgba(99, 102, 241, 0.08)', 
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    fontSize: '12px' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 800, color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Reply size={12} /> Zudo Merchant Response
                      </span>
                      {review.adminReply.repliedAt && (
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                          {new Date(review.adminReply.repliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-main)', fontStyle: 'normal' }}>
                      {review.adminReply.comment}
                    </p>
                  </div>
                )}

                {/* Inline Reply Input Box */}
                {replyingReviewId === review._id && (
                  <div style={{ 
                    padding: '12px', 
                    borderRadius: '12px', 
                    background: 'var(--card-bg)', 
                    border: '1px solid #6366f1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1' }}>
                      Respond as Zudo Store Manager
                    </label>
                    <textarea
                      rows="2"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your public response to this customer review..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '12px',
                        outline: 'none',
                        resize: 'none'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => { setReplyingReviewId(null); setReplyText(''); }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--glass-border)',
                          background: 'transparent',
                          color: 'var(--text-dim)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        disabled={submittingReply || !replyText.trim()}
                        onClick={() => handleSubmitReply(review._id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#6366f1',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: submittingReply ? 0.6 : 1
                        }}
                      >
                        {submittingReply ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Post Reply
                      </button>
                    </div>
                  </div>
                )}

                {/* Moderation Actions Toolbar */}
                <div style={{ 
                  marginTop: 'auto', 
                  paddingTop: '12px', 
                  borderTop: '1px solid var(--glass-border)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {/* Left: Metadata info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span style={{ 
                        color: '#10b981', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        padding: '2px 6px', 
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <ShieldCheck size={10} /> VERIFIED
                      </span>
                    )}
                  </div>

                  {/* Right: Moderation Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Reply Toggle Button */}
                    <button
                      onClick={() => {
                        setReplyingReviewId(replyingReviewId === review._id ? null : review._id);
                        setReplyText(review.adminReply?.comment || '');
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text-main)',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Write or edit store reply"
                    >
                      <Reply size={12} />
                      {review.adminReply?.comment ? 'Edit Reply' : 'Reply'}
                    </button>

                    {/* Approve button */}
                    {!isApproved && (
                      <button
                        disabled={moderatingId === review._id}
                        onClick={() => handleUpdateStatus(review._id, 'Approved')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Approve this review for public visibility"
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                    )}

                    {/* Reject button */}
                    {!isRejected && (
                      <button
                        disabled={moderatingId === review._id}
                        onClick={() => handleUpdateStatus(review._id, 'Rejected')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#ef4444',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Hide this review from customer view"
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredReviews.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
              <p style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>No reviews found</p>
              <p style={{ fontSize: '12px', margin: 0 }}>Try clearing your filters or search term to see more reviews.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reviews;
