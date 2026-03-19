import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminPage = () => {
  const [stats, setStats] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: st }, { data: pp }, { data: us }] = await Promise.all([
        api.get('/admin/stats', { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET || 'secret' } }),
        api.get('/admin/pending-payments', { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET || 'secret' } }),
        api.get('/admin/users', { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET || 'secret' } }),
      ]);
      setStats(st);
      setPendingPayments(pp.payments);
      setUsers(us.users);
    } catch {
      toast.error('Admin access denied or failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const approvePayment = async (id) => {
    try {
      await api.post(`/admin/approve/${id}`, {}, { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET || 'secret' } });
      toast.success('Payment approved and data credited!');
      fetchData();
    } catch {
      toast.error('Approval failed');
    }
  };

  const banUser = async (id, isBanned) => {
    try {
      await api.patch(`/admin/users/${id}/ban`, { ban: !isBanned, reason: 'Admin Decision' }, { headers: { 'x-admin-secret': process.env.REACT_APP_ADMIN_SECRET || 'secret' } });
      toast.success(isBanned ? 'User Unbanned' : 'User Banned');
      fetchData();
    } catch {
      toast.error('Action failed');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>Admin Panel – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 24 }}>⚙️ Super Admin Panel</h1>
        
        {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 16 }} /> : (
          <>
            <div className="grid grid-4 gap-4" style={{ marginBottom: 32 }}>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.8rem' }}>Total Users</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats?.users?.total || 0}</p>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.8rem' }}>Total Files</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{stats?.files?.total || 0}</p>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.8rem' }}>Payment Revenue</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>₹{stats?.payments?.revenueINR || 0}</p>
              </div>
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.8rem' }}>Ad Revenue (Est)</p>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f59e0b' }}>₹{(stats?.ads?.revenue || 0).toFixed(2)}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Pending Approvals */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Pending Manual Payments</h3>
                {pendingPayments.length === 0 ? <p style={{ color: 'rgba(240,240,255,0.4)' }}>No pending approvals.</p> : (
                  pendingPayments.map(p => (
                    <div key={p._id} style={{ padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 12 }}>
                      <p><strong>{p.user?.name}</strong> • {p.plan} Plan</p>
                      <a href={p.screenshotUrl} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.85rem' }}>View Screenshot</a>
                      <button className="btn btn-success btn-sm" style={{ marginTop: 12, width: '100%' }} onClick={() => approvePayment(p._id)}>Approve Payment</button>
                    </div>
                  ))
                )}
              </div>

              {/* User Mgmt */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 16 }}>User Management</h3>
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {users.map(u => (
                    <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>{u.email}</p>
                        <span className={`badge badge-${u.isBanned ? 'red' : 'green'}`}>{u.isBanned ? 'BANNED' : 'ACTIVE'}</span>
                      </div>
                      <button className={`btn btn-sm ${u.isBanned ? 'btn-secondary' : 'btn-danger'}`} onClick={() => banUser(u._id, u.isBanned)}>
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminPage;
