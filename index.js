require("dotenv").config();
const cors = require("cors");
const mysql = require("mysql2");
const express = require("express");
const bcrypt = require("bcrypt"); //for hashing password
const jwt = require("jsonwebtoken"); //for managing protected routes

const app = express();
// Middleware to parse JSON and URL-encoded data
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing form submissions
app.use(cors()); // Enable CORS after the app initialization
const blacklistedTokens = new Set(); //Store invalidated token

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  } else {
    console.log("Connected to MySQL");
  }
});

// Sample route to test the connection
app.get("/", (req, res) => {
  res.send("MySQL connection is successful!");
});

// Another route to fetch data from the database
app.get("/api/users", (req, res) => {
  db.query("SELECT * FROM users", (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send("Server error");
    } else {
      res.json(results);
    }
  });
});

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the email already exists
    const [existingUser] = await db
      .promise()
      .query("SELECT * FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        [username, email, hashedPassword, role]
      );

    // Return success response
    res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

//Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const [users] = await db
    .promise()
    .query("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email]);

  //if no such email exist in database
  if (users.length === 0) {
    return res.status(400).json({ error: "Invalid email" });
  }
  const user = users[0];
  //if valid password, return token
  if (await bcrypt.compare(password, user.password)) {
    const token = jwt.sign(
      {
        userId: user.id,
        name: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET
    );
    return res.status(200).json({
      message: "Login successful",
      user: user.id,
      token: token,
    });
  } else {
    //invalid password
    return res.status(400).json({ message: "Incorrect password" });
  }
});

//Logout
app.post("/api/logout", authenticateToken, (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract token

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  blacklistedTokens.add(token); //Invalidate token
  res.status(200).json({ message: "Logout successful" });
});

// API Endpoint to Fetch Profile
// API Endpoint to Update User Profile
app.put("/api/userProfile/:userId", authenticateToken, async (req, res) => {
  const userId = req.params.userId;
  const {
    name,
    email,
    phone,
    jobTitle,
    company,
    experience,
    skills,
    degree,
    university,
    graduationYear,
    previousRole,
    duration,
  } = req.body;

  // Convert empty strings to NULL for numerical fields
  const sanitizedGraduationYear = graduationYear ? graduationYear : null;

  const query = `
    UPDATE users
    SET name = ?,
        email = ?,
        phone = ?,
        jobTitle = ?,
        company = ?,
        experience = ?,
        skills = ?,
        degree = ?,
        university = ?,
        graduationYear = ?,
        previousRole = ?,
        duration = ?
    WHERE
        id = ?`;
  const values = [
    name,
    email,
    phone,
    jobTitle,
    company,
    experience,
    skills,
    degree,
    university,
    sanitizedGraduationYear,
    previousRole,
    duration,
    userId,
  ];

  try {
    const [result] = await db.promise().query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API Endpoint to Fetch Profile
app.get("/api/userProfile/:userId", authenticateToken, (req, res) => {
  const userId = req.params.userId;
  const query = `
    SELECT id, name, email, phone, jobTitle, company, experience, skills, degree, university, graduationYear, previousRole, duration 
    FROM users 
    WHERE id = ?`;

  db.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ message: "Database error" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(results[0]);
  });
});

// API Route to Verify JWT Token
app.get("/api/auth/verify", authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized access! Please login" });
  }

  if (blacklistedTokens.has(token)) {
    return res
      .status(403)
      .json({ error: "Session invalid, please login again" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired session" });
    }

    req.user = user; // Attach user details to the request
    next();
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
