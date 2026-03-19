import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const DownloadManager = () => {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [fileInfo, setFileInfo] = useState(null);
  const [downloads, setDownloads] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 10000); // Poll status
    return () => clearInterval(interval);
  }, []);

  const fetchDownloads = async () => {
    try {
      const { data } = await api.get('/downloads');
      setDownloads(data.downloads);
    } catch {}
    finally { setLoadingHistory(false); }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!url) return;
    setAnalyzing(true);
    setFileInfo(null);
    try {
      const { data } = await api.post('/downloads/analyze', { url });
      setFileInfo(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid URL or not accessible');
    } finally {
      setAnalyzing(false);
    }
  };

  const handeStartDownload = async () => {
    if (!fileInfo) return;
    try {
      if (!fileInfo.hasEnoughData) {
        return toast.error("Not enough download data. Upgrade plan or watch ads.");
      }
      await api.post('/downloads/start', {
        url: fileInfo.url,
        fileName: fileInfo.fileName,
        mimeType: fileInfo.mimeType,
        fileSize: fileInfo.fileSize,
        category: fileInfo.category,
      });
      toast.success('Download Queued');
      setFileInfo(null);
      setUrl('');
      fetchDownloads();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start download');
    }
  };

  const handleCancelDownload = async (id) => {
    try {
      await api.delete(`/downloads/${id}`);
      toast.success('Download cancelled');
      fetchDownloads();
    } catch (err) {
      toast.error('Failed to cancel download');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>Download Manager – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>📥 Download Manager</h1>
            <p style={{ color: 'rgba(240,240,255,0.5)' }}>Download files directly from valid URLs to your cloud</p>
          </div>
          <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', padding: '10px 16px', borderRadius: 12 }}>
            <span style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.6)', marginRight: 8 }}>Available Data:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#06b6d4' }}>{formatBytes(user?.downloadData?.availableBytes)}</span>
          </div>
        </div>

        {/* Input area */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <form onSubmit={handleAnalyze} style={{ display: 'flex', gap: 12 }}>
            <input
              type="url"
              className="input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste direct file URL here (e.g. https://example.com/file.mp4)"
              style={{ flex: 1, height: 48 }}
              required
            />
            <button type="submit" className="btn btn-primary" style={{ height: 48, padding: '0 24px' }} disabled={analyzing}>
              {analyzing ? '🔍 Analyzing...' : 'Analyze URL'}
            </button>
          </form>

          {fileInfo && (
            <div style={{ marginTop: 24, padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#f0f0ff', marginBottom: 8 }}>📄 {fileInfo.fileName}</h3>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <span className="badge badge-blue">{fileInfo.category.toUpperCase()}</span>
                    <span className="badge badge-purple">{fileInfo.fileSizeFormatted}</span>
                  </div>
                  {!fileInfo.hasEnoughData ? (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ You do not have enough download data to fetch this file.</p>
                  ) : (
                    <p style={{ color: '#10b981', fontSize: '0.85rem' }}>✅ You have enough data to download this file.</p>
                  )}
                </div>
                {fileInfo.previewType === 'image' && fileInfo.previewUrl && (
                  <img src={fileInfo.previewUrl} alt="Preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }} />
                )}
              </div>
              
              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-success"
                  onClick={handeStartDownload}
                  disabled={!fileInfo.hasEnoughData}
                >
                  🚀 Start Download to Cloud
                </button>
                <button className="btn btn-ghost" onClick={() => setFileInfo(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Downloads History */}
        <h3 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Status History</h3>
        {loadingHistory ? (
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        ) : downloads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(240,240,255,0.3)' }}>
            <p style={{ fontSize: '2.5rem' }}>📭</p>
            <p>No downloads yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {downloads.map((dl) => (
              <div key={dl._id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: '2rem', flexShrink: 0 }}>
                  {dl.status === 'completed' ? '✅' : dl.status === 'failed' ? '❌' : dl.status === 'queued' ? '⏳' : '📥'}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ fontWeight: 600, color: '#f0f0ff', marginBottom: 4, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {dl.fileName}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.4)', margin: 0 }}>
                    {formatBytes(dl.fileSize)} • {new Date(dl.createdAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100 }}>
                  <span className={`badge badge-${dl.status === 'completed' ? 'green' : dl.status === 'failed' || dl.status === 'cancelled' ? 'red' : 'blue'}`} style={{ marginBottom: 4 }}>
                    {dl.status.toUpperCase()}
                  </span>
                  {(dl.status === 'queued' || dl.status === 'downloading') && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.7rem', padding: '2px 6px', display: 'block', marginTop: 4, color: '#ef4444' }}
                      onClick={() => handleCancelDownload(dl._id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DownloadManager;
