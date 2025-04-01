const jwt = require("jsonwebtoken");

// Blacklisted tokens (for logout functionality)
const blacklistedTokens = new Set();

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized access! Please login" });
  }

  if (blacklistedTokens.has(token)) {
    return res.status(403).json({ error: "Session invalid, please login again" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired session" });
    }

    req.user = user; // Attach user details to the request
    next();
  });
};


// Middleware to check if the logged-in user is an admin
const isAdmin = (req, res, next) => {
  const user = req.user;

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  next();
};


// Function to handle logout
const logout = (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(400).json({ error: "No token provided" });
  }

  // Add the token to the blacklist
  blacklistedTokens.add(token);

  res.status(200).json({ message: "Logout successful" });
};

// Export the middleware, logout function, and the blacklistedTokens Set
module.exports = { authenticateToken, logout, blacklistedTokens, isAdmin };