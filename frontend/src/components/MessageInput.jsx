import { useState, useRef, useEffect, useCallback } from 'react';

export default function MessageInput({ onSend, socket, roomId }) {
  const [text, setText] = useState('');
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const emitTyping = useCallback((isTyping) => {
    if (!socket || !roomId) return;
    if (isTypingRef.current === isTyping) return;
    isTypingRef.current = isTyping;
    socket.emit('typing', { roomId, isTyping });
  }, [socket, roomId]);

  const handleChange = (e) => {
    setText(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
    emitTyping(false);
    clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  return (
    <form onSubmit={handleSubmit} style={S.form}>
      <textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Message... (Enter to send, Shift+Enter for new line)"
        style={S.input}
        rows={1}
        maxLength={2000}
      />
      <button type="submit" disabled={!text.trim()} style={{ ...S.sendBtn, ...(text.trim() ? S.sendBtnActive : {}) }}>
        ↑
      </button>
    </form>
  );
}

const S = {
  form: { display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #e0e0e0', flexShrink: 0, background: '#fff' },
  input: { flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '22px', outline: 'none', fontSize: '14px', resize: 'none', lineHeight: '1.4', maxHeight: '120px', overflowY: 'auto', fontFamily: 'inherit' },
  sendBtn: { width: '36px', height: '36px', borderRadius: '50%', background: '#e5e7eb', color: '#9ca3af', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'not-allowed', transition: 'background 0.15s' },
  sendBtnActive: { background: '#2563eb', color: '#fff', cursor: 'pointer' },
};
