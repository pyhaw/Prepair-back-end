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
    } = req.body;

    console.log("📡 Received Job Posting Request:", req.body);

    // Validate required fields
    if (
      !client_id ||
      !title ||
      !description ||
      !location ||
      !urgency ||
      !date
    ) {
      console.error("❌ Missing required fields");
      return res
        .status(400)
        .json({ error: "All required fields must be provided." });
    }

    // Ensure date is valid
    if (isNaN(Date.parse(date))) {
      console.error("❌ Invalid date format");
      return res
        .status(400)
        .json({ error: "Invalid date format. Please provide a valid date." });
    }

    // Convert budgets to float or set to null
    const parsedMinBudget = min_budget ? parseFloat(min_budget) : null;
    const parsedMaxBudget = max_budget ? parseFloat(max_budget) : null;

    // Ensure min_budget is not greater than max_budget
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

    // Insert job posting into database
    const query = `
      INSERT INTO job_postings (client_id, title, description, location, urgency, date, min_budget, max_budget, notify) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
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
    ];

    const [result] = await db.promise().query(query, values);
    console.log("✅ Job Posting Created:", result.insertId);

    res.status(201).json({
      message: "Job request created successfully!",
      job_id: result.insertId,
    });
  } catch (error) {
    console.error("🔥 Error inserting job request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const fetchJobPosting = async (req, res) => {
  try {
    console.log("📡 Fetching Job Postings...");

    // Fetch all job postings from database
    const query = `
        SELECT id, client_id, title, description, location, urgency, date, min_budget, max_budget, notify, status, created_at
        FROM job_postings
        ORDER BY created_at DESC;
      `;

    const [results] = await db.promise().query(query);

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
    const { userId } = req.params; // Extract userId from the URL parameters

    console.log(`📡 Fetching Job Postings for User ID: ${userId}`);

    // Validate userId
    if (!userId || isNaN(parseInt(userId, 10))) {
      console.error("❌ Invalid user ID");
      return res.status(400).json({ error: "Invalid user ID." });
    }

    // Fetch job postings for the given userId from the database
    const query = `
        SELECT id, client_id, title, description, location, urgency, date, min_budget, max_budget, notify, status, created_at
        FROM job_postings
        WHERE client_id = ?
        ORDER BY created_at DESC;
      `;

    const [results] = await db.promise().query(query, [userId]);

    if (!results.length) {
      console.warn(`⚠️ No job postings found for User ID: ${userId}`);
      return res
        .status(404)
        .json({ error: "No job postings available for this user." });
    }

    console.log(
      `✅ Job Postings Retrieved for User ID ${userId}:`,
      results.length
    );
    res.status(200).json(results); // Return the fetched job postings
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
      SELECT jb.id, jb.job_posting_id, jb.fixer_id, jb.bid_amount, jb.description, 
             jb.status, jb.created_at, j.title, j.location, j.urgency, j.min_budget, j.max_budget
      FROM job_bids jb
      JOIN job_postings j ON jb.job_posting_id = j.id
      WHERE jb.fixer_id = ? AND jb.status = 'pending'
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
    const { id } = req.params;
    const {
      title,
      description,
      location,
      urgency,
      date,
      min_budget,
      max_budget,
      notify,
    } = req.body;

    console.log(`📡 Updating Job Posting ID: ${id}`);

    // Validate required fields
    if (!title || !description || !location || !urgency || !date) {
      console.error("❌ Missing required fields");
      return res
        .status(400)
        .json({ error: "All required fields must be provided." });
    }

    // Ensure date is valid
    if (isNaN(Date.parse(date))) {
      console.error("❌ Invalid date format");
      return res
        .status(400)
        .json({ error: "Invalid date format. Please provide a valid date." });
    }

    // Convert budgets to float or set to null
    const parsedMinBudget = min_budget ? parseFloat(min_budget) : null;
    const parsedMaxBudget = max_budget ? parseFloat(max_budget) : null;

    // Ensure min_budget is not greater than max_budget
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

    // Update job posting in the database
    const query = `
      UPDATE job_postings
      SET title = ?, description = ?, location = ?, urgency = ?, date = ?, min_budget = ?, max_budget = ?, notify = ?
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
    const { id } = req.params;
    const { bid_amount, description, status } = req.body;

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
      SET bid_amount = ?, description = ?, status = ?
      WHERE id = ?;
    `;

    const values = [
      parsedBidAmount,
      description || null,
      status || "pending",
      id,
    ];

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
module.exports = {
  createJobPosting,
  fetchJobPosting,
  fetchJobPostingByUserId,
  createJobBid,
  fetchJobBids,
  fetchActiveBidsForFixer,
  updateJobPosting,
  updateJobBid,
};
