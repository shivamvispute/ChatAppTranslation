const Message = require('../models/Message');
const Room = require('../models/Room');
const { detectLanguage, indexMessage } = require('./mlClient');

// roomId -> Set of { userId, username, preferredLanguage, socketId }
const roomUsers = new Map();

function getRoomUsers(roomId) {
  return roomUsers.get(roomId) || new Set();
}

function addUserToRoom(roomId, userInfo) {
  if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Map());
  roomUsers.get(roomId).set(userInfo.userId, userInfo);
}

function removeUserFromRoom(roomId, userId) {
  if (roomUsers.has(roomId)) {
    roomUsers.get(roomId).delete(userId);
    if (roomUsers.get(roomId).size === 0) roomUsers.delete(roomId);
  }
}

function getUserRooms(userId) {
  const rooms = [];
  for (const [roomId, users] of roomUsers.entries()) {
    if (users.has(userId)) rooms.push(roomId);
  }
  return rooms;
}

module.exports = (io) => {
  io.on('connection', async (socket) => {
    const { id: userId, username, preferredLanguage } = socket.user;
    console.log(`User connected: ${username} (${socket.id})`);

    socket.on('join-room', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        socket.join(roomId);
        addUserToRoom(roomId, { userId, username, preferredLanguage, socketId: socket.id });

        const users = Array.from(getRoomUsers(roomId).values());
        io.to(roomId).emit('room-users', { roomId, users });

        socket.to(roomId).emit('user-joined', {
          roomId,
          username,
          message: `${username} joined the room`,
          timestamp: new Date(),
        });

        socket.emit('joined-room', { roomId, roomName: room.name });
      } catch (err) {
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      removeUserFromRoom(roomId, userId);

      const users = Array.from((roomUsers.get(roomId) || new Map()).values());
      io.to(roomId).emit('room-users', { roomId, users });
      socket.to(roomId).emit('user-left', {
        roomId,
        username,
        message: `${username} left the room`,
        timestamp: new Date(),
      });
    });

    socket.on('send-message', async ({ roomId, text }) => {
      if (!text || !text.trim() || text.length > 2000) return;

      try {
        // Save and broadcast immediately — no waiting on ML service
        const message = await Message.create({
          room: roomId,
          sender: userId,
          senderUsername: username,
          text: text.trim(),
          detectedLanguage: null,
        });

        const payload = {
          _id: message._id,
          roomId,
          sender: userId,
          senderUsername: username,
          text: text.trim(),
          detectedLanguage: null,
          timestamp: message.timestamp,
        };

        io.to(roomId).emit('message', payload);

        // ML enrichment is fully fire-and-forget — never blocks chat
        (async () => {
          try {
            const detectedLanguage = await detectLanguage(text.trim());
            if (detectedLanguage) {
              await Message.findByIdAndUpdate(message._id, { detectedLanguage });
            }
            indexMessage(String(message._id), String(roomId), text.trim(), username, String(message.timestamp));
          } catch {
            // ML service down — chat still works fine
          }
        })();
      } catch (err) {
        console.error('send-message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('user-typing', { username, isTyping, roomId });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${username}`);
      const rooms = getUserRooms(userId);
      for (const roomId of rooms) {
        removeUserFromRoom(roomId, userId);
        const users = Array.from((roomUsers.get(roomId) || new Map()).values());
        io.to(roomId).emit('room-users', { roomId, users });
        io.to(roomId).emit('user-left', {
          roomId,
          username,
          message: `${username} disconnected`,
          timestamp: new Date(),
        });
      }
    });
  });
};
