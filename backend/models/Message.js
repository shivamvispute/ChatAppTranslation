const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderUsername: { type: String, required: true },
  text: { type: String, required: true, maxlength: 2000 },
  detectedLanguage: { type: String, default: null },
  timestamp: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('Message', messageSchema);
