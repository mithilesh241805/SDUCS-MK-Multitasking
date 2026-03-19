import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

const CloudStoragePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const fetchStorageStats = async () => {
    try {
      const { data } = await api.get('/users/dashboard'); // Use dashboard aggregation for storage stats
      setStats(data);
    } catch {}
  };

  const fileStats = stats?.fileStats || [];
  const pieData = fileStats.map(f => ({ name: f._id, value: f.totalSize }));

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>Cloud Storage – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>☁️ Cloud Storage</h1>
          <p style={{ color: 'rgba(240,240,255,0.5)' }}>Manage your cloud storage capacity and distribution</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Storage Progress */}
            <div className="glass-card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Storage Overview</h3>
                  <p style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f0f0ff', margin: 0, lineHeight: 1 }}>
                    {formatBytes(user?.storage?.usedBytes)}
                  </p>
                  <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.9rem', marginTop: 4 }}>
                    used of {formatBytes(user?.storage?.totalBytes)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge badge-purple" style={{ fontSize: '1.2rem', padding: '6px 16px' }}>
                    {stats?.storage?.usedPercent || 0}%
                  </span>
                </div>
              </div>

              <div className="progress-bar" style={{ height: 16 }}>
                <div
                  className="progress-bar-fill"
                  style={{ width: `${stats?.storage?.usedPercent || 0}%`, background: 'var(--gradient-storage)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                <a href="/rewards" style={{ flex: 1, textDecoration: 'none' }}>
                  <button className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}>
                    🎁 Watch Ad (+500MB)
                  </button>
                </a>
                <a href="/ai" style={{ flex: 1, textDecoration: 'none' }}>
                  <button className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}>
                    🤖 Smart Cleanup
                  </button>
                </a>
              </div>
            </div>

            {/* AI Breakdown Placeholder */}
            <div className="glass-card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 20 }}>📁 Storage Composition</h3>
              {pieData.length === 0 ? (
                <p style={{ color: 'rgba(240,240,255,0.5)' }}>No files uploaded yet to compose a chart.</p>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" stroke="none" innerRadius={60} outerRadius={80} paddingAngle={2}>
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatBytes(value)} contentStyle={{ backgroundColor: '#1a1a3e', border: 'none', borderRadius: 8, color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, paddingLeft: 32 }}>
                    {pieData.map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                          <span style={{ textTransform: 'capitalize', color: 'rgba(240,240,255,0.8)' }}>{d.name}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>{formatBytes(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>💎</div>
              <h3 style={{ fontSize: '1.1rem', color: '#f0f0ff', marginBottom: 8 }}>Need More Storage?</h3>
              <p style={{ color: 'rgba(240,240,255,0.6)', fontSize: '0.85rem', marginBottom: 16 }}>
                You can increase your cloud storage limit for free by watching rewarded ads, up to 2GB every single day!
              </p>
              <a href="/rewards">
                <button className="btn btn-primary btn-sm" style={{ width: '100%' }}>Earn Free Storage</button>
              </a>
            </div>

            <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(239,68,68,0.1))' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🗑️</div>
              <h3 style={{ fontSize: '1.1rem', color: '#f0f0ff', marginBottom: 8 }}>Recycle Bin</h3>
              <p style={{ color: 'rgba(240,240,255,0.6)', fontSize: '0.85rem', marginBottom: 16 }}>
                Items in the recycle bin continue to take up storage space until they are permanently deleted after 30 days.
              </p>
              <a href="/recycle-bin">
                <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}>Empty Recycle Bin</button>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CloudStoragePage;
