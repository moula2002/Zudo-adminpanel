import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { Star, Trash2, MessageSquare, User, Package, Image as ImageIcon, Video, Loader2, Calendar, Quote, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const exportToExcel = () => {
    const exportData = reviews.map((review) => ({
      'Reviewer Name': review.userId?.name || 'Anonymous',
      'Reviewer Email': review.userId?.email || 'N/A',
      'Product Name': review.productId?.name || 'Deleted Product',
      'Rating Stars': review.rating,
      'Feedback Comment': review.comment || '',
      'Media Attached Count': (review.media || []).length,
      'Verification Status': 'Verified Purchase',
      'Submitted Date': new Date(review.createdAt).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Reviews");
    XLSX.writeFile(wb, "Zudo_Customer_Reviews_Ledger.xlsx");
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data } = await api.get('/reviews');
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to purge this review from the system?')) return;
    try {
      await api.delete(`/reviews/${id}`);
      setReviews(reviews.filter(r => r._id !== id));
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={14} 
            className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} 
          />
        ))}
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '16px' }}>
      <Loader2 className="animate-spin" style={{ color: '#6366f1' }} size={40} />
      <div style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Fetching Feedback...</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: 'var(--glass-bg)', 
        padding: '16px 24px', 
        borderRadius: '20px', 
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Customer Feedback Ledger</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0' }}>Review and manage verified customer ratings and testimonials</p>
        </div>
        <button 
          onClick={exportToExcel}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--glass-bg)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--glass-border)',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
          }}
        >
          <Download size={16} />
          <span>Export Reviews</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
        {reviews.map((review) => (
          <div key={review._id} className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{review.userId?.name || 'Anonymous'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{review.userId?.email}</div>
                </div>
              </div>
              <button 
                onClick={() => deleteReview(review._id)}
                style={{ padding: '8px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', transition: '0.3s' }}
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={14} style={{ color: '#6366f1' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{review.productId?.name || 'Deleted Product'}</span>
              </div>
              {renderStars(review.rating)}
            </div>

            <div style={{ position: 'relative' }}>
              <Quote size={24} style={{ position: 'absolute', top: '-8px', left: '-8px', color: '#6366f1', opacity: 0.1 }} />
              <p style={{ fontSize: '14px', color: 'var(--text-dim)', lineHeight: '1.6', margin: 0, paddingLeft: '16px', fontStyle: 'italic' }}>
                {review.comment}
              </p>
            </div>

            {review.media && review.media.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {review.media.map((item, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {item.type === 'image' ? (
                      <img src={getFullUrl(item.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'var(--bg-sidebar)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Video size={20} style={{ color: 'var(--text-main)', opacity: 0.5 }} />
                      </div>
                    )}
                    <a href={getFullUrl(item.url)} target="_blank" rel="noreferrer" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', fontSize: '10px', fontWeight: 700, textDecoration: 'none' }} className="media-overlay">VIEW</a>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                <Calendar size={12} /> {new Date(review.createdAt).toLocaleDateString()}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 10px', borderRadius: '20px' }}>
                VERIFIED PURCHASE
              </div>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: '80px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <MessageSquare size={64} style={{ margin: '0 auto 24px', opacity: 0.1 }} />
            <p style={{ fontSize: '18px', fontWeight: 600 }}>No feedback detected in the system</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
