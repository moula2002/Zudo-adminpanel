import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { uploadApi } from '../utils/api';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Layers } from 'lucide-react';

const BulkUpload = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentType = searchParams.get('type') || 'categories';
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const downloadTemplate = (type) => {
    let data = [];
    if (type === 'products') {
      data = [
        {
          Name: 'Example Product',
          Category: 'Pulses',
          SubCategory: 'Lentils',
          GST: 5,
          MOQ: 5,
          Unit: '1kg',
          Description: 'High quality lentils directly from farm',
          ImageUrl: 'https://placehold.co/150',
          PdfUrl: '',
          SellerId: '',
          B2C_Size: '500g',
          B2C_Price: 60,
          B2C_Stock: 100,
          B2B_Size: '1kg',
          B2B_Price: 90,
          B2B_Stock: 50,
          Tier1_Qty: 50,
          Tier1_Price: 85,
          Tier2_Qty: 100,
          Tier2_Price: 80,
          Rating: 4.5
        },
        {
          Name: 'Example Product',
          Category: 'Pulses',
          SubCategory: 'Lentils',
          GST: 5,
          MOQ: 5,
          Unit: '1kg',
          Description: 'High quality lentils directly from farm',
          ImageUrl: 'https://placehold.co/150',
          PdfUrl: '',
          SellerId: '',
          B2C_Size: '1kg',
          B2C_Price: 110,
          B2C_Stock: 50,
          B2B_Size: '5kg',
          B2B_Price: 400,
          B2B_Stock: 20,
          Tier1_Qty: 50,
          Tier1_Price: 380,
          Tier2_Qty: 100,
          Tier2_Price: 350,
          Rating: 4.5
        }
      ];
    } else {
      data = [
        {
          Category: 'Pulses',
          CategoryImageUrl: 'https://placehold.co/150',
          SubCategory: 'Lentils',
          SubCategoryImageUrl: 'https://placehold.co/150'
        },
        {
          Category: 'Rice',
          CategoryImageUrl: 'https://placehold.co/150',
          SubCategory: '', // Example of blank subcategory
          SubCategoryImageUrl: ''
        }
      ];
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Zudo_${type}_template.xlsx`);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatus({ type: '', message: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      await uploadApi.post('/products/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus({ type: 'success', message: 'Bulk upload successful! Data has been imported.' });
      setFile(null);
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.message || 'Upload failed. Please check the file format.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Download Excel Templates</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: '4px' }}>
              {currentType === 'categories' ? 'Currently viewing Categories & Subcategories upload template' : 'Currently viewing Products bulk upload template'}
            </p>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '6px 12px',
            borderRadius: '20px',
            background: currentType === 'categories' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            color: currentType === 'categories' ? '#ec4899' : '#6366f1',
            border: `1px solid ${currentType === 'categories' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
          }}>
            {currentType === 'categories' ? 'Subcategories / Categories Mode' : 'Products Mode'}
          </span>
        </div>
        <div className="flex-responsive" style={{ display: 'flex', gap: '20px' }}>
          <div 
            onClick={() => {
              setSearchParams({ type: 'products' });
              downloadTemplate('products');
            }} 
            className="glass" 
            style={{ 
              flex: 1, padding: '24px', borderRadius: '20px', cursor: 'pointer', transition: '0.3s',
              display: 'flex', alignItems: 'center', gap: '16px',
              border: currentType === 'products' ? '2px solid rgba(99, 102, 241, 0.8)' : '1px solid rgba(255,255,255,0.05)',
              background: currentType === 'products' ? 'rgba(99, 102, 241, 0.08)' : 'var(--glass-bg)',
              boxShadow: currentType === 'products' ? '0 8px 25px rgba(99, 102, 241, 0.25)' : 'none'
            }}
          >
            <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '12px', color: '#6366f1' }}>
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Products Template</p>
                {currentType === 'products' && (
                  <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Active Target</span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0' }}>For bulk product inventory</p>
            </div>
            <Download size={18} style={{ marginLeft: 'auto', color: currentType === 'products' ? '#6366f1' : 'var(--text-dim)' }} />
          </div>

          <div 
            onClick={() => {
              setSearchParams({ type: 'categories' });
              downloadTemplate('categories');
            }} 
            className="glass" 
            style={{ 
              flex: 1, padding: '24px', borderRadius: '20px', cursor: 'pointer', transition: '0.3s',
              display: 'flex', alignItems: 'center', gap: '16px',
              border: currentType === 'categories' ? '2px solid rgba(236, 72, 153, 0.8)' : '1px solid rgba(255,255,255,0.05)',
              background: currentType === 'categories' ? 'rgba(236, 72, 153, 0.08)' : 'var(--glass-bg)',
              boxShadow: currentType === 'categories' ? '0 8px 25px rgba(236, 72, 153, 0.25)' : 'none'
            }}
          >
            <div style={{ padding: '12px', background: 'rgba(236, 72, 153, 0.15)', borderRadius: '12px', color: '#ec4899' }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontWeight: 600, margin: 0 }}>Categories & Subcategories Template</p>
                {currentType === 'categories' && (
                  <span style={{ fontSize: '10px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Active Target</span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: '4px 0 0' }}>For categories & subcategories import</p>
            </div>
            <Download size={18} style={{ marginLeft: 'auto', color: currentType === 'categories' ? '#ec4899' : 'var(--text-dim)' }} />
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '32px', borderRadius: '24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Upload File</h3>
        
        {status.message && (
          <div style={{ 
            background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
            border: `1px solid ${status.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`, 
            color: status.type === 'success' ? '#22c55e' : '#ef4444', 
            padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span style={{ fontSize: '14px' }}>{status.message}</span>
          </div>
        )}

        <form onSubmit={handleUpload}>
          <div style={{ 
            border: '2px dashed rgba(255,255,255,0.1)', 
            borderRadius: '20px', 
            padding: '60px 40px', 
            textAlign: 'center',
            background: 'var(--card-bg)',
            cursor: 'pointer',
            transition: '0.3s'
          }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}>
            <input 
              type="file" 
              id="file-upload" 
              style={{ display: 'none' }} 
              onChange={(e) => setFile(e.target.files[0])}
              accept=".xlsx, .xls"
            />
            <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
              <div style={{ 
                width: '64px', height: '64px', background: 'var(--input-bg)', 
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', color: '#6366f1'
              }}>
                <Upload size={32} />
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                {file ? file.name : 'Click to upload or drag and drop'}
              </h4>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Excel files only (.xlsx, .xls)</p>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={!file || loading}
              style={{ minWidth: '160px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Import Data</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,165,0,0.1)' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          Important Instructions
        </h4>
        <ul style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', paddingLeft: '20px' }}>
          <li>Ensure all required columns are present in the Excel file.</li>
          <li>Categories and subcategories will be created automatically if they don't exist.</li>
          <li>Use <b>Description</b>, <b>ImageUrl</b>, and <b>PdfUrl</b> for rich product details. Provide a valid MongoDB Object ID in <b>SellerId</b> to assign a seller.</li>
          <li>To add variants, use <b>B2C_Size</b>, <b>B2C_Price</b>, <b>B2C_Stock</b> for customers, and <b>B2B_Size</b>, <b>B2B_Price</b>, <b>B2B_Stock</b> for wholesale partners.</li>
          <li>You can add up to 5 bulk pricing tiers using columns <b>Tier1_Qty</b>, <b>Tier1_Price</b>, etc.</li>
          <li>Include the <b>GST</b> column to set the product tax rate. Defaults to 0 if left empty.</li>
        </ul>
      </div>
    </div>
  );
};

export default BulkUpload;
