import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const AdsRewardPage = () => {
  const { user, refreshUser } = useAuth();
  const [adStats, setAdStats] = useState(null);
  const [watching, setWatching] = useState(false);
  const [lastReward, setLastReward] = useState(null);
  const [rewardType, setRewardType] = useState('storage');
  const [fakeAdProgress, setFakeAdProgress] = useState(0);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/ads/stats');
      setAdStats(data);
    } catch {}
  };

  // Simulate watching a rewarded ad (in production, this triggers AdMob SDK)
  const watchAd = async () => {
    if (adStats?.adsRemaining === 0) {
      return toast.error('Daily ad limit reached. Come back tomorrow!');
    }

    setWatching(true);
    setFakeAdProgress(0);

    // Simulate 15-second ad
    let progress = 0;
    const interval = setInterval(() => {
      progress += 100 / 15;
      setFakeAdProgress(Math.min(100, progress));
      if (progress >= 100) {
        clearInterval(interval);
        completeAd();
      }
    }, 1000);
  };

  const completeAd = async () => {
    try {
      const { data } = await api.post('/ads/rewarded/complete', {
        adUnit: 'ca-app-pub-xxx/yyy',
        viewDuration: 15,
        rewardType,
      });
      setLastReward(data);
      toast.success(data.message);
      fetchStats();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ad reward failed');
    } finally {
      setWatching(false);
      setFakeAdProgress(0);
    }
  };

  const adsRemaining = adStats?.adsRemaining || 0;
  const dailyCount = adStats?.dailyAdsCount || 0;
  const dailyLimit = adStats?.dailyAdsLimit || 10;
  const dailyPercent = Math.round((adStats?.dailyRewardEarned || 0) / (adStats?.dailyRewardCap || 1) * 100);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>Earn Rewards – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>🎁 Earn Rewards</h1>
          <p style={{ color: 'rgba(240,240,255,0.5)' }}>Watch ads to earn free storage or download data</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Main Ad Section */}
          <div>
            {/* Reward Type Selector */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>🎯 Choose Your Reward</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { id: 'storage', icon: '☁️', label: 'Cloud Storage', sub: '+100MB to +500MB' },
                  { id: 'download_data', icon: '📥', label: 'Download Data', sub: '+100MB to +500MB' },
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setRewardType(opt.id)}
                    style={{
                      flex: 1, padding: 16, borderRadius: 12, cursor: 'pointer',
                      border: `2px solid ${rewardType === opt.id ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      background: rewardType === opt.id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>{opt.icon}</div>
                    <p style={{ fontWeight: 700, color: '#f0f0ff', fontSize: '0.9rem', margin: 0 }}>{opt.label}</p>
                    <p style={{ color: rewardType === opt.id ? '#a78bfa' : 'rgba(240,240,255,0.4)', fontSize: '0.78rem', margin: 0 }}>{opt.sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ad Viewer */}
            <div className="glass-card" style={{ padding: 32, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)' }} />

              {watching ? (
                <div>
                  <div style={{
                    width: 120, height: 120, borderRadius: '50%', margin: '0 auto 20px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '3rem',
                  }}>
                    🎬
                  </div>
                  <h3 style={{ marginBottom: 8 }}>Watching Ad...</h3>
                  <p style={{ color: 'rgba(240,240,255,0.5)', marginBottom: 20, fontSize: '0.9rem' }}>
                    Do not close this tab!
                  </p>
                  <div className="progress-bar" style={{ height: 8, maxWidth: 300, margin: '0 auto 8px' }}>
                    <div className="progress-bar-fill" style={{ width: `${fakeAdProgress}%`, background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb)' }} />
                  </div>
                  <p style={{ color: '#a78bfa', fontWeight: 600, fontSize: '0.85rem' }}>
                    {Math.ceil((100 - fakeAdProgress) / (100/15))}s remaining
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '5rem', marginBottom: 16, animation: 'float 3s ease-in-out infinite' }}>🎁</div>
                  <h2 style={{ marginBottom: 8, fontSize: '1.5rem' }}>Watch & Earn</h2>
                  <p style={{ color: 'rgba(240,240,255,0.5)', marginBottom: 24, fontSize: '0.9rem' }}>
                    Each rewarded ad earns you <strong style={{ color: '#a78bfa' }}>100MB – 500MB</strong> of{' '}
                    {rewardType === 'storage' ? 'cloud storage' : 'download data'}
                  </p>

                  {adsRemaining === 0 ? (
                    <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 20 }}>
                      <p style={{ color: '#fca5a5', fontWeight: 600, margin: 0 }}>Daily limit reached!</p>
                      <p style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.8rem', margin: 0, marginTop: 4 }}>Come back tomorrow to earn more</p>
                    </div>
                  ) : null}

                  <button
                    className="btn btn-primary btn-lg"
                    onClick={watchAd}
                    disabled={adsRemaining === 0 || watching}
                    style={{ minWidth: 200 }}
                  >
                    {adsRemaining === 0 ? '🚫 Limit Reached' : '▶️ Watch Ad (+100-500MB)'}
                  </button>

                  {lastReward && (
                    <div style={{ marginTop: 20, padding: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                      <p style={{ color: '#6ee7b7', fontWeight: 700 }}>✅ Last Reward: +{lastReward.rewardMB}MB</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Today's Progress */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>📊 Today's Progress</h3>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.5)' }}>Ads Watched</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa' }}>{dailyCount} / {dailyLimit}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${(dailyCount / dailyLimit) * 100}%` }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.5)' }}>Storage Earned</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6ee7b7' }}>
                    {formatBytes(adStats?.dailyRewardEarned || 0)} / 2GB
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${Math.min(100, dailyPercent)}%`, background: 'linear-gradient(90deg, #10b981, #38ef7d)' }} />
                </div>
              </div>
            </div>

            {/* Reward Rules */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 14 }}>📋 Reward Rules</h3>
              {[
                { icon: '🎬', text: 'Watch full 15-30s rewarded ad' },
                { icon: '💰', text: '100MB – 500MB per ad' },
                { icon: '⏱️', text: 'Max 10 ads per day' },
                { icon: '📦', text: 'Max 2GB earned per day' },
                { icon: '☁️', text: 'Max 100GB total storage cap' },
                { icon: '🚫', text: 'Fake clicks are detected & banned' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.55)', margin: 0 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Revenue Estimate */}
            <div className="glass-card" style={{ padding: 20, background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.1)' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: '#fcd34d' }}>💡 Revenue Info</h3>
              <p style={{ fontSize: '0.78rem', color: 'rgba(240,240,255,0.45)', lineHeight: 1.7 }}>
                Ads revenue ranges ₹0.20–₹2/view in India.
                Rewards are dynamically adjusted based on actual eCPM performance to maintain sustainability.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdsRewardPage;
