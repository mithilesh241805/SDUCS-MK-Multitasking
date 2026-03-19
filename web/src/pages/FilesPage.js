import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDropzone } from 'react-dropzone';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const FILE_ICONS = { image: '🖼️', video: '🎬', audio: '🎵', document: '📄', archive: '📦', other: '📎' };

const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [tab, setTab] = useState('all'); // 'all' | 'duplicates'
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shareModal, setShareModal] = useState(null);
  const [shareResult, setShareResult] = useState(null);

  useEffect(() => {
    if (tab === 'all') fetchFiles();
    else fetchDuplicates();
  }, [tab, category, search]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/files', { params: { category, search } });
      setFiles(data.files || []);
    } catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  };

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/files/duplicates');
      setDuplicates(data.duplicateGroups || []);
    } catch { toast.error('Failed to detect duplicates'); }
    finally { setLoading(false); }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded / e.total) * 100)),
        });
        toast.success(`✅ ${file.name} uploaded!`);
      } catch (err) {
        toast.error(`Failed: ${file.name} – ${err.response?.data?.error || 'Upload error'}`);
      }
    }
    setUploading(false);
    setUploadProgress(0);
    fetchFiles();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: () => toast.error('Executable files are not allowed'),
  });

  const deleteFile = async (id) => {
    try {
      await api.delete(`/files/${id}`);
      toast.success('Moved to recycle bin');
      fetchFiles();
    } catch { toast.error('Delete failed'); }
  };

  const generateShare = async (id) => {
    setShareModal(id);
    try {
      const { data } = await api.post(`/files/${id}/share`);
      setShareResult(data);
    } catch { toast.error('Failed to generate share link'); }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>My Files – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>📁 My Files</h1>
          <p style={{ color: 'rgba(240,240,255,0.5)' }}>Manage your encrypted cloud files</p>
        </div>

        {/* Upload Zone */}
        <div
          {...getRootProps()}
          style={{
            padding: '32px', marginBottom: 24,
            border: `2px dashed ${isDragActive ? '#7c3aed' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 16, textAlign: 'center', cursor: 'pointer',
            background: isDragActive ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
            transition: 'all 0.2s',
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>
            {uploading ? '⏳' : isDragActive ? '📂' : '⬆️'}
          </div>
          {uploading ? (
            <div>
              <p style={{ color: '#a78bfa', fontWeight: 600 }}>Uploading... {uploadProgress}%</p>
              <div className="progress-bar" style={{ maxWidth: 300, margin: '12px auto 0' }}>
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <p style={{ color: '#f0f0ff', fontWeight: 600 }}>
                {isDragActive ? 'Drop to upload' : 'Drag & drop files here'}
              </p>
              <p style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.85rem' }}>
                or click to select · Files are AES-256 encrypted
              </p>
            </>
          )}
        </div>

        {/* Tabs & Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4 }}>
            {[['all', '📁 All Files'], ['duplicates', '🔍 Duplicates']].map(([t, l]) => (
              <button
                key={t} onClick={() => setTab(t)}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', fontWeight: 600,
                  background: tab === t ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'transparent',
                  color: tab === t ? 'white' : 'rgba(240,240,255,0.4)',
                  transition: 'all 0.2s',
                }}
              >{l}</button>
            ))}
          </div>

          {tab === 'all' && (
            <>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  padding: '7px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, color: '#f0f0ff', fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
                }}
              >
                <option value="">All Categories</option>
                {['image', 'video', 'audio', 'document', 'archive', 'other'].map(c => (
                  <option key={c} value={c}>{FILE_ICONS[c]} {c}</option>
                ))}
              </select>
              <input
                className="input" placeholder="🔍 Search files..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ maxWidth: 200 }}
              />
            </>
          )}
        </div>

        {/* Files Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
            ))}
          </div>
        ) : tab === 'all' ? (
          files.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(240,240,255,0.3)' }}>
              <p style={{ fontSize: '3rem' }}>📂</p>
              <p style={{ fontSize: '1rem', marginTop: 12 }}>No files yet. Upload your first file!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {files.map(file => (
                <FileCard key={file.id || file._id} file={file} onDelete={deleteFile} onShare={generateShare} />
              ))}
            </div>
          )
        ) : (
          <DuplicatesView duplicates={duplicates} onDelete={deleteFile} />
        )}

        {/* Share Modal */}
        {shareModal && (
          <div className="modal-overlay" onClick={() => { setShareModal(null); setShareResult(null); }}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 style={{ marginBottom: 16 }}>🔗 Share File</h3>
              {shareResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ padding: 14, background: 'rgba(124,58,237,0.1)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.2)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', marginBottom: 4 }}>Share URL</p>
                    <p style={{ fontSize: '0.85rem', wordBreak: 'break-all', color: '#a78bfa' }}>{shareResult.shareUrl}</p>
                  </div>
                  <div style={{ padding: 14, background: 'rgba(16,185,129,0.1)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', marginBottom: 4 }}>6-Digit Access Code</p>
                    <p style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.3em', color: '#6ee7b7', fontFamily: 'JetBrains Mono' }}>
                      {shareResult.shareCode}
                    </p>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.4)' }}>
                    ⏱️ Expires: {new Date(shareResult.expiresAt).toLocaleString()}
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { navigator.clipboard.writeText(shareResult.shareUrl); toast.success('Link copied!'); }}
                  >
                    📋 Copy Link
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 30 }}>
                  <div className="spin" style={{ fontSize: '2rem' }}>⏳</div>
                  <p style={{ marginTop: 10 }}>Generating share link...</p>
                </div>
              )}
              <button className="btn btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => { setShareModal(null); setShareResult(null); }}>
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const FileCard = ({ file, onDelete, onShare }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="glass-card" style={{ padding: 16, cursor: 'default' }}>
      {/* Preview or Icon */}
      <div style={{
        height: 90, borderRadius: 10, marginBottom: 10,
        background: 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {file.category === 'image' && file.thumbnailUrl && !imgError ? (
          <img src={file.thumbnailUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
        ) : (
          <span style={{ fontSize: '2.5rem' }}>{FILE_ICONS[file.category] || '📎'}</span>
        )}
        {file.isDuplicate && (
          <span style={{ position: 'absolute', top: 4, right: 4, fontSize: '0.65rem', background: '#f59e0b', color: '#000', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
            DUPE
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f0f0ff', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </p>
      <p style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.4)', marginBottom: 10 }}>{file.sizeFormatted}</p>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onShare(file.id || file._id)} style={{ flex: 1, padding: '5px 0', fontSize: '0.75rem', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 7, cursor: 'pointer', color: '#a78bfa', fontFamily: 'Outfit, sans-serif' }}>
          🔗 Share
        </button>
        <button onClick={() => onDelete(file.id || file._id)} style={{ padding: '5px 8px', fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, cursor: 'pointer', color: '#fca5a5', fontFamily: 'Outfit, sans-serif' }}>
          🗑️
        </button>
      </div>
    </div>
  );
};

const DuplicatesView = ({ duplicates, onDelete }) => {
  if (duplicates.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(240,240,255,0.3)' }}>
        <p style={{ fontSize: '3rem' }}>✅</p>
        <p style={{ fontSize: '1rem', marginTop: 12 }}>No duplicate files found!</p>
      </div>
    );
  }

  const totalWasted = duplicates.reduce((a, g) => a + g.totalWastedSize, 0);

  return (
    <div>
      <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: 20 }}>
        <p style={{ color: '#fcd34d', fontWeight: 600, fontSize: '0.9rem' }}>
          ⚠️ Found {duplicates.length} duplicate groups wasting {formatBytes(totalWasted)}
        </p>
      </div>
      {duplicates.map((group, i) => (
        <div key={i} className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: '#f0f0ff' }}>{group.count} identical files</span>
            <span className="badge badge-yellow">Wasting {formatBytes(group.totalWastedSize)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {group.files.map((file, j) => (
              <div key={j} style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8, position: 'relative' }}>
                <p style={{ fontSize: '0.78rem', color: '#f0f0ff', fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'rgba(240,240,255,0.35)', marginBottom: 8 }}>{formatBytes(file.size)}</p>
                {j > 0 && (
                  <button
                    onClick={() => onDelete(file._id)}
                    style={{ fontSize: '0.7rem', padding: '3px 8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#fca5a5', fontFamily: 'Outfit, sans-serif' }}
                  >
                    Delete Copy
                  </button>
                )}
                {j === 0 && <span style={{ fontSize: '0.65rem', color: '#6ee7b7', fontWeight: 700 }}>KEEP</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FilesPage;
