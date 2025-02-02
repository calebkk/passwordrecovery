const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    default: null, // Stores the OTP temporarily
  },
  otpExpiry: {
    type: Date,
    default: null, // When the OTP expires
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
