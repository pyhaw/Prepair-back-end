const express = require("express");
const router = express.Router();
//const { JobPosting } = require("../models"); // Adjust path if needed
const {
  createJobPosting,
  fetchJobPosting,
  fetchJobPostingByUserId,
  createJobBid,
  fetchJobBids,
  fetchActiveBidsForFixer,
  updateJobPosting,
  updateJobBid,
} = require("../handlers/api_job_posting.handlers");
const { authenticateToken } = require("../middleware/auth");

// Ensure Express Router is properly initialized
if (!router || typeof router !== "function") {
  console.error("❌ Router initialization failed. Check your Express setup.");
  process.exit(1);
}

// POST /api/job-postings - Create a new job posting
router.post("/job-postings", authenticateToken, createJobPosting);
router.get("/job-postings", authenticateToken, fetchJobPosting);

// Route to fetch job postings by user ID
router.get("/job-postings/:userId", fetchJobPostingByUserId);
router.post("/job-bids", authenticateToken, createJobBid);

router.get("/job/:id/bids", authenticateToken, fetchJobBids);

router.get("/job-bids", authenticateToken, fetchActiveBidsForFixer);
router.put("/job-bids/:id", authenticateToken, updateJobBid);
router.put("/job-postings/:id", authenticateToken, updateJobPosting);
router.delete("/job-postings/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    //const job = await JobPosting.findByPk(id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.client_id || job.client_id !== userId) {
      return res.status(403).json({ error: "You are not authorized to delete this request" });
    }

    await job.destroy();
    res.status(204).end();
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ error: "Server error while trying to delete job" });
  }
});

// Export the router correctly
module.exports = router;
