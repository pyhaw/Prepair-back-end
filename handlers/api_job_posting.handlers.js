const { db } = require("../lib/database");

const createJobPosting = async (req, res) => {
  try {
    const { client_id, title, description, location, urgency, date, min_budget, max_budget, notify } = req.body;

    console.log("📡 Received Job Posting Request:", req.body);

    // Validate required fields
    if (!client_id || !title || !description || !location || !urgency || !date) {
      console.error("❌ Missing required fields");
      return res.status(400).json({ error: "All required fields must be provided." });
    }

    // Ensure date is valid
    if (isNaN(Date.parse(date))) {
      console.error("❌ Invalid date format");
      return res.status(400).json({ error: "Invalid date format. Please provide a valid date." });
    }

    // Convert budgets to float or set to null
    const parsedMinBudget = min_budget ? parseFloat(min_budget) : null;
    const parsedMaxBudget = max_budget ? parseFloat(max_budget) : null;

    // Ensure min_budget is not greater than max_budget
    if (parsedMinBudget !== null && parsedMaxBudget !== null && parsedMinBudget > parsedMaxBudget) {
      console.error("❌ min_budget cannot be greater than max_budget");
      return res.status(400).json({ error: "Minimum budget cannot be greater than maximum budget." });
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

    res.status(201).json({ message: "Job request created successfully!", job_id: result.insertId });
  } catch (error) {
    console.error("🔥 Error inserting job request:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { createJobPosting };
