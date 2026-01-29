const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    timeIn: {
      type: Date,
      required: true,
      default: Date.now,
    },
    timeOut: {
      type: Date,
      default: null,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userIdNumber: {
      type: String,
      required: true,
      trim: true,
    },
    rfidScannerId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Log', logSchema);
