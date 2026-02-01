const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    idNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'user', 'guard', 'staff'],
      default: 'user',
    },
    dateCreated: {
      type: Date,
      default: Date.now,
    },
    // Optional: only set for users who can log in (e.g. admin)
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
  },
  { timestamps: true, versionKey: false }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
