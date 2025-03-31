require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { startUp } = require("./handlers/api_users.handlers");
// Initialize Express app
const app = express();

// Middleware
app.use(express.json()); // Parse JSON requests
app.use(cors()); // Enable CORS
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import routes
const userRoutes = require("./routes/api_users.routes");
const authRoutes = require("./routes/api_auth.routes");
const postsRoutes = require("./routes/api_posts.routes");
const jobPostingsRoutes = require("./routes/api_job_postings.routes"); // Import job postings route
const chatRoutes = require("./routes/api_chatbot.routes");
const adminRoutes = require("./routes/api_admin.routes");

// Middleware to parse JSON bodies
app.use(express.json());

// Use routes under "/api" prefix
app.use("/api", userRoutes);
app.use("/api", authRoutes);
app.use("/api", postsRoutes);
app.use("/api", jobPostingsRoutes); // Add job postings route
app.use("/api", chatRoutes);
app.use("/api", adminRoutes);

// Root route to test server connection
app.get("/", (req, res) => {
  res.send("Server is running successfully!");
});

// Start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await startUp();
});
