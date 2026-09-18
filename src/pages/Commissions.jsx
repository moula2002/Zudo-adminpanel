import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getFullUrl } from '../utils/media_utils';
import { 
  Percent, 
  Layers, 
  Plus, 
  Trash2, 
  XCircle, 
  Loader2, 
  Save, 
  Edit3,
  BadgePercent,
  Coins,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

const COMMON_UNITS = ['pcs', 'g', 'kg', 'ltr', 'ml'];

const Commissions = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Minimum Billing States
  const [minBillAmountB2B, setMinBillAmountB2B] = useState('');
  const [minBillAmountB2C, setMinBillAmountB2C] = useState('');
  const [minBillData, setMinBillData] = useState([]);
  const [isGlobalMinBill, setIsGlobalMinBill] = useState(false);
  const [updatingMinBill, setUpdatingMinBill] = useState(false);

  const exportToExcel = () => {
    const exportData = [];
    categories.forEach(cat => {
      if (cat.commissions && cat.commissions.length > 0) {
        cat.commissions.forEach(comm => {
          exportData.push({
            'Category Name': cat.name,
            'Subcategories Count': (cat.subCategories || []).length,
            'Packaging Unit': comm.unit,
            'Commission Type': comm.commissionType === 'percentage' ? 'Percentage (%)' : 'Flat (₹)',
            'Commission Value': comm.commissionValue
          });
        });
      } else {
        exportData.push({
          'Category Name': cat.name,
          'Subcategories Count': (cat.subCategories || []).length,
          'Packaging Unit': 'N/A',
          'Commission Type': 'None',
          'Commission Value': 0
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Commissions Structure");
    XLSX.writeFile(wb, "Zudo_Category_Commissions_Rates.xlsx");
  };
  
  // Modal / Editing State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [commissionsList, setCommissionsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State for new commission rule inside modal
  const [newRule, setNewRule] = useState({
    unit: 'pcs',
    commissionType: 'percentage',
    commissionValue: ''
  });
  const [customUnit, setCustomUnit] = useState('');
  const [showCustomUnitInput, setShowCustomUnitInput] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    Promise.all([
      api.get('/categories'),
      api.get('/commissions'),
      api.get('/commissions/minimum-billing')
    ]).then(([catRes, commRes, billRes]) => {
      const cats = catRes.data;
      const comms = commRes.data;

      // Dynamically map independent commissions data to their categories
      const mappedCats = cats.map(cat => ({
        ...cat,
        commissions: comms.filter(c => c.categoryId === cat._id)
      }));

      setCategories(mappedCats);

      if (billRes.data.isGlobal) {
        setIsGlobalMinBill(true);
        setMinBillData(billRes.data.data);
      } else {
        setIsGlobalMinBill(false);
        setMinBillAmountB2B(billRes.data.minimumBillAmountB2B);
        setMinBillAmountB2C(billRes.data.minimumBillAmountB2C);
      }

      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  const handleSaveMinBill = async (targetLocId = null, b2bVal = null, b2cVal = null) => {
    setUpdatingMinBill(true);
    try {
      await api.put('/commissions/minimum-billing', {
        minimumBillAmountB2B: b2bVal !== null ? b2bVal : minBillAmountB2B,
        minimumBillAmountB2C: b2cVal !== null ? b2cVal : minBillAmountB2C,
        targetLocationId: targetLocId
      });
      alert('Minimum billing settings saved successfully!');
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to save minimum billing settings');
    } finally {
      setUpdatingMinBill(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openManageModal = (category) => {
    setSelectedCategory(category);
    setCommissionsList(category.commissions || []);
    setNewRule({
      unit: 'pcs',
      commissionType: 'percentage',
      commissionValue: ''
    });
    setCustomUnit('');
    setShowCustomUnitInput(false);
  };

  const handleAddRule = () => {
    const unitName = newRule.unit === 'custom' ? customUnit.trim() : newRule.unit;
    if (!unitName) {
      alert('Please enter a valid unit name');
      return;
    }
    const val = parseFloat(newRule.commissionValue);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid commission value');
      return;
    }

    // Check if unit rule already exists
    if (commissionsList.some(r => r.unit.toLowerCase() === unitName.toLowerCase())) {
      alert(`A commission rule for unit "${unitName}" already exists.`);
      return;
    }

    const updatedList = [
      ...commissionsList,
      {
        unit: unitName,
        commissionType: newRule.commissionType,
        commissionValue: val
      }
    ];
    setCommissionsList(updatedList);
    
    // Reset add rule form
    setNewRule({
      unit: 'pcs',
      commissionType: 'percentage',
      commissionValue: ''
    });
    setCustomUnit('');
    setShowCustomUnitInput(false);
  };

  const handleRemoveRule = (index) => {
    setCommissionsList(commissionsList.filter((_, i) => i !== index));
  };

  const handleSaveCommissions = async () => {
    setSubmitting(true);
    try {
      await api.put(`/commissions/category/${selectedCategory._id}`, {
        commissions: commissionsList
      });
      setSelectedCategory(null);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Failed to save commissions settings');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Percent size={26} className="text-primary" /> Commissions & Minimum Billing
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Manage unit-based sales commission rates and minimum billing limits.
          </p>
        </div>
        <button 
          onClick={exportToExcel}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            background: 'var(--glass-bg)', 
            color: 'var(--text-main)', 
            border: '1px solid var(--glass-border)',
            padding: '10px 20px',
            borderRadius: '14px',
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
          <Download size={18} />
          <span>Export Commissions</span>
        </button>
      </div>

      {/* Minimum Billing Settings Card */}
      <div className="glass-card" style={{ padding: '32px', borderRadius: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Coins size={22} style={{ color: '#6366f1' }} />
            Branch Minimum Billing Thresholds
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Orders placed below this value will require minimum bill balance enforcement.
          </p>
        </div>

        {isGlobalMinBill ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Bulk Update All Cities */}
            <div style={{ 
              background: 'rgba(99, 102, 241, 0.05)', 
              border: '1px solid rgba(99, 102, 241, 0.15)', 
              borderRadius: '20px', 
              padding: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div>
                <p style={{ fontWeight: 700, margin: 0 }}>Bulk Update All Locations</p>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>Set a uniform minimum bill threshold across all cities</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', paddingLeft: '4px' }}>B2B Minimum</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>₹</span>
                    <input 
                      type="number" 
                      placeholder="e.g. 2000" 
                      value={minBillAmountB2B} 
                      onChange={(e) => setMinBillAmountB2B(e.target.value)}
                      style={{ padding: '12px 16px 12px 32px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)', width: '130px', fontWeight: 700 }}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', paddingLeft: '4px' }}>B2C Minimum</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>₹</span>
                    <input 
                      type="number" 
                      placeholder="e.g. 500" 
                      value={minBillAmountB2C} 
                      onChange={(e) => setMinBillAmountB2C(e.target.value)}
                      style={{ padding: '12px 16px 12px 32px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)', width: '130px', fontWeight: 700 }}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => handleSaveMinBill(null, minBillAmountB2B, minBillAmountB2C)}
                  disabled={updatingMinBill}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', marginTop: '18px' }}
                >
                  {updatingMinBill ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>Apply to All</span>
                </button>
              </div>
            </div>

            {/* Individual Cities list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {minBillData.map((item, idx) => (
                <div key={idx} className="glass" style={{ padding: '20px', borderRadius: '20px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📍 Operational Zone</span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0 0' }}>{item.city}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', paddingLeft: '4px' }}>B2B Min.</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-dim)', fontSize: '13px' }}>₹</span>
                        <input 
                          type="number" 
                          value={item.minimumBillAmountB2B} 
                          onChange={(e) => {
                            const updated = [...minBillData];
                            updated[idx].minimumBillAmountB2B = e.target.value;
                            setMinBillData(updated);
                          }}
                          style={{ padding: '8px 12px 8px 24px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)', width: '100%', fontWeight: 700, fontSize: '14px' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', paddingLeft: '4px' }}>B2C Min.</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '10px', fontWeight: 700, color: 'var(--text-dim)', fontSize: '13px' }}>₹</span>
                        <input 
                          type="number" 
                          value={item.minimumBillAmountB2C} 
                          onChange={(e) => {
                            const updated = [...minBillData];
                            updated[idx].minimumBillAmountB2C = e.target.value;
                            setMinBillData(updated);
                          }}
                          style={{ padding: '8px 12px 8px 24px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)', width: '100%', fontWeight: 700, fontSize: '14px' }}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSaveMinBill(item.locationId, item.minimumBillAmountB2B, item.minimumBillAmountB2C)}
                      disabled={updatingMinBill}
                      style={{ padding: '10px 16px', borderRadius: '10px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '13px', width: '100%' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, margin: 0 }}>Configure Minimum Billing Value</p>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '2px 0 0' }}>Set the target order price threshold below which minimum billing applies.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', paddingLeft: '4px' }}>B2B Minimum</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>₹</span>
                  <input 
                    type="number" 
                    placeholder="e.g. 2000" 
                    value={minBillAmountB2B} 
                    onChange={(e) => setMinBillAmountB2B(e.target.value)}
                    style={{ padding: '12px 16px 12px 32px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)', width: '130px', fontWeight: 700 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', paddingLeft: '4px' }}>B2C Minimum</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '12px', fontWeight: 700, color: 'var(--text-dim)' }}>₹</span>
                  <input 
                    type="number" 
                    placeholder="e.g. 500" 
                    value={minBillAmountB2C} 
                    onChange={(e) => setMinBillAmountB2C(e.target.value)}
                    style={{ padding: '12px 16px 12px 32px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-main)', width: '130px', fontWeight: 700 }}
                  />
                </div>
              </div>
              <button 
                onClick={() => handleSaveMinBill(null, minBillAmountB2B, minBillAmountB2C)}
                disabled={updatingMinBill}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}
              >
                {updatingMinBill ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>Save Setting</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid of Categories */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px' }}>
          <Loader2 className="animate-spin text-primary" size={40} style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '12px', color: 'var(--text-dim)' }}>Loading categories...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {categories.map(cat => (
            <div key={cat._id} className="glass-card" style={{ padding: '24px', borderRadius: '24px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '20px' }}>
              
              {/* Category Info Header */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                  {cat.imageUrl ? (
                    <img src={getFullUrl(cat.imageUrl)} alt="" style={{ width: '56px', height: '56px', borderRadius: '16px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={24} color="var(--text-dim)" />
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{cat.name}</h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      {(cat.subCategories || []).length} Subcategories
                    </span>
                  </div>
                </div>

                {/* Commissions List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Commission Structure
                  </p>
                  
                  {cat.commissions && cat.commissions.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {cat.commissions.map((comm, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '6px 12px', 
                            borderRadius: '10px', 
                            fontSize: '13px', 
                            fontWeight: 600,
                            background: comm.commissionType === 'percentage' 
                              ? 'rgba(99, 102, 241, 0.12)' 
                              : 'rgba(16, 185, 129, 0.12)',
                            color: comm.commissionType === 'percentage' 
                              ? 'var(--primary)' 
                              : '#10b981',
                            border: comm.commissionType === 'percentage'
                              ? '1px solid rgba(99, 102, 241, 0.2)'
                              : '1px solid rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <span style={{ color: 'var(--text-main)', opacity: 0.6 }}>{comm.unit}:</span>
                          <span>
                            {comm.commissionType === 'percentage' 
                              ? `${comm.commissionValue}%` 
                              : `₹${comm.commissionValue}`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '12px', 
                      borderRadius: '12px', 
                      background: 'rgba(0,0,0,0.02)', 
                      border: '1px dashed var(--glass-border)',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: 'var(--text-dim)',
                      fontStyle: 'italic'
                    }}>
                      No commission added yet
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="btn-secondary" 
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  borderRadius: '12px',
                  padding: '10px'
                }}
                onClick={() => openManageModal(cat)}
              >
                <Edit3 size={16} /> <span>Manage Commissions</span>
              </button>

            </div>
          ))}
        </div>
      )}

      {/* Manage Commissions Modal */}
      {selectedCategory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '560px', borderRadius: '28px', overflow: 'hidden', border: '1px solid var(--glass-border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-bg)' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BadgePercent size={22} className="text-primary" /> {selectedCategory.name}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Configure commission rules per packaging unit</span>
              </div>
              <button onClick={() => setSelectedCategory(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                <XCircle size={24} />
              </button>
            </div>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Form to Add New Commission Rule */}
              <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Add Commission Rule
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {/* Unit Select */}
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>Unit</label>
                    <select 
                      className="input-field" 
                      value={newRule.unit} 
                      onChange={(e) => {
                        setNewRule({ ...newRule, unit: e.target.value });
                        setShowCustomUnitInput(e.target.value === 'custom');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {COMMON_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                      <option value="custom">Custom...</option>
                    </select>
                  </div>

                  {/* Custom Unit text input */}
                  {showCustomUnitInput && (
                    <div style={{ flex: '1 1 150px' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>Enter Custom Unit</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Bunch" 
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Comm Type */}
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>Type</label>
                    <select 
                      className="input-field" 
                      value={newRule.commissionType} 
                      onChange={(e) => setNewRule({ ...newRule, commissionType: e.target.value })}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat (₹)</option>
                    </select>
                  </div>

                  {/* Comm Value */}
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>Value</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      placeholder="e.g. 5" 
                      value={newRule.commissionValue} 
                      onChange={(e) => setNewRule({ ...newRule, commissionValue: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px' }}
                  onClick={handleAddRule}
                >
                  <Plus size={16} /> <span>Add Rule</span>
                </button>
              </div>

              {/* Existing Rules Table/List */}
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Configured Commission Rules
                </p>

                {commissionsList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                    {commissionsList.map((comm, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 16px', 
                          background: 'var(--input-bg)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '14px' 
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px' }}>{comm.unit}</span>
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>—</span>
                          <span style={{ 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            color: comm.commissionType === 'percentage' ? 'var(--primary)' : '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {comm.commissionType === 'percentage' ? <BadgePercent size={14} /> : <Coins size={14} />}
                            {comm.commissionType === 'percentage' ? `${comm.commissionValue}%` : `₹${comm.commissionValue}`}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemoveRule(idx)} 
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#ef4444', 
                            cursor: 'pointer',
                            display: 'flex',
                            padding: '4px',
                            borderRadius: '8px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    padding: '24px', 
                    borderRadius: '16px', 
                    background: 'rgba(0,0,0,0.01)', 
                    border: '1px dashed var(--glass-border)',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: 'var(--text-dim)',
                    fontStyle: 'italic'
                  }}>
                    No rules configured yet. Setup a rule above to get started.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => setSelectedCategory(null)}
                  style={{ borderRadius: '12px', padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  disabled={submitting} 
                  onClick={handleSaveCommissions}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', padding: '10px 20px' }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  <span>Save Commission Settings</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Commissions;
