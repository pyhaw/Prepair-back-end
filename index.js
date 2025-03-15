require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Middleware and server setup
const app = express();
const path = require("path");
// Middleware to parse JSON and enable CORS
app.use(express.json()); // For parsing application/json
app.use(cors()); // Enable CORS
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Import routes
const userRoutes = require("./routes/api_users.routes");
const authRoutes = require("./routes/api_auth.routes"); // Import the new auth routes

// Use routes under the "/api" prefix
app.use("/api", userRoutes);
app.use("/api", authRoutes); // Add the auth routes

// Root route to test server connection
app.get("/", (req, res) => {
  res.send("Server is running successfully!");
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));