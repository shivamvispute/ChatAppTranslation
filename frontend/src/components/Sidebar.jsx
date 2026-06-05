import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

const API = import.meta.env.VITE_API_URL || '';

const LANGUAGES = [
  { code: 'EN', label: 'EN' }, { code: 'ES', label: 'ES' }, { code: 'FR', label: 'FR' },
  { code: 'DE', label: 'DE' }, { code: 'IT', label: 'IT' }, { code: 'PT', label: 'PT' },
  { code: 'RU', label: 'RU' }, { code: 'ZH', label: 'ZH' }, { code: 'JA', label: 'JA' },
  { code: 'KO', label: 'KO' }, { code: 'TR', label: 'TR' }, { code: 'PL', label: 'PL' },
  { code: 'NL', label: 'NL' }, { code: 'UK', label: 'UK' },
];

export default function Sidebar({ rooms, activeRoom, onSelectRoom, onRoomCreated, onlineUsers, connected }) {
  const { user, logout, updateLanguage, token } = useAuth();
  const [newRoom, setNewRoom] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    setCreating(true);
    try {
      const { data } = await axios.post(`${API}/api/rooms`, { name: newRoom }, { headers: { Authorization: `Bearer ${token}` } });
      onRoomCreated(data.room);
      onSelectRoom(data.room);
      setNewRoom('');
      setShowCreate(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const totalOnline = activeRoom
    ? (onlineUsers[activeRoom._id]?.length || 0)
    : 0;

  return (
    <aside style={S.sidebar}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.logo}>🌐 ChatGlobe</span>
        <span style={{ ...S.dot, background: connected ? '#16a34a' : '#9ca3af' }} title={connected ? 'Connected' : 'Disconnected'} />
      </div>

      {/* User info */}
      <div style={S.userSection}>
        <div style={S.avatar}>{user.username[0].toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.username}>{user.username}</div>
          <div style={S.langRow}>
            <span style={S.langLabel}>Lang:</span>
            <select
              value={user.preferredLanguage}
              onChange={e => updateLanguage(e.target.value)}
              style={S.langSelect}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
        <button onClick={logout} style={S.logoutBtn} title="Sign out">↩</button>
      </div>

      {/* Rooms */}
      <div style={S.sectionHeader}>
        <span>CHANNELS</span>
        <button onClick={() => setShowCreate(v => !v)} style={S.addBtn} title="New channel">+</button>
      </div>

      {showCreate && (
        <form onSubmit={createRoom} style={S.createForm}>
          <input
            value={newRoom}
            onChange={e => setNewRoom(e.target.value)}
            placeholder="channel-name"
            style={S.createInput}
            autoFocus
          />
          <button type="submit" disabled={creating} style={S.createBtn}>
            {creating ? '...' : 'Create'}
          </button>
        </form>
      )}

      <nav style={S.nav}>
        {rooms.map(room => {
          const count = onlineUsers[room._id]?.length || 0;
          const isActive = activeRoom?._id === room._id;
          return (
            <button
              key={room._id}
              onClick={() => onSelectRoom(room)}
              style={{ ...S.roomBtn, ...(isActive ? S.roomBtnActive : {}) }}
            >
              <span style={S.hash}>#</span>
              <span style={S.roomName}>{room.name}</span>
              {count > 0 && <span style={S.badge}>{count}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

const S = {
  sidebar: { width: '220px', minWidth: '220px', background: '#fff', borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '16px 14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0' },
  logo: { fontWeight: '600', fontSize: '15px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  userSection: { padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f0f0f0' },
  avatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', fontSize: '13px', flexShrink: 0 },
  username: { fontWeight: '500', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  langRow: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' },
  langLabel: { fontSize: '11px', color: '#9ca3af' },
  langSelect: { fontSize: '11px', border: 'none', outline: 'none', color: '#6b7280', background: 'transparent', cursor: 'pointer' },
  logoutBtn: { fontSize: '16px', color: '#9ca3af', flexShrink: 0, padding: '2px 4px' },
  sectionHeader: { padding: '12px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { fontSize: '18px', color: '#6b7280', lineHeight: 1 },
  createForm: { padding: '0 12px 8px', display: 'flex', gap: '6px' },
  createInput: { flex: 1, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none' },
  createBtn: { padding: '6px 8px', background: '#2563eb', color: '#fff', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  nav: { flex: 1, overflowY: 'auto', padding: '4px 8px' },
  roomBtn: { width: '100%', padding: '7px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#4b5563', fontSize: '13px', textAlign: 'left', background: 'none', border: 'none' },
  roomBtnActive: { background: '#eff6ff', color: '#2563eb', fontWeight: '500' },
  hash: { color: '#9ca3af', fontSize: '14px', flexShrink: 0 },
  roomName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { background: '#e5e7eb', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', color: '#6b7280', flexShrink: 0 },
};
