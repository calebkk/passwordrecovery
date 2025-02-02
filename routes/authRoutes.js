const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const router = express.Router();  // 
const jwt = require("jsonwebtoken");

const otpStore = new Map();
// Send OTP Route
router.post("/send-otp", async (req, res) => {
  try {
    console.log("✅ Received API Request: /send-otp");
    console.log("Request Body:", req.body);

    const { email } = req.body;
    if (!email) {
      console.log("❌ No email provided");
      return res.status(400).json({ msg: "Email is required" });
    }

    const user = await User.find({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({ msg: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    /*user.otpExpiry = otpExpiry
    await User.updateOne(
      { email: email },
      { $set: { otp: otp, otpExpiry: otpExpiry } }
    );"*/
    otpStore.set(email, { otp, expiresAt: otpExpiry });


    console.log("✅ Generated OTP:", otp);

    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    let mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email sending error:", err);
        return res.status(500).json({ msg: "Error sending email" });
      }
      console.log("✅ Email sent successfully:", info.response);
      res.json({ msg: "OTP sent to email" });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// Route: Verify OTP
router.post('/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    const record = otpStore.get(email);
    if (!record) return res.status(400).json({ message: 'No OTP request found for this email' });

    const { otp: storedOtp, expiresAt } = record;
    if (Date.now() > expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ message: 'OTP expired' });
    }

    if (otp !== storedOtp) return res.status(400).json({ message: 'Invalid OTP' });

    otpStore.delete(email);
    res.status(200).json({ message: 'OTP verified' });
});

// Route: Reset Password
router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password', error });
    }
});

// Route: Login with New Password
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
});

// Export the router
module.exports = router;  // ✅ Ensure this line is present



