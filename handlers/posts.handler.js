const path = require("path");
const { writeFile } = require("fs/promises");
const { db } = require("../lib/database");

function getRelativeTime(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minute(s) ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hour(s) ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} day(s) ago`;
  return `${Math.floor(diffInSeconds / 604800)} week(s) ago`;
}

const createPost = async (req, res) => {
  try {
    const { title, description, category = "general" } = req.body;
    
    // Debug logging to see what's in req.user
    console.log("User from token:", req.user);
    
    // Check if user ID exists
    if (!req.user || !req.user.userId) {
      console.error("Missing user ID in token payload");
      return res.status(401).json({ error: "Authentication error: User ID missing" });
    }
    
    const userId = req.user.userId;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    // Insert post into database
    const [result] = await db.promise().query(
      "INSERT INTO forum_postings (client_id, title, content, category) VALUES (?, ?, ?, ?)",
      [userId, title, description, category]
    );

    const newPostId = result.insertId;

    // Return the created post data
    const [newPosts] = await db.promise().query(
      `SELECT 
        p.id, 
        p.title, 
        p.content AS description, 
        p.created_at, 
        p.category,
        u.username AS author,
        u.profilePicture AS avatar,
        0 AS replyCount,
        0 AS upvotes,
        0 AS downvotes
      FROM forum_postings p
      LEFT JOIN users u ON p.client_id = u.id
      WHERE p.id = ?`,
      [newPostId]
    );

    res.status(201).json({ post: newPosts[0] });
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
};




module.exports = { createPost };
