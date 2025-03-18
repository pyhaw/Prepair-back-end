const express = require("express");
const router = express.Router();
const { createJobPosting, fetchJobPosting } = require("../handlers/api_job_posting.handlers");
const { authenticateToken } = require("../middleware/auth");

// Ensure Express Router is properly initialized
if (!router || typeof router !== "function") {
  console.error("❌ Router initialization failed. Check your Express setup.");
  process.exit(1);
}

// POST /api/job-postings - Create a new job posting
router.post("/job-postings", authenticateToken, createJobPosting);

router.get("/job-postings", authenticateToken, fetchJobPosting)

// Export the router correctly
module.exports = router;
