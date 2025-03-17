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

/**
 * Create a new forum post
 * @param {string} title - Post title
 * @param {string} description - Post description
 * @param {string} category - Post category
 * @param {string} imageUrl - URL to post image (optional)
 * @param {number} userId - ID of the user creating the post
 * @returns {Promise<number>} - Returns the ID of the newly created post
 */
async function createPost(title, description, category, imageUrl, userId) {
  const [result] = await db.promise().query(
    "INSERT INTO posts (title, description, category, image_url, user_id) VALUES (?, ?, ?, ?, ?)",
    [title, description, category, imageUrl, userId]
  );
  
  return result.insertId;
}

/**
 * Get post by ID with vote counts
 * @param {number} postId - Post ID
 * @returns {Promise<object|null>} - Returns the post with vote counts if found
 */
async function getPostById(postId) {
  const [posts] = await db.promise().query(`
    SELECT 
      p.id, p.title, p.description, p.image_url as image, p.category,
      u.username as author, u.avatar, 
      p.created_at,
      COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
      COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN votes v ON p.id = v.post_id
    WHERE p.id = ?
    GROUP BY p.id
  `, [postId]);
  
  return posts.length > 0 ? posts[0] : null;
}

/**
 * Get posts with filtering and sorting options
 * @param {object} options - Options for filtering and sorting
 * @returns {Promise<Array>} - Returns array of posts matching criteria
 */
async function getPosts({ category = null, sortBy = "newest", searchQuery = "" }) {
  let query = `
    SELECT 
      p.id, p.title, p.description, p.image_url as image, 
      u.username as author, u.avatar, 
      p.created_at,
      COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
      COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN votes v ON p.id = v.post_id
    WHERE 1=1
  `;
  
  const queryParams = [];
  
  if (category) {
    query += " AND p.category = ?";
    queryParams.push(category);
  }
  
  if (searchQuery) {
    query += " AND (p.title LIKE ? OR p.description LIKE ?)";
    queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
  }
  
  query += " GROUP BY p.id";
  
  if (sortBy === "newest") {
    query += " ORDER BY p.created_at DESC";
  } else if (sortBy === "popular") {
    query += " ORDER BY (upvotes - downvotes) DESC";
  } else if (sortBy === "trending") {
    query += " ORDER BY (upvotes - downvotes) DESC, p.created_at DESC";
  }
  
  const [posts] = await db.promise().query(query, queryParams);
  return posts;
}

/**
 * Add a comment to a post
 * @param {number} postId - Post ID
 * @param {number} userId - User ID
 * @param {string} content - Comment content
 * @returns {Promise<number>} - Returns the ID of the newly created comment
 */
async function createComment(postId, userId, content) {
  const [result] = await db.promise().query(
    "INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)",
    [postId, userId, content]
  );
  
  return result.insertId;
}

/**
 * Get comments for a post
 * @param {number} postId - Post ID
 * @returns {Promise<Array>} - Returns array of comments for the post
 */
async function getCommentsByPostId(postId) {
  const [comments] = await db.promise().query(`
    SELECT 
      c.id, c.content, c.created_at,
      u.username as author, u.avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at DESC
  `, [postId]);
  
  return comments;
}

/**
 * Add or update a vote on a post
 * @param {number} postId - Post ID
 * @param {number} userId - User ID
 * @param {string} voteType - Vote type ('up' or 'down')
 * @returns {Promise<object>} - Returns updated vote counts
 */
async function voteOnPost(postId, userId, voteType) {
  // Check if user has already voted
  const [existingVotes] = await db.promise().query(
    "SELECT id, vote_type FROM votes WHERE post_id = ? AND user_id = ?",
    [postId, userId]
  );
  
  if (existingVotes.length > 0) {
    const existingVote = existingVotes[0];
    
    if (existingVote.vote_type === voteType) {
      // User is canceling their vote
      await db.promise().query(
        "DELETE FROM votes WHERE id = ?",
        [existingVote.id]
      );
    } else {
      // User is changing their vote
      await db.promise().query(
        "UPDATE votes SET vote_type = ? WHERE id = ?",
        [voteType, existingVote.id]
      );
    }
  } else {
    // New vote
    await db.promise().query(
      "INSERT INTO votes (post_id, user_id, vote_type) VALUES (?, ?, ?)",
      [postId, userId, voteType]
    );
  }
  
  // Get updated vote counts
  const [votes] = await db.promise().query(`
    SELECT 
      COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
      COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes
    FROM votes
    WHERE post_id = ?
  `, [postId]);
  
  return votes[0];
}

/**
 * Get user's vote on a post
 * @param {number} postId - Post ID
 * @param {number} userId - User ID
 * @returns {Promise<string|null>} - Returns vote type ('up', 'down') or null
 */
async function getUserVoteOnPost(postId, userId) {
  const [votes] = await db.promise().query(
    "SELECT vote_type FROM votes WHERE post_id = ? AND user_id = ?",
    [postId, userId]
  );
  
  return votes.length > 0 ? votes[0].vote_type : null;
}

/**
 * Format a date as a relative time string
 * @param {Date} date - Date to format
 * @returns {string} - Returns relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
}

// Export all functions
module.exports = {
  db,
  createUser,
  userExistsByEmail,
  userExistByUsername, // Fixed function name
  getUserById,
  updateUserProfile,
  deleteUser,
  getAllUsers,
  getUserByEmail,
  createPost,
  getPostById,
  getPosts,
  createComment,
  getCommentsByPostId,
  voteOnPost,
  getUserVoteOnPost,
  getRelativeTime
};