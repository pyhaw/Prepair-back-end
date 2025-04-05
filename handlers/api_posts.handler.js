const { db } = require("../lib/database");

function getRelativeTime(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minute(s) ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hour(s) ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} day(s) ago`;
  return `${Math.floor(diffInSeconds / 604800)} week(s) ago`;
}

const createPost = async (req, res) => {
  try {
    const {
      title,
      description,
      category = "general",
      images,
      userId,
    } = req.body;

    console.log("User from token:", req.userId);

    if (!userId) {
      console.error("Missing user ID in token payload");
      return res
        .status(401)
        .json({ error: "Authentication error: User ID missing" });
    }

    if (!title || !description) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    // Ensure images is always an array
    let sanitizedImages = [];

    if (Array.isArray(images)) {
      sanitizedImages = images;
    } else if (typeof images === "string" && images.trim() !== "") {
      sanitizedImages = [images];
    }

    const [result] = await db.promise().query(
      `INSERT INTO forum_postings (client_id, title, content, category, images)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, description, category, JSON.stringify(sanitizedImages)]
    );

    const newPostId = result.insertId;

    const [newPosts] = await db.promise().query(
      `SELECT 
        p.id, 
        p.title, 
        p.content AS description, 
        p.created_at, 
        p.category,
        p.images,
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

    const rawPost = newPosts[0];

    let parsedImages = [];

    try {
      const rawImages = rawPost.images;

      if (!rawImages) {
        parsedImages = [];
      } else if (typeof rawImages === "string") {
        // Could be "" or JSON string or plain URL
        if (rawImages.trim().startsWith("[")) {
          parsedImages = JSON.parse(rawImages); // JSON stringified array
        } else {
          parsedImages = [rawImages]; // single URL string
        }
      } else if (Array.isArray(rawImages)) {
        parsedImages = rawImages; // already parsed by MySQL driver
      } else {
        parsedImages = []; // fallback
      }
    } catch (err) {
      console.warn("Failed to parse images JSON:", err);
      parsedImages = [];
    }

    res.status(201).json({
      post: {
        ...rawPost,
        images: parsedImages, // parsed array
      },
    });
  } catch (err) {
    console.error("❌ Error creating post:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
};

const getPostById = async (req, res) => {
  const postId = req.params.postId;

  try {
    const [posts] = await db.promise().query(
      `SELECT 
        p.id,
        p.title,
        p.content AS description,
        p.created_at,
        p.category,
        p.client_id,  
        u.username AS author,
        u.profilePicture AS avatar,
        COALESCE(SUM(v.vote_type = 'up'), 0) AS upvotes,
        COALESCE(SUM(v.vote_type = 'down'), 0) AS downvotes
      FROM forum_postings p
      LEFT JOIN users u ON p.client_id = u.id
      LEFT JOIN votes v ON v.post_id = p.id
      WHERE p.id = ?
      GROUP BY p.id`,
      [postId]
    );

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ post: posts[0] });
  } catch (err) {
    console.error("❌ Error fetching post by ID:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
};


module.exports = { createPost, getPostById };
