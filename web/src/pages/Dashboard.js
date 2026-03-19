import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const StatCard = ({ icon, label, value, sub, gradient, percent }) => (
  <div className="glass-card" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', top: -20, right: -20, width: 100, height: 100,
      borderRadius: '50%', background: gradient, opacity: 0.1, filter: 'blur(20px)',
    }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.5)', marginBottom: 6, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f0f0ff', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: '0.78rem', color: 'rgba(240,240,255,0.4)', marginTop: 4 }}>{sub}</p>}
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem', flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
    {percent !== undefined && (
      <div style={{ marginTop: 16 }}>
        <div className="progress-bar" style={{ height: 5 }}>
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, percent)}%`, background: gradient }} />
        </div>
        <p style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.35)', marginTop: 4 }}>{percent}% used</p>
      </div>
    )}
  </div>
);

const CHART_DATA = [
  { name: 'Mon', storage: 2.1, downloads: 0.8 },
  { name: 'Tue', storage: 3.5, downloads: 1.2 },
  { name: 'Wed', storage: 2.8, downloads: 0.5 },
  { name: 'Thu', storage: 4.2, downloads: 2.1 },
  { name: 'Fri', storage: 5.5, downloads: 1.8 },
  { name: 'Sat', storage: 4.8, downloads: 2.5 },
  { name: 'Sun', storage: 6.1, downloads: 1.9 },
];

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/users/dashboard');
      setDashboard(data);
    } catch (err) {
      console.error('Dashboard fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const storagePercent = user ? Math.round((user.storage.usedBytes / user.storage.totalBytes) * 100) : 0;
  const downloadPercent = user ? Math.round((user.downloadData.usedBytes / user.downloadData.totalBytes) * 100) : 0;

  const fileCategories = dashboard?.fileStats || [];
  const totalFiles = fileCategories.reduce((a, c) => a + c.count, 0);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>Dashboard – SDUCS MK</title></Helmet>
      <Sidebar />

      <main className="main-content" style={{ flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 4 }}>
                Good evening, {user?.name?.split(' ')[0]} 👋
              </h1>
              <p style={{ color: 'rgba(240,240,255,0.5)' }}>
                Here's what's happening with your storage today
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <a href="/rewards" style={{ textDecoration: 'none' }}>
                <button className="btn btn-secondary btn-sm">
                  🎁 Earn Storage
                </button>
              </a>
              <a href="/subscriptions" style={{ textDecoration: 'none' }}>
                <button className="btn btn-primary btn-sm">
                  💎 Upgrade
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-4 gap-4" style={{ marginBottom: 32 }}>
          <StatCard
            icon="☁️"
            label="Cloud Storage"
            value={formatBytes(user?.storage?.usedBytes || 0)}
            sub={`of ${formatBytes(user?.storage?.totalBytes || 0)} total`}
            gradient="linear-gradient(135deg, #667eea, #764ba2)"
            percent={storagePercent}
          />
          <StatCard
            icon="📥"
            label="Download Data"
            value={formatBytes(user?.downloadData?.availableBytes || 0)}
            sub={`${formatBytes(user?.downloadData?.usedBytes || 0)} used`}
            gradient="linear-gradient(135deg, #4facfe, #00f2fe)"
            percent={downloadPercent}
          />
          <StatCard
            icon="📁"
            label="Total Files"
            value={totalFiles.toLocaleString()}
            sub={`${fileCategories.length} categories`}
            gradient="linear-gradient(135deg, #f093fb, #f5576c)"
          />
          <StatCard
            icon="🎁"
            label="Ads Today"
            value={`${user?.ads?.dailyCount || 0}/${user?.ads?.dailyLimit || 10}`}
            sub={`${Math.max(0, (user?.ads?.dailyLimit || 10) - (user?.ads?.dailyCount || 0))} remaining`}
            gradient="linear-gradient(135deg, #11998e, #38ef7d)"
          />
        </div>

        {/* Chart + Categories */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, marginBottom: 24 }}>
          {/* Usage Chart */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 20, fontSize: '1rem', fontWeight: 700 }}>📊 Usage This Week</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={CHART_DATA}>
                <defs>
                  <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="downloadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4facfe" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4facfe" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: 'rgba(240,240,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15,15,42,0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, color: '#f0f0ff', fontSize: 12, fontFamily: 'Outfit',
                  }}
                />
                <Area type="monotone" dataKey="storage" name="Storage (GB)" stroke="#667eea" fill="url(#storageGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="downloads" name="Downloads (GB)" stroke="#4facfe" fill="url(#downloadGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* File Categories */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>📂 File Categories</h3>
            {fileCategories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(240,240,255,0.3)' }}>
                <p style={{ fontSize: '2rem' }}>📂</p>
                <p style={{ fontSize: '0.85rem', marginTop: 8 }}>No files uploaded yet</p>
              </div>
            ) : (
              fileCategories.map(cat => {
                const icons = { image: '🖼️', video: '🎬', audio: '🎵', document: '📄', archive: '📦', other: '📎' };
                const pct = Math.round((cat.count / totalFiles) * 100);
                return (
                  <div key={cat._id} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.7)' }}>
                        {icons[cat._id] || '📎'} {cat._id}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.4)' }}>
                        {cat.count} files · {formatBytes(cat.totalSize)}
                      </span>
                    </div>
                    <div className="progress-bar" style={{ height: 5 }}>
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>⚡ Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { href: '/files', icon: '⬆️', label: 'Upload File', color: '#7c3aed' },
              { href: '/downloads', icon: '📥', label: 'New Download', color: '#3b82f6' },
              { href: '/files?tab=duplicates', icon: '🔍', label: 'Find Duplicates', color: '#f59e0b' },
              { href: '/rewards', icon: '🎁', label: 'Watch Ad', color: '#10b981' },
              { href: '/ai', icon: '🤖', label: 'AI Cleanup', color: '#ec4899' },
            ].map(({ href, icon, label, color }) => (
              <a key={label} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '16px 12px', textAlign: 'center',
                  background: `${color}15`, border: `1px solid ${color}30`,
                  borderRadius: 12, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>{icon}</div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.65)', fontWeight: 500, margin: 0 }}>{label}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Subscription Banner */}
        {user?.subscription?.plan === 'free' && (
          <div style={{
            marginTop: 24, padding: '20px 28px',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.15))',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#f0f0ff', margin: 0 }}>
                💎 Upgrade to get more download data
              </p>
              <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.85rem', margin: 0 }}>
                Plans from ₹25 · 5GB to 50GB · Instant activation
              </p>
            </div>
            <a href="/subscriptions" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary">View Plans →</button>
            </a>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
