// middleware/multer.js
const multer = require("multer");
const path = require("path");

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Directory to store uploaded files
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
  },
});

// Initialize multer with the storage configuration
const upload = multer({ storage });

// Export the middleware for single file uploads
module.exports = {
  uploadSingle: upload.single("profilePicture"), // For single file upload
};