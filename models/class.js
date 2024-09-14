const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['yoga', 'gym', 'dance'], required: true },
  capacity: { type: Number, required: true },
  slots: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  waitingList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startTime: { type: Date, required: true }
});

module.exports = mongoose.model('Class', classSchema);
