import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChatWindow from '../components/ChatWindow.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function ChatPage() {
  const { user, token } = useAuth();
  const { socket, connected } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});

  useEffect(() => {
    axios.get(`${API}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        setRooms(data.rooms);
        if (data.rooms.length > 0) setActiveRoom(data.rooms[0]);
      });
  }, [token]);

  // Join room on change
  useEffect(() => {
    if (!socket || !activeRoom) return;
    socket.emit('join-room', { roomId: activeRoom._id });
    return () => socket.emit('leave-room', { roomId: activeRoom._id });
  }, [socket, activeRoom?._id]);

  // Load message history
  useEffect(() => {
    if (!activeRoom || messages[activeRoom._id]) return;
    axios.get(`${API}/api/messages/${activeRoom._id}?lang=${user.preferredLanguage}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(({ data }) => {
      setMessages(prev => ({ ...prev, [activeRoom._id]: data.messages }));
    });
  }, [activeRoom, token, user.preferredLanguage]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (msg) => {
      // Show message immediately
      const needsTranslation = msg.detectedLanguage &&
        msg.detectedLanguage.toUpperCase() !== user.preferredLanguage.toUpperCase() &&
        msg.sender !== user._id;

      const newMsg = { ...msg, translatedText: null, translating: needsTranslation };

      setMessages(prev => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] || []), newMsg],
      }));

      // Translate in background
      if (needsTranslation) {
        try {
          const { data } = await axios.post(`${API}/api/translate`,
            { text: msg.text, targetLang: user.preferredLanguage, sourceLang: msg.detectedLanguage },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setMessages(prev => ({
            ...prev,
            [msg.roomId]: (prev[msg.roomId] || []).map(m =>
              m._id === msg._id ? { ...m, translatedText: data.translatedText, translating: false } : m
            ),
          }));
        } catch {
          setMessages(prev => ({
            ...prev,
            [msg.roomId]: (prev[msg.roomId] || []).map(m =>
              m._id === msg._id ? { ...m, translating: false } : m
            ),
          }));
        }
      }
    };

    const handleRoomUsers = ({ roomId, users }) => {
      setOnlineUsers(prev => ({ ...prev, [roomId]: users }));
    };

    const handleTyping = ({ username, isTyping, roomId }) => {
      setTypingUsers(prev => {
        const current = new Set(prev[roomId] || []);
        isTyping ? current.add(username) : current.delete(username);
        return { ...prev, [roomId]: current };
      });
    };

    const handleSystemEvent = (event) => {
      if (!event.roomId) return;
      const systemMsg = {
        _id: Date.now() + Math.random(),
        isSystem: true,
        text: event.message,
        timestamp: event.timestamp,
        roomId: event.roomId,
      };
      setMessages(prev => ({
        ...prev,
        [event.roomId]: [...(prev[event.roomId] || []), systemMsg],
      }));
    };

    socket.on('message', handleMessage);
    socket.on('room-users', handleRoomUsers);
    socket.on('user-typing', handleTyping);
    socket.on('user-joined', handleSystemEvent);
    socket.on('user-left', handleSystemEvent);

    return () => {
      socket.off('message', handleMessage);
      socket.off('room-users', handleRoomUsers);
      socket.off('user-typing', handleTyping);
      socket.off('user-joined', handleSystemEvent);
      socket.off('user-left', handleSystemEvent);
    };
  }, [socket, user, token]);

  const sendMessage = (text) => {
    if (!socket || !activeRoom || !text.trim()) return;
    socket.emit('send-message', { roomId: activeRoom._id, text: text.trim() });
  };

  const addRoom = (room) => {
    setRooms(prev => [...prev, room]);
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#f5f5f5' }}>
      <Sidebar
        rooms={rooms}
        activeRoom={activeRoom}
        onSelectRoom={setActiveRoom}
        onRoomCreated={addRoom}
        onlineUsers={onlineUsers}
        connected={connected}
      />
      <ChatWindow
        room={activeRoom}
        messages={activeRoom ? (messages[activeRoom._id] || []) : []}
        onSend={sendMessage}
        typingUsers={activeRoom ? (typingUsers[activeRoom._id] || new Set()) : new Set()}
        onlineUsers={activeRoom ? (onlineUsers[activeRoom._id] || []) : []}
        socket={socket}
        activeRoomId={activeRoom?._id}
      />
    </div>
  );
}
