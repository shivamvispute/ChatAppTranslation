import { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function SearchBar({ activeRoom }) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);

  const search = async (e) => {
    e.preventDefault();
    if (!query.trim() || !activeRoom) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/search/messages`, {
        params: { q: query, roomId: activeRoom._id, topK: 5 },
        headers: { Authorization: `Bearer ${token}` },
      });
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const close = () => { setOpen(false); setResults(null); setQuery(''); };

  return (
    <>
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }} style={S.trigger} title="Semantic search">
        🔍
      </button>

      {open && (
        <div style={S.overlay} onClick={close}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>Semantic Search</span>
              <span style={S.subtext}>AI-powered — finds messages by meaning, not keywords</span>
              <button onClick={close} style={S.closeBtn}>✕</button>
            </div>
            <form onSubmit={search} style={S.form}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search #${activeRoom?.name || 'room'} messages...`}
                style={S.input}
              />
              <button type="submit" disabled={loading || !query.trim()} style={S.searchBtn}>
                {loading ? '...' : 'Search'}
              </button>
            </form>

            {results !== null && (
              <div style={S.results}>
                {results.length === 0 ? (
                  <div style={S.empty}>No semantically similar messages found.</div>
                ) : (
                  results.map((r, i) => (
                    <div key={i} style={S.result}>
                      <div style={S.resultMeta}>
                        <span style={S.sender}>{r.senderUsername}</span>
                        <span style={S.sim}>
                          {Math.round(r.similarity * 100)}% match
                        </span>
                      </div>
                      <div style={S.resultText}>{r.text}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  trigger: { fontSize: '16px', padding: '4px 8px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '80px' },
  modal: { background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', width: '100%', maxWidth: '560px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' },
  modalHeader: { padding: '16px 20px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  modalTitle: { fontWeight: '600', fontSize: '15px' },
  subtext: { fontSize: '12px', color: '#9ca3af', flex: 1 },
  closeBtn: { color: '#9ca3af', fontSize: '14px', marginLeft: 'auto' },
  form: { display: 'flex', gap: '8px', padding: '14px 20px' },
  input: { flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '7px', fontSize: '14px', outline: 'none' },
  searchBtn: { padding: '9px 16px', background: '#2563eb', color: '#fff', borderRadius: '7px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  results: { padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' },
  empty: { color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '20px 0' },
  result: { padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' },
  resultMeta: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px' },
  sender: { fontWeight: '500', fontSize: '12px', color: '#374151' },
  sim: { fontSize: '11px', color: '#2563eb', fontWeight: '500' },
  resultText: { fontSize: '13px', color: '#4b5563', lineHeight: '1.4' },
};
