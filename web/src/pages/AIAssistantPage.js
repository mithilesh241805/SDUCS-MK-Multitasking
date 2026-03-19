import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';

const AIAssistantPage = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: 'Hi! I am the SDUCS AI Assistant. I can help you analyze your storage usage, find duplicates, and give you smart tips. How can I help today?' }
  ]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchSuggestions = async () => {
    try {
      const { data } = await api.get('/ai/suggestions');
      setSuggestions(data.suggestions || []);
    } catch { toast.error('Failed to load storage suggestions'); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    const userMsg = message;
    setMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', { message: userMsg });
      setChatHistory(prev => [...prev, { role: 'ai', content: data.reply }]);
    } catch (err) {
      toast.error('AI is currently unavailable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Helmet><title>AI Assistant – SDUCS MK</title></Helmet>
      <Sidebar />
      <main className="main-content" style={{ flex: 1 }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 24 }}>🤖 Smart AI Assistant</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 24, height: 'calc(100vh - 120px)' }}>
          {/* Left panel: Smart Suggestions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', paddingRight: 8 }}>
            <h3 style={{ fontSize: '1.1rem' }}>Storage Recommendations</h3>
            {suggestions.length === 0 ? (
              <p style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.85rem' }}>AI is analyzing your files...</p>
            ) : (
              suggestions.map((s, idx) => (
                <div key={idx} className="glass-card" style={{ padding: 16, borderLeft: `4px solid ${s.priority === 'high' ? '#ef4444' : '#3b82f6'}` }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>{s.title}</p>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.6)', margin: '4px 0 8px' }}>{s.description}</p>
                  <span className="badge badge-blue">Saves {s.potentialSavings}</span>
                </div>
              ))
            )}
          </div>

          {/* Right panel: Chat Interface */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Google Gemini Assistant</h3>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '12px 16px', borderRadius: 16,
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(255,255,255,0.05)',
                    border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    fontSize: '0.95rem', lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '12px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                    <span className="spin" style={{ display: 'inline-block' }}>🤖</span> Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', padding: 16, gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <input
                className="input"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ask about your storage or file optimization..."
                style={{ flex: 1 }}
                disabled={loading}
              />
              <button className="btn btn-primary" type="submit" disabled={loading || !message.trim()}>
                Send 🚀
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AIAssistantPage;
