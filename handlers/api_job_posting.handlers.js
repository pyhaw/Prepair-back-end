const { db } = require("../lib/database");

const createJobPosting = async (req, res) => {
  try {
    const {
      client_id,
      title,
      description,
      location,
      urgency,
      date,
      min_budget,
      max_budget,
      notify,
      images,
    } = req.body;

    console.log("\ud83d\udcf1 Received Job Posting Request:", req.body);

    if (
      !client_id ||
      !title ||
      !description ||
      !location ||
      !urgency ||
      !date
    ) {
      console.error("\u274c Missing required fields");
      return res
        .status(400)
        .json({ error: "All required fields must be provided." });
    }

    if (isNaN(Date.parse(date))) {
      console.error("\u274c Invalid date format");
      return res
        .status(400)
        .json({ error: "Invalid date format. Please provide a valid date." });
    }

    const parsedMinBudget = min_budget ? parseFloat(min_budget) : null;
    const parsedMaxBudget = max_budget ? parseFloat(max_budget) : null;

    if (
      parsedMinBudget !== null &&
      parsedMaxBudget !== null &&
      parsedMinBudget > parsedMaxBudget
    ) {
      console.error("\u274c min_budget cannot be greater than max_budget");
      return res.status(400).json({
        error: "Minimum budget cannot be greater than maximum budget.",
      });
    }

    const query = `
      INSERT INTO job_postings (client_id, title, description, location, urgency, date, min_budget, max_budget, notify, images) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;

    const values = [
      client_id,
      title.trim(),
      description.trim(),
      location.trim(),
      urgency,
      new Date(date),
      parsedMinBudget,
      parsedMaxBudget,
      notify ? 1 : 0,
      JSON.stringify(images || []),
    ];

    const [result] = await db.promise().query(query, values);
    console.log("\u2705 Job Posting Created:", result.insertId);

    res.status(201).json({
      message: "Job request created successfully!",
      job_id: result.insertId,
    });
  } catch (error) {
    console.error("\ud83d\udd25 Error inserting job request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchJobPosting = async (req, res) => {
  try {
    console.log("📱 Fetching Job Postings...");

    const query = `
      SELECT id, client_id, title, description, location, urgency, date, min_budget, max_budget, notify, status, created_at, images
      FROM job_postings
      ORDER BY created_at DESC;
    `;

    const [results] = await db.promise().query(query);

    results.forEach((job) => {
      if (!Array.isArray(job.images)) {
        job.images = [];
      }
    });

    if (!results.length) {
      console.warn("⚠️ No job postings found.");
      return res.status(404).json({ error: "No job postings available." });
    }

    console.log("✅ Job Postings Retrieved:", results.length);
    res.status(200).json(results);
  } catch (error) {
    console.error("🔥 Error fetching job postings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchJobPostingByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📱 Fetching Job Postings for User ID: ${userId}`);

    if (!userId || isNaN(parseInt(userId, 10))) {
      console.error("❌ Invalid user ID");
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const query = `
      SELECT id, client_id, title, description, location, urgency, date, min_budget, max_budget, notify, status, created_at, images
      FROM job_postings
      WHERE client_id = ?
      ORDER BY created_at DESC;
    `;

    const [results] = await db.promise().query(query, [userId]);

    results.forEach((job) => {
      job.images = job.images ? JSON.parse(job.images) : [];
    });

    if (!results.length) {
      console.warn(`⚠️ No job postings found for User ID: ${userId}`);
      return res
        .status(404)
        .json({ error: "No job postings available for this user." });
    }

    console.log(`✅ Job Postings Retrieved for User ID ${userId}:`, results.length);
    res.status(200).json(results);
  } catch (error) {
    console.error("🔥 Error fetching job postings by user ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const createJobBid = async (req, res) => {
  try {
    const { job_posting_id, fixer_id, bid_amount, description } = req.body;

    console.log("📡 Received Job Bid Request:", req.body);

    // Validate required fields
    if (!job_posting_id || !fixer_id || !bid_amount) {
      console.error("❌ Missing required fields");
      return res
        .status(400)
        .json({ error: "All required fields must be provided." });
    }

    // Ensure bid amount is a valid number
    const parsedBidAmount = parseFloat(bid_amount);
    if (isNaN(parsedBidAmount) || parsedBidAmount <= 0) {
      console.error("❌ Invalid bid amount");
      return res
        .status(400)
        .json({ error: "Bid amount must be a positive number." });
    }

    // Check if fixer has already bid on this job
    const checkQuery = `
        SELECT id FROM job_bids 
        WHERE job_posting_id = ? AND fixer_id = ?;
      `;
    const [existingBids] = await db
      .promise()
      .query(checkQuery, [job_posting_id, fixer_id]);

    if (existingBids.length > 0) {
      console.error("❌ Duplicate bid");
      return res
        .status(400)
        .json({ error: "You have already submitted a bid for this job." });
    }

    // Insert job bid into database
    const query = `
        INSERT INTO job_bids (job_posting_id, fixer_id, bid_amount, description, status) 
        VALUES (?, ?, ?, ?, 'pending');
      `;

    const values = [
      job_posting_id,
      fixer_id,
      parsedBidAmount,
      description || null,
    ];

    const [result] = await db.promise().query(query, values);
    console.log("✅ Job Bid Created:", result.insertId);

    res.status(201).json({
      message: "Bid submitted successfully!",
      bid_id: result.insertId,
    });
  } catch (error) {
    console.error("🔥 Error submitting bid:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchJobBids = async (req, res) => {
  try {
    const { id } = req.params; // Job posting ID

    console.log(`📡 Fetching bids for job ID: ${id}`);

    if (!id || isNaN(parseInt(id, 10))) {
      console.error("❌ Invalid job ID");
      return res.status(400).json({ error: "Invalid job ID." });
    }

    const query = `
        SELECT jb.id, jb.job_posting_id, jb.fixer_id, jb.bid_amount, jb.description, 
               jb.status, jb.created_at, u.username as fixer_name, u.profilePicture
        FROM job_bids jb
        JOIN users u ON jb.fixer_id = u.id
        WHERE jb.job_posting_id = ?
        ORDER BY jb.created_at DESC;
      `;

    const [results] = await db.promise().query(query, [id]);

    console.log(`✅ Retrieved ${results.length} bids for job ID ${id}`);
    res.status(200).json(results); // Return object with bids property
  } catch (error) {
    console.error("🔥 Error fetching job bids:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchActiveBidsForFixer = async (req, res) => {
  try {
    const { fixer_id } = req.query; // Extract fixer_id from the query parameters

    console.log(`📡 Fetching Active Bids for Fixer ID: ${fixer_id}`);

    if (!fixer_id || isNaN(parseInt(fixer_id, 10))) {
      console.error("❌ Invalid fixer ID");
      return res.status(400).json({ error: "Invalid fixer ID." });
    }

    // Fetch active job bids with status 'pending' for the given fixer_id
    const query = `
      SELECT j.id, j.description, 
             jb.status, jb.created_at, j.title, j.location, j.urgency, j.min_budget, j.max_budget
      FROM job_bids jb
      JOIN job_postings j ON jb.job_posting_id = j.id
      WHERE jb.fixer_id = ?
      ORDER BY jb.created_at DESC;
    `;

    const [results] = await db.promise().query(query, [fixer_id]);

    if (!results.length) {
      console.warn(`⚠️ No active bids found for Fixer ID: ${fixer_id}`);
      return res
        .status(404)
        .json({ error: "No active bids available for this fixer." });
    }

    console.log(
      `✅ Active Bids Retrieved for Fixer ID ${fixer_id}:`,
      results.length
    );
    res.status(200).json(results);
  } catch (error) {
    console.error("🔥 Error fetching active bids for fixer:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateJobPosting = async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      location,
      urgency,
      date,
      min_budget,
      max_budget,
      notify,
      images,
    } = req.body;

    console.log(`📡 Updating Job Posting ID: ${id}`);

    if (!title || !description || !location || !urgency || !date) {
      console.error("❌ Missing required fields");
      return res
        .status(400)
        .json({ error: "All required fields must be provided." });
    }

    if (isNaN(Date.parse(date))) {
      console.error("❌ Invalid date format");
      return res
        .status(400)
        .json({ error: "Invalid date format. Please provide a valid date." });
    }

    const parsedMinBudget = min_budget ? parseFloat(min_budget) : null;
    const parsedMaxBudget = max_budget ? parseFloat(max_budget) : null;

    if (
      parsedMinBudget !== null &&
      parsedMaxBudget !== null &&
      parsedMinBudget > parsedMaxBudget
    ) {
      console.error("❌ min_budget cannot be greater than max_budget");
      return res.status(400).json({
        error: "Minimum budget cannot be greater than maximum budget.",
      });
    }

    const query = `
      UPDATE job_postings
      SET title = ?, description = ?, location = ?, urgency = ?, date = ?, min_budget = ?, max_budget = ?, notify = ?, images = ?
      WHERE id = ?;
    `;

    const values = [
      title.trim(),
      description.trim(),
      location.trim(),
      urgency,
      new Date(date),
      parsedMinBudget,
      parsedMaxBudget,
      notify ? 1 : 0,
      JSON.stringify(images || []),
      id,
    ];

    const [result] = await db.promise().query(query, values);

    if (result.affectedRows === 0) {
      console.error("❌ Job Posting not found or no changes made.");
      return res.status(404).json({ error: "Job posting not found." });
    }

    console.log(`✅ Job Posting ID ${id} Updated`);
    res.status(200).json({ message: "Job posting updated successfully!" });
  } catch (error) {
    console.error("🔥 Error updating job posting:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


const updateJobBid = async (req, res) => {
  try {
    const { id, bid_amount, description } = req.body;

    console.log(`📡 Updating Job Bid ID: ${id}`);

    // Validate required fields
    if (!bid_amount) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ error: "Bid amount is required." });
    }

    // Ensure bid amount is a valid number
    const parsedBidAmount = parseFloat(bid_amount);
    if (isNaN(parsedBidAmount) || parsedBidAmount <= 0) {
      console.error("❌ Invalid bid amount");
      return res
        .status(400)
        .json({ error: "Bid amount must be a positive number." });
    }

    // Update job bid in the database
    const query = `
      UPDATE job_bids
      SET bid_amount = ?, description = ?
      WHERE id = ?;
    `;

    const values = [parsedBidAmount, description, id];

    const [result] = await db.promise().query(query, values);

    if (result.affectedRows === 0) {
      console.error("❌ Job Bid not found or no changes made.");
      return res.status(404).json({ error: "Job bid not found." });
    }

    console.log(`✅ Job Bid ID ${id} Updated`);

    res.status(200).json({ message: "Job bid updated successfully!" });
  } catch (error) {
    console.error("🔥 Error updating job bid:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deletePosting = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    const deleteQuery = `
      DELETE FROM job_postings 
      WHERE id = ?
    `;

    const deleteJobBidQuery = `
      DELETE job_postings 
      WHERE job_posting_id = ?`;

    await db.promise().query(deleteQuery, [id]);
    await db.promise().query(deleteJobBidQuery, [id]);

    res.status(204).end();
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ error: "Server error while trying to delete job" });
  }
};

const acceptJobBid = async (req, res) => {
  const { bidId, jobId } = req.body;
  if (!bidId || !jobId) {
    return res.status(400).json({ error: "Missing bidId or jobId" });
  }
  const updateQuery = `
  UPDATE job_bids 
  SET status = 'accepted' 
  WHERE id = ? AND job_posting_id = ?`;
  await db.promise().query(updateQuery, [bidId, jobId]);

  //delete all other queries
  const deleteOtherBidsQuery = `
            DELETE FROM job_bids 
            WHERE job_posting_id = ? AND id != ?`;

  await db.promise().query(deleteOtherBidsQuery, [jobId, bidId]);

  const updateJobStatusQuery = `
  UPDATE job_postings 
  SET status = 'in_progress' 
  WHERE id = ?`;

  await db.promise().query(updateJobStatusQuery, [jobId]);

  res
    .status(200)
    .json({ message: "Bid accepted, other bids removed, and job updated." });
};

const completeJob = async (req, res) => {
  const { bidId, jobId } = req.body;
  if (!bidId || !jobId) {
    return res.status(400).json({ error: "Missing bidId or jobId" });
  }

  try {
    const updateJobStatusQuery = `
      UPDATE job_postings 
      SET status = 'completed' 
      WHERE id = ?`;
    await db.promise().query(updateJobStatusQuery, [jobId]);

    const [rows] = await db
      .promise()
      .query(`SELECT job_posting_id, fixer_id FROM job_bids WHERE id = ?`, [bidId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Bid not found." });
    }

    const { job_posting_id, fixer_id } = rows[0];

    const insertCompletedJobQuery = `
      INSERT INTO completed_jobs (job_posting_id, fixer_id)
      VALUES (?, ?)`;
    await db.promise().query(insertCompletedJobQuery, [job_posting_id, fixer_id]);

    res.status(200).json({ message: "Job completed." });
  } catch (err) {
    console.error("Error completing job:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteJobBid = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    const deleteQuery = `
      DELETE FROM job_bids 
      WHERE id = ?
    `;

    await db.promise().query(deleteQuery, [id]);

    res.status(204).end();
  } catch (err) {
    console.error("Error deleting job:", err);
    res.status(500).json({ error: "Server error while trying to delete job" });
  }
};

const fetchActiveJobPostingsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📱 Fetching ACTIVE Job Postings for User ID: ${userId}`);

    if (!userId || isNaN(parseInt(userId, 10))) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const query = `
      SELECT 
        jp.*, 
        jb.id AS accepted_bid_id, 
        jb.fixer_id,
        u.username AS fixer_name,
        u.profilePicture
      FROM job_postings jp
      LEFT JOIN job_bids jb 
        ON jb.job_posting_id = jp.id AND jb.status = 'accepted'
      LEFT JOIN users u
        ON jb.fixer_id = u.id
      WHERE jp.client_id = ? AND jp.status = 'in_progress'
      ORDER BY jp.created_at DESC;
    `;

    const [results] = await db.promise().query(query, [userId]);

    results.forEach((job) => {
      job.images = job.images ? JSON.parse(job.images) : [];
    });

    if (!results.length) {
      return res.status(404).json({ error: "No active jobs for this user." });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching active job postings:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const rateFixer = async (req, res) => {
  try {
    const { id: jobId } = req.params;
    const { fixer_id, rating, comment } = req.body;
    const client_id = req.user.id;

    if (!fixer_id || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const [jobRows] = await db.promise().query(
      `SELECT * FROM job_postings WHERE id = ? AND client_id = ? AND status = 'completed'`,
      [jobId, client_id]
    );

    if (jobRows.length === 0) {
      return res.status(403).json({ error: "You are not allowed to rate this job." });
    }

    const [existingReview] = await db
      .promise()
      .query(
        `SELECT * FROM reviews WHERE client_id = ? AND fixer_id = ?`,
        [client_id, fixer_id]
      );
    
    console.log("Found review:", existingReview); 

    if (existingReview.length > 0) {
      // Update existing review
      await db.promise().query(
        `UPDATE reviews SET rating = ?, comment = ?, created_at = CURRENT_TIMESTAMP WHERE client_id = ? AND fixer_id = ?`,
        [rating, comment, client_id, fixer_id]
      );
    } else {
      // Insert new review
      await db.promise().query(
        `INSERT INTO reviews (client_id, fixer_id, rating, comment) VALUES (?, ?, ?, ?)`,
        [client_id, fixer_id, rating, comment]
      );
    }

    res.status(200).json({ message: "Review submitted successfully!" });
  } catch (err) {
    console.error("Error submitting review:", err);
    res.status(500).json({ error: "Failed to submit review." });
  }
};

module.exports = {
  createJobPosting,
  fetchJobPosting,
  fetchJobPostingByUserId,
  createJobBid,
  fetchJobBids,
  fetchActiveBidsForFixer,
  updateJobPosting,
  updateJobBid,
  deletePosting,
  acceptJobBid,
  completeJob,
  deleteJobBid,
  rateFixer,
  fetchActiveJobPostingsByUserId,
};
