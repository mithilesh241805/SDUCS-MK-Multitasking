import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_ITEMS = [
  { path: '/', icon: '🏠', label: 'Dashboard', exact: true },
  { path: '/files', icon: '📁', label: 'My Files' },
  { path: '/storage', icon: '☁️', label: 'Cloud Storage' },
  { path: '/downloads', icon: '📥', label: 'Downloads' },
  { path: '/recycle-bin', icon: '🗑️', label: 'Recycle Bin' },
  { path: '/rewards', icon: '🎁', label: 'Earn Rewards' },
  { path: '/ai', icon: '🤖', label: 'AI Assistant' },
  { path: '/subscriptions', icon: '💎', label: 'Subscribe' },
];

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const Sidebar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const storagePercent = user
    ? Math.round((user.storage.usedBytes / user.storage.totalBytes) * 100)
    : 0;

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={{ fontSize: '1.5rem' }}>☁️</span>
        </div>
        <div>
          <div style={styles.logoText}>SDUCS</div>
          <div style={styles.logoSub}>MK Multitasking</div>
        </div>
      </div>

      {/* User Avatar */}
      {user && (
        <div style={styles.userCard}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: user.avatarColor || '#7c3aed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, color: 'white', flexShrink: 0,
            backgroundImage: user.photoURL ? `url(${user.photoURL})` : undefined,
            backgroundSize: 'cover',
          }}>
            {!user.photoURL && user.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p style={styles.userName}>{user.name}</p>
            <p style={styles.userEmail}>{user.email}</p>
          </div>
          {user.subscription?.plan !== 'free' && (
            <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>
              {user.subscription.plan.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Storage Usage */}
      {user && (
        <div style={styles.storageWidget}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={styles.storageLabel}>Storage</span>
            <span style={styles.storageValue}>{storagePercent}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${Math.min(100, storagePercent)}%`,
                background: storagePercent > 85 ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : 'linear-gradient(90deg, #667eea, #764ba2)',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={styles.storageSmall}>{formatBytes(user.storage.usedBytes)} used</span>
            <span style={styles.storageSmall}>{formatBytes(user.storage.totalBytes)}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={styles.navSection}>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: '1.1rem' }}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span style={{ fontSize: '1.1rem' }}>⚙️</span>
            <span>Admin Panel</span>
          </NavLink>
        )}
      </div>

      {/* Bottom Controls */}
      <div style={styles.bottomSection}>
        <button
          onClick={toggleTheme}
          style={styles.bottomBtn}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '🌙' : '☀️'}
          <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>
        <button onClick={handleLogout} style={{ ...styles.bottomBtn, color: '#fca5a5' }}>
          🚪 <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

const styles = {
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '24px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  logo: {
    width: 40, height: 40, borderRadius: '10px',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(59,130,246,0.4))',
    border: '1px solid rgba(124,58,237,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontWeight: 800, fontSize: '1rem', color: '#f0f0ff', letterSpacing: '0.05em' },
  logoSub: { fontSize: '0.65rem', color: 'rgba(240,240,255,0.4)', letterSpacing: '0.05em' },

  userCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    margin: '4px 12px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '12px',
  },
  userName: { fontWeight: 600, fontSize: '0.85rem', color: '#f0f0ff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userEmail: { fontSize: '0.72rem', color: 'rgba(240,240,255,0.4)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  storageWidget: {
    padding: '12px 16px',
    margin: '8px 12px',
    background: 'rgba(124,58,237,0.08)',
    border: '1px solid rgba(124,58,237,0.12)',
    borderRadius: '12px',
  },
  storageLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'rgba(240,240,255,0.5)' },
  storageValue: { fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa' },
  storageSmall: { fontSize: '0.65rem', color: 'rgba(240,240,255,0.35)' },

  navSection: { flex: 1, padding: '4px 0', overflowY: 'auto' },

  bottomSection: {
    padding: '12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', gap: 2,
  },
  bottomBtn: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: '10px',
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'rgba(240,240,255,0.4)', fontFamily: 'Outfit, sans-serif',
    fontSize: '0.85rem', width: '100%',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
};

export default Sidebar;
