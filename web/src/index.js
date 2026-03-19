import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(26, 26, 62, 0.9)',
            backdropFilter: 'blur(20px)',
            color: '#f0f0ff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '0.9rem',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          duration: 4000,
        }}
      />
    </HelmetProvider>
  </React.StrictMode>
);
