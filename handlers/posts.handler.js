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
    const { title, description, category } = req.body;
    const userId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    // Insert the post using the category field
    const [result] = await db.promise().query(
      "INSERT INTO forum_postings (client_id, title, content, category) VALUES (?, ?, ?, ?)",
      [userId, title, description, category || 'general']
    );

    res.status(201).json({
      message: "Post created successfully",
      postId: result.insertId
    });
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};




module.exports = { createPost };
