import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function MetricsPanel({ open, onClose }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios.get(`${API}/api/search/ml-metrics`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [open, token]);

  if (!open) return null;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.panel} onClick={e => e.stopPropagation()}>
        <div style={S.header}>
          <span style={S.title}>ML Observability</span>
          <button onClick={onClose} style={S.close}>✕</button>
        </div>

        {loading && <div style={S.loading}>Loading metrics...</div>}

        {!loading && !data && (
          <div style={S.error}>ML service unavailable. Make sure it's running on port 8000.</div>
        )}

        {!loading && data && (
          <div style={S.body}>
            <Section title="Translation Performance">
              <Stat label="Total Translations" value={data.totalTranslations} />
              <Stat label="Cache Hit Rate" value={`${(data.cacheHitRate * 100).toFixed(1)}%`} highlight />
              <Stat label="Avg Latency" value={`${data.avgLatencyMs}ms`} />
              <Stat label="p95 Latency" value={`${data.p95LatencyMs}ms`} />
              <Stat label="Uptime" value={`${Math.floor(data.uptimeSeconds / 60)}m ${data.uptimeSeconds % 60}s`} />
            </Section>

            <Section title="Model Source Distribution">
              {Object.entries(data.sourceDistribution || {}).map(([src, count]) => (
                <Stat key={src} label={src} value={count} />
              ))}
            </Section>

            <Section title="Loaded Translation Models">
              <div style={S.models}>
                {(data.loadedTranslationModels || []).map(m => (
                  <span key={m} style={S.modelTag}>{m}</span>
                ))}
              </div>
            </Section>

            <Section title="Vector Store (Semantic Search)">
              {Object.keys(data.vectorStoreStats || {}).length === 0 ? (
                <div style={S.dimText}>No messages indexed yet — send some messages first.</div>
              ) : (
                Object.entries(data.vectorStoreStats).map(([room, count]) => (
                  <Stat key={room} label={`Room ${room.slice(-6)}`} value={`${count} messages`} />
                ))
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: '13px', color: '#4b5563' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '500', color: highlight ? '#2563eb' : '#1a1a1a' }}>{value}</span>
    </div>
  );
}

const S = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '60px 20px 0' },
  panel: { background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', width: '340px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' },
  header: { padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff' },
  title: { fontWeight: '600', fontSize: '14px' },
  close: { color: '#9ca3af', fontSize: '14px' },
  loading: { padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' },
  error: { padding: '16px', color: '#dc2626', fontSize: '13px', background: '#fef2f2', margin: '12px', borderRadius: '8px' },
  body: { padding: '16px' },
  models: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  modelTag: { background: '#eff6ff', color: '#2563eb', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: '500' },
  dimText: { fontSize: '12px', color: '#9ca3af' },
};
