const express = require("express");
const router = express.Router();
const { authenticateToken, logout } = require("../middleware/auth");

// Verify token route
router.get("/auth/verify", authenticateToken, (req, res) => {
  res.status(200).json({
    message: "Token is valid",
    user: req.user,
  });
});

// Logout route
router.post("/auth/logout", authenticateToken, (req, res) => {
  logout(req, res); // Call the logout function
});

module.exports = router;