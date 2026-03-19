import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import FilesPage from './pages/FilesPage';
import CloudStoragePage from './pages/CloudStoragePage';
import DownloadManager from './pages/DownloadManager';
import SubscriptionPage from './pages/SubscriptionPage';
import RecycleBinPage from './pages/RecycleBinPage';
import AdsRewardPage from './pages/AdsRewardPage';
import SharedFilePage from './pages/SharedFilePage';
import AdminPage from './pages/AdminPage';
import AIAssistantPage from './pages/AIAssistantPage';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/share/:token" element={<SharedFilePage />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/storage" element={<CloudStoragePage />} />
              <Route path="/downloads" element={<DownloadManager />} />
              <Route path="/subscriptions" element={<SubscriptionPage />} />
              <Route path="/recycle-bin" element={<RecycleBinPage />} />
              <Route path="/rewards" element={<AdsRewardPage />} />
              <Route path="/ai" element={<AIAssistantPage />} />
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
