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

const SubscriptionPage = () => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/payments/history');
      setHistory(data.payments || []);
    } catch {}
  };

  const plans = [
    { id: 'lite', name: 'Lite', data: '5GB', price: 25, days: 2, color: '#3b82f6', icon: '⚡', features: ['5GB download data', '2 days validity', 'All basic features'] },
    { id: 'premium', name: 'Premium', data: '10GB', price: 49, days: 4, color: '#7c3aed', icon: '💫', features: ['10GB download data', '4 days validity', 'Priority support'], featured: true },
    { id: 'pro', name: 'Pro', data: '20GB', price: 99, days: 6, color: '#06b6d4', icon: '🚀', features: ['20GB download data', '6 days validity', 'Advanced analytics'] },
    { id: 'pro_max', name: 'Pro Max', data: '50GB', price: 200, days: 8, color: '#f59e0b', icon: '👑', features: ['50GB download data', '8 days validity', 'Admin priority'] },
  ];

  const initiatePayment = async (planId) => {
    setLoading(true);
    try {
      const { data } = await api.post('/payments/create-order', { plan: planId });
      setPayment(data);
      setSelectedPlan(planId);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  const uploadScreenshot = async () => {
    if (!screenshotFile || !payment) return;
    setUploadingScreenshot(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', screenshotFile);
      formData.append('paymentId', payment.paymentId);
      await api.post('/payments/fallback-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('📤 Screenshot submitted! Admin will verify within 2-4 hours.');
      setPayment(null);
      setScreenshotFile(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleRazorpay = async () => {
    if (!payment?.razorpayOrderId) return;
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: payment.plan.price * 100,
      currency: 'INR',
      name: 'SDUCS MK',
      description: `${payment.plan.name} Plan`,
      order_id: payment.razorpayOrderId,
      handler: async (response) => {
        try {
          await api.post('/payments/verify', {
            paymentId: payment.paymentId,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          toast.success('✅ Payment successful! Account credited.');
          setPayment(null);
          fetchHistory();
        } catch { toast.error('Payment verification failed'); }
      },
      theme: { color: '#7c3aed' },
    };
    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      toast.error('Razorpay not loaded. Use QR code instead.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>Subscribe – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            💎 Choose Your Plan
          </h1>
          <p style={{ color: 'rgba(240,240,255,0.5)', marginTop: 8 }}>
            Get more download data. Instant activation via UPI.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-4 gap-4" style={{ marginBottom: 40 }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              className="plan-card"
              style={{ borderColor: plan.featured ? plan.color + '50' : undefined }}
              onClick={() => !loading && initiatePayment(plan.id)}
            >
              {plan.featured && (
                <div style={{ position: 'absolute', top: -1, right: 20 }}>
                  <span style={{ background: plan.color, padding: '3px 12px', borderRadius: '0 0 8px 8px', fontSize: '0.7rem', fontWeight: 700, color: 'white' }}>
                    POPULAR
                  </span>
                </div>
              )}

              <div style={{ fontSize: '2rem', marginBottom: 12 }}>{plan.icon}</div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f0f0ff', marginBottom: 4 }}>{plan.name}</h3>
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: plan.color }}>₹{plan.price}</span>
                <span style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.85rem' }}> / {plan.days} days</span>
              </div>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, color: plan.color, marginBottom: 16 }}>
                {plan.data} Data
              </p>
              {plan.features.map(f => (
                <p key={f} style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.55)', marginBottom: 4 }}>✓ {f}</p>
              ))}
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: 16, background: `linear-gradient(135deg, ${plan.color}, ${plan.color}aa)` }}
                disabled={loading}
              >
                {loading && selectedPlan === plan.id ? '⏳ Loading...' : `Get ${plan.name} →`}
              </button>
            </div>
          ))}
        </div>

        {/* Payment Modal */}
        {payment && (
          <div className="modal-overlay" onClick={() => setPayment(null)}>
            <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ marginBottom: 4 }}>💳 Complete Payment</h3>
              <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.85rem', marginBottom: 20 }}>
                Scan QR with any UPI app · ₹{payment.plan?.price} for {payment.plan?.name}
              </p>

              {/* QR Code */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img
                  src={payment.qrCodeData}
                  alt="UPI QR Code"
                  style={{ width: 220, height: 220, borderRadius: 12, border: '4px solid rgba(124,58,237,0.3)' }}
                />
                <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.35)', marginTop: 8 }}>
                  ⏱️ QR expires in 30 minutes
                </p>
              </div>

              {/* UPI Apps */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {['PhonePe', 'GPay', 'Paytm', 'BHIM'].map(app => (
                  <span key={app} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: 8, fontSize: '0.75rem', color: 'rgba(240,240,255,0.5)' }}>
                    {app}
                  </span>
                ))}
              </div>

              {payment.razorpayOrderId && (
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={handleRazorpay}>
                  💙 Pay via Razorpay
                </button>
              )}

              {/* Fallback: Upload Screenshot */}
              {payment.isFallback && (
                <div style={{ padding: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12 }}>
                  <p style={{ color: '#fcd34d', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>
                    📸 After paying, upload your payment screenshot
                  </p>
                  <input type="file" accept="image/*" onChange={e => setScreenshotFile(e.target.files[0])}
                    style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.6)', marginBottom: 8 }} />
                  <button
                    className="btn btn-success btn-sm"
                    style={{ width: '100%' }}
                    onClick={uploadScreenshot}
                    disabled={!screenshotFile || uploadingScreenshot}
                  >
                    {uploadingScreenshot ? '⏳ Uploading...' : '📤 Submit for Verification'}
                  </button>
                </div>
              )}

              <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }} onClick={() => setPayment(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        {history.length > 0 && (
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>📜 Payment History</h3>
            {history.map(p => (
              <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <p style={{ fontWeight: 600, color: '#f0f0ff', fontSize: '0.9rem', margin: 0 }}>{p.plan?.toUpperCase()} Plan</p>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.35)', margin: 0 }}>{new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700, color: '#a78bfa', margin: 0 }}>₹{(p.amount / 100).toFixed(0)}</p>
                  <span className={`badge badge-${p.status === 'completed' ? 'green' : p.status === 'awaiting_verification' ? 'yellow' : 'red'}`}>
                    {p.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SubscriptionPage;
