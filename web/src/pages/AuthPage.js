import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import toast from 'react-hot-toast';

const AuthPage = () => {
  const { isAuthenticated, loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(form.email, form.password);
      } else {
        if (!form.name) return toast.error('Name is required');
        await registerWithEmail(form.name, form.email, form.password);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>SDUCS – MK Multitasking | Sign In</title>
      </Helmet>
      <div style={styles.page}>
        {/* Animated Background Blobs */}
        <div style={styles.blob1} />
        <div style={styles.blob2} />
        <div style={styles.blob3} />

        {/* Particle Grid */}
        <div style={styles.grid} />

        <div style={styles.container}>
          {/* Left: Branding */}
          <div style={styles.branding}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon}>
                <span style={{ fontSize: '2.5rem' }}>☁️</span>
              </div>
              <div style={styles.logoGlow} />
            </div>

            <h1 style={styles.brandTitle}>SDUCS</h1>
            <p style={styles.brandSubtitle}>MK Multitasking</p>

            <p style={styles.brandDesc}>
              Your all-in-one smart cloud storage, file manager, and download manager.
            </p>

            <div style={styles.features}>
              {[
                { icon: '☁️', label: '30GB Free Storage', sub: 'Signup bonus, no credit card' },
                { icon: '📥', label: '10GB Download Data', sub: 'Use directly on signup' },
                { icon: '🎁', label: 'Earn More via Ads', sub: '100MB-500MB per rewarded ad' },
                { icon: '🔒', label: 'AES-256 Encrypted', sub: 'Military-grade file security' },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={styles.featureItem}>
                  <span style={styles.featureIcon}>{icon}</span>
                  <div>
                    <p style={styles.featureLabel}>{label}</p>
                    <p style={styles.featureSub}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Auth Card */}
          <div style={styles.card}>
            {/* Tabs */}
            <div style={styles.tabs}>
              {['login', 'register'].map(m => (
                <button
                  key={m}
                  style={{ ...styles.tab, ...(mode === m ? styles.tabActive : {}) }}
                  onClick={() => setMode(m)}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <h2 style={styles.cardTitle}>
              {mode === 'login' ? 'Welcome back!' : 'Create your account'}
            </h2>
            <p style={styles.cardSub}>
              {mode === 'login'
                ? 'Sign in to your SDUCS account'
                : 'Join thousands of users managing their files smarter'}
            </p>

            {/* Google Button */}
            <button
              style={styles.googleBtn}
              onClick={handleGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <span style={styles.spinner} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>or</span>
              <div style={styles.dividerLine} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'register' && (
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <input
                  className="input"
                  type="password"
                  placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ marginTop: 8 }}
                disabled={loading}
              >
                {loading ? (
                  <><span style={styles.spinner} /> Processing...</>
                ) : (
                  mode === 'login' ? 'Sign In →' : 'Create Account →'
                )}
              </button>
            </form>

            {mode === 'register' && (
              <p style={styles.bonus}>
                🎁 Signing up gives you <strong>30GB cloud storage</strong> + <strong>10GB download data</strong> — FREE!
              </p>
            )}

            <p style={styles.switchText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button style={styles.switchBtn} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0c29 50%, #1a0a2e 100%)',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px',
  },
  blob1: {
    position: 'fixed', top: '-200px', left: '-200px',
    width: '600px', height: '600px',
    background: 'radial-gradient(ellipse, rgba(124,58,237,0.2) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
    animation: 'float 8s ease-in-out infinite',
  },
  blob2: {
    position: 'fixed', bottom: '-200px', right: '-200px',
    width: '700px', height: '700px',
    background: 'radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
    animation: 'float 10s ease-in-out infinite reverse',
  },
  blob3: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
    width: '500px', height: '500px',
    background: 'radial-gradient(ellipse, rgba(236,72,153,0.08) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  grid: {
    position: 'fixed', inset: 0,
    backgroundImage: 'linear-gradient(rgba(124,58,237,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.05) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  container: {
    display: 'flex', gap: '60px', alignItems: 'center',
    maxWidth: '1000px', width: '100%', position: 'relative', zIndex: 1,
  },
  branding: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '24px',
    animation: 'slideIn 0.6s ease',
  },
  logoContainer: { position: 'relative', width: 80, height: 80 },
  logoIcon: {
    width: 80, height: 80, borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.3))',
    border: '1px solid rgba(124,58,237,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(20px)',
    animation: 'float 4s ease-in-out infinite',
  },
  logoGlow: {
    position: 'absolute', inset: -10,
    background: 'radial-gradient(ellipse, rgba(124,58,237,0.3) 0%, transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  brandTitle: {
    fontSize: '3rem', fontWeight: 900, letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #a78bfa, #667eea, #06b6d4)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  brandSubtitle: {
    fontSize: '1.1rem', color: 'rgba(240,240,255,0.6)', marginTop: -16, fontWeight: 500,
    letterSpacing: '0.1em',
  },
  brandDesc: {
    fontSize: '1rem', color: 'rgba(240,240,255,0.5)', lineHeight: 1.7, maxWidth: 360,
  },
  features: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 },
  featureItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px', backdropFilter: 'blur(10px)',
  },
  featureIcon: { fontSize: '1.4rem', width: 32, textAlign: 'center' },
  featureLabel: { color: '#f0f0ff', fontWeight: 600, fontSize: '0.9rem', margin: 0 },
  featureSub: { color: 'rgba(240,240,255,0.45)', fontSize: '0.78rem', margin: 0 },

  card: {
    width: 400, flexShrink: 0,
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(30px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '28px',
    padding: '36px',
    animation: 'scaleIn 0.5s ease',
    boxShadow: '0 20px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  tabs: {
    display: 'flex', gap: 4,
    background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1, padding: '8px 16px', borderRadius: '9px',
    border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'rgba(240,240,255,0.5)',
    fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.9rem',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    boxShadow: '0 2px 10px rgba(124,58,237,0.4)',
  },
  cardTitle: { fontSize: '1.6rem', fontWeight: 800, color: '#f0f0ff', marginBottom: 6 },
  cardSub: { color: 'rgba(240,240,255,0.5)', fontSize: '0.9rem', marginBottom: 20 },

  googleBtn: {
    width: '100%', padding: '12px 20px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px', cursor: 'pointer',
    color: '#f0f0ff', fontFamily: 'Outfit, sans-serif',
    fontWeight: 600, fontSize: '0.95rem',
    transition: 'all 0.2s ease',
    marginBottom: 4,
  },

  divider: {
    display: 'flex', alignItems: 'center', gap: 12,
    margin: '16px 0',
  },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' },
  dividerText: { color: 'rgba(240,240,255,0.35)', fontSize: '0.8rem', fontWeight: 500 },

  spinner: {
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  bonus: {
    marginTop: 16,
    padding: '12px 16px',
    background: 'rgba(16,185,129,0.1)',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '10px',
    color: '#6ee7b7', fontSize: '0.82rem', lineHeight: 1.5,
  },

  switchText: { textAlign: 'center', marginTop: 20, color: 'rgba(240,240,255,0.45)', fontSize: '0.85rem' },
  switchBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#a78bfa', fontWeight: 600, fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem',
  },
};

export default AuthPage;
