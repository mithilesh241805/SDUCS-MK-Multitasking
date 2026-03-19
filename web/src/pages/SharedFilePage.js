import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import api from '../services/api';
import toast from 'react-hot-toast';

const SharedFilePage = () => {
  const { token } = useParams();
  const [code, setCode] = useState('');
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAccess = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) return toast.error('Enter valid 6-digit code');
    
    setLoading(true);
    try {
      const { data } = await api.get(`/files/share/${token}?code=${code}`);
      setFileData(data.file);
      toast.success('Access Granted!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code or link expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <Helmet><title>Shared File – SDUCS</title></Helmet>
      
      {!fileData ? (
        <div className="glass-card" style={{ padding: 40, width: 400, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Secure File Access</h2>
          <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.9rem', marginBottom: 24 }}>
            This file is AES-256 encrypted. Enter the 6-digit security code provided by the owner to decrypt and download.
          </p>

          <form onSubmit={handleAccess} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="text"
              className="input"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 800, fontFamily: 'JetBrains Mono' }}
            />
            <button className="btn btn-primary" type="submit" disabled={loading || code.length !== 6}>
              {loading ? 'Decrypting...' : 'Unlock File 🔓'}
            </button>
          </form>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 40, width: 460 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', color: '#6ee7b7' }}>File Decrypted</h2>
          </div>

          <div style={{ padding: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>📄 {fileData.name}</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <span className="badge badge-blue">{fileData.category?.toUpperCase() || 'FILE'}</span>
              <span className="badge badge-purple">{fileData.sizeFormatted}</span>
            </div>

            {fileData.category === 'image' && fileData.thumbnailUrl && (
              <img src={fileData.thumbnailUrl} alt="Thumbnail" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }} />
            )}

            <a href={fileData.downloadUrl} download={fileData.name} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary" style={{ width: '100%', padding: 14 }}>
                ⬇️ Download Securely
              </button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedFilePage;
