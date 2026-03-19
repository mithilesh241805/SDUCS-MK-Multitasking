import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const RecycleBinPage = () => {
  const [files, setFiles] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecycled();
  }, []);

  const fetchRecycled = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/files/recycle-bin');
      setFiles(data.files || []);
      setTotalSize(data.totalSize || 0);
    } catch {
      toast.error('Failed to load recycle bin files');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.post(`/files/${id}/restore`);
      toast.success('File restored successfully');
      fetchRecycled();
    } catch {
      toast.error('Restore failed');
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      if (window.confirm("Permanently delete this file? This cannot be undone.")) {
        await api.delete(`/files/${id}/permanent`);
        toast.success('File permanently deleted');
        fetchRecycled();
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>Recycle Bin – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>🗑️ Recycle Bin</h1>
            <p style={{ color: 'rgba(240,240,255,0.5)' }}>Items are automatically deleted after 30 days</p>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 16px', borderRadius: 12 }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.6)', marginRight: 8 }}>Wasted Space:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>{formatBytes(totalSize)}</span>
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(240,240,255,0.3)' }}>
            <p style={{ fontSize: '3rem' }}>🌬️</p>
            <p style={{ fontSize: '1rem', marginTop: 12 }}>Recycle Bin is empty</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {files.map(file => (
              <div key={file.id} className="glass-card" style={{ padding: 16 }}>
                <p style={{ fontWeight: '600', color: '#f0f0ff', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📄 {file.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', marginBottom: 8 }}>
                  Size: {formatBytes(file.size)}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#fca5a5', marginBottom: 16 }}>
                  Deletes: {new Date(file.autoDeleteAt).toLocaleDateString()}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleRestore(file.id)} className="btn btn-secondary btn-sm" style={{ flex: 1, padding: 6 }}>
                    ↩️ Restore
                  </button>
                  <button onClick={() => handlePermanentDelete(file.id)} className="btn btn-danger btn-sm" style={{ flex: 1, padding: 6 }}>
                    ❌ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RecycleBinPage;
