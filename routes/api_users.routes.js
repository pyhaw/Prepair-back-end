const express = require("express");
const router = express.Router();

// Import handlers
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfileImpl,
  deleteUserHandler,
  getAllUsersHandler,
  sendOTPToEmail,
  verifyOtp,
  resetPassword,
} = require("../handlers/api_users.handlers");

// Middleware for authentication
const { authenticateToken } = require("../middleware/auth.js");

const { uploadSingle } = require("../middleware/upload"); // Import the middleware

// Routes
router.post("/register", registerUser); // Register a new user
router.post("/login", loginUser); // Login a user
router.get("/userProfile/:userId", authenticateToken, getUserProfile); // Get user profile
router.put("/userProfile/:userId", authenticateToken, uploadSingle, updateUserProfileImpl);
router.delete("/users/:userId", authenticateToken, deleteUserHandler); // Delete a user
router.get("/users", getAllUsersHandler); // Get all users (Admin)
router.post("/forgot-password", sendOTPToEmail);
router.post("/verifyOtp", verifyOtp);
router.post("/reset-password", resetPassword)


module.exports = router;