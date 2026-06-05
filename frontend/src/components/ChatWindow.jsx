import { useRef, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import MessageInput from './MessageInput.jsx';
import SearchBar from './SearchBar.jsx';
import MetricsPanel from './MetricsPanel.jsx';

export default function ChatWindow({ room, messages, onSend, typingUsers, onlineUsers, socket, activeRoomId }) {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const [metricsOpen, setMetricsOpen] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!room) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
        Select a channel to start chatting
      </div>
    );
  }

  const typingList = Array.from(typingUsers).filter(u => u !== user.username);

  return (
    <div style={S.window}>
      {/* Room header */}
      <div style={S.header}>
        <div>
          <span style={S.roomTitle}># {room.name}</span>
          {room.description && <span style={S.desc}>{room.description}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={S.online}>{onlineUsers.length} online</span>
          <SearchBar activeRoom={room} />
          <button onClick={() => setMetricsOpen(true)} style={S.metricsBtn} title="ML Metrics">📊</button>
        </div>
      </div>
      <MetricsPanel open={metricsOpen} onClose={() => setMetricsOpen(false)} />

      {/* Messages */}
      <div style={S.messages}>
        {messages.length === 0 && (
          <div style={S.empty}>No messages yet. Say hello!</div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg._id || i}
            msg={msg}
            isOwn={msg.sender === user._id}
            prevMsg={messages[i - 1]}
          />
        ))}
        {typingList.length > 0 && (
          <div style={S.typing}>
            {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={onSend} socket={socket} roomId={activeRoomId} />
    </div>
  );
}

function MessageBubble({ msg, isOwn, prevMsg }) {
  if (msg.isSystem) {
    return <div style={S.systemMsg}>{msg.text}</div>;
  }

  const showSender = !prevMsg || prevMsg.isSystem || prevMsg.sender !== msg.sender;
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ ...S.bubble, ...(isOwn ? S.ownBubble : {}) }}>
      {showSender && !isOwn && <div style={S.senderName}>{msg.senderUsername}</div>}
      <div style={{ ...S.msgBox, ...(isOwn ? S.ownMsgBox : S.otherMsgBox) }}>
        <div style={S.msgText}>{msg.text}</div>
        {msg.translating && (
          <div style={S.translating}>Translating...</div>
        )}
        {msg.translatedText && !msg.translating && (
          <div style={S.translation}>
            <span style={S.translationDivider}>— </span>
            {msg.translatedText}
            {msg.translationSource && (
              <span style={S.sourceTag}>{msg.translationSource === 'huggingface' ? ' 🤗 HF' : msg.translationSource === 'hf_cache' ? ' ⚡ cached' : ' 🔁 DeepL'}</span>
            )}
          </div>
        )}
        <div style={{ ...S.meta, ...(isOwn ? { color: '#93c5fd' } : {}) }}>
          <span>{time}</span>
          {msg.detectedLanguage && <span style={S.langTag}>{msg.detectedLanguage}</span>}
        </div>
      </div>
    </div>
  );
}

const S = {
  window: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' },
  header: { padding: '14px 20px', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  roomTitle: { fontWeight: '600', fontSize: '15px' },
  desc: { marginLeft: '10px', color: '#9ca3af', fontSize: '12px' },
  online: { fontSize: '12px', color: '#9ca3af' },
  metricsBtn: { fontSize: '16px', padding: '4px 8px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' },
  messages: { flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '2px' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: '40px', fontSize: '13px' },
  systemMsg: { textAlign: 'center', color: '#9ca3af', fontSize: '12px', padding: '4px 0', fontStyle: 'italic' },
  typing: { color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', padding: '2px 0' },
  bubble: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '2px' },
  ownBubble: { alignItems: 'flex-end' },
  senderName: { fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '2px', paddingLeft: '4px' },
  msgBox: { maxWidth: '65%', padding: '8px 12px', borderRadius: '10px', wordBreak: 'break-word' },
  otherMsgBox: { background: '#f3f4f6', borderTopLeftRadius: '3px' },
  ownMsgBox: { background: '#2563eb', color: '#fff', borderTopRightRadius: '3px' },
  msgText: { fontSize: '14px', lineHeight: '1.4' },
  translating: { fontSize: '11px', color: '#93c5fd', marginTop: '4px', fontStyle: 'italic' },
  translation: { fontSize: '13px', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid rgba(0,0,0,0.08)', color: '#374151', lineHeight: '1.4' },
  translationDivider: { color: '#9ca3af' },
  sourceTag: { fontSize: '10px', color: '#9ca3af', marginLeft: '4px' },
  meta: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '10px', color: '#9ca3af', justifyContent: 'flex-end' },
  langTag: { background: 'rgba(0,0,0,0.06)', borderRadius: '3px', padding: '1px 4px' },
};
