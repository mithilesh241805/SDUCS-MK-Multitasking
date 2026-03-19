import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { signInWithGoogle, signOutFirebase } from '../services/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('sducs_token'));

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveAuth(data.token, data.user);
    toast.success(`Welcome back, ${data.user.name}! 👋`);
    return data;
  };

  const registerWithEmail = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    saveAuth(data.token, data.user);
    toast.success('🎉 Account created! You got 30GB free storage + 10GB download data!');
    return data;
  };

  const loginWithGoogle = async () => {
    const idToken = await signInWithGoogle();
    const { data } = await api.post('/auth/google', { idToken });
    saveAuth(data.token, data.user);
    toast.success(data.isNewUser
      ? '🎉 Welcome! You got 30GB free storage!'
      : `Welcome back, ${data.user.name}! 👋`);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('sducs_token');
    setToken(null);
    setUser(null);
    signOutFirebase().catch(() => {});
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  };

  const refreshUser = () => fetchMe();

  const saveAuth = (authToken, userData) => {
    localStorage.setItem('sducs_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{
      user, loading, token,
      loginWithEmail, registerWithEmail, loginWithGoogle,
      logout, updateUser, refreshUser,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
