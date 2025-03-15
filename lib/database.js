const mysql = require("mysql2");
const bcrypt = require("bcrypt"); // For hashing passwords

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

/**
 * Create a new user in the database.
 * @param {string} username - User's username
 * @param {string} email - User's email
 * @param {string} hashedPassword - User's hashed password
 * @param {string} role - User's role (e.g., "user", "admin")
 * @returns {Promise<number>} - Returns the ID of the newly created user
 */
async function createUser(username, email, hashedPassword, role) {
    const [result] = await db.promise().query(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, role]
    );
  
    return result.insertId;
  }

/**
 * Check if a user with the given email exists.
 * @param {string} email - User's email
 * @returns {Promise<boolean>} - Returns true if the user exists, false otherwise
 */
async function userExistsByEmail(email) {
  const [rows] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
  return rows.length > 0;
}

/**
 * Check if a user with the given username exists.
 * @param {string} username - User's username
 * @returns {Promise<boolean>} - Returns true if the user exists, false otherwise
 */
async function userExistByUsername(username) {
    const [rows] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);
    return rows.length > 0;
  }

/**
 * Get user by email
 * @param {string} email - User's email
 * @returns {Promise<object|null>} - Returns the user object if found, null otherwise
 */
async function getUserByEmail(email) {
    const [rows] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
    return rows.length > 0 ? rows[0] : null;
  }

/**
 * Fetch a user by their ID.
 * @param {number} userId - User's ID
 * @returns {Promise<object|null>} - Returns the user object if found, null otherwise
 */
async function getUserById(userId) {
  const [rows] = await db.promise().query("SELECT * FROM users WHERE id = ?", [userId]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Update a user's profile information dynamically.
 * @param {number} userId - User's ID
 * @param {object} updates - Object containing fields to update
 * @returns {Promise<boolean>} - Returns true if the update was successful, false otherwise
 */
async function updateUserProfile(userId, updates) {
    try {
      // Build the SQL query dynamically
      const fields = Object.keys(updates)
        .filter((key) => updates[key] !== undefined && updates[key] !== null) // Exclude undefined/null values
        .map((key) => `${key} = ?`)
        .join(", ");
  
      if (!fields) {
        throw new Error("No valid fields to update");
      }
  
      const query = `
        UPDATE users
        SET ${fields}
        WHERE id = ?`;
  
      const values = [...Object.values(updates).filter((val) => val !== undefined && val !== null), userId];
  
      const [result] = await db.promise().query(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      console.error("Error updating user profile:", error.message);
      throw error;
    }
  }

/**
 * Delete a user by their ID.
 * @param {number} userId - User's ID
 * @returns {Promise<boolean>} - Returns true if the deletion was successful, false otherwise
 */
async function deleteUser(userId) {
  const [result] = await db.promise().query("DELETE FROM users WHERE id = ?", [userId]);
  return result.affectedRows > 0;
}

/**
 * Fetch all users (for admin purposes).
 * @returns {Promise<Array>} - Returns an array of all users
 */
async function getAllUsers() {
  const [rows] = await db.promise().query("SELECT * FROM users");
  return rows;
}

// Export all functions
module.exports = {
  db,
  createUser,
  userExistsByEmail,
  getUserById,
  updateUserProfile,
  deleteUser,
  getAllUsers,
  getUserByEmail,
  userExistByUsername,
};