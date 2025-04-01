const express = require("express");
const router = express.Router();
const { db } = require("../lib/database");

const { createPost } = require("../handlers/posts.handler");
const { authenticateToken } = require("../middleware/auth");

// POST /api/posts - Create a new forum posting
router.post("/posts", authenticateToken, createPost);

// GET /api/posts - Retrieve all forum postings
// GET /api/posts - Retrieve all forum postings
router.get("/posts", async (req, res) => {
  try {
    const [posts] = await db.promise().query(
      `SELECT 
         p.id, 
         p.title, 
         p.content AS description, 
         p.created_at, 
         p.category,
         p.images,
         u.username AS author,
         u.profilePicture AS avatar,
         (SELECT COUNT(*) FROM post_replies WHERE post_id = p.id) AS replyCount,
         COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
         COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes
       FROM forum_postings p
       LEFT JOIN users u ON p.client_id = u.id
       LEFT JOIN votes v ON v.post_id = p.id
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    );

    // Safely parse the images field for each post
    const parsedPosts = posts.map((post) => {
      let parsedImages = [];
      try {
        const rawImages = post.images;

        if (!rawImages) {
          parsedImages = [];
        } else if (typeof rawImages === "string") {
          if (rawImages.trim().startsWith("[")) {
            parsedImages = JSON.parse(rawImages);
          } else {
            parsedImages = [rawImages];
          }
        } else if (Array.isArray(rawImages)) {
          parsedImages = rawImages;
        }
      } catch (err) {
        console.warn(`Failed to parse images for post ${post.id}:`, err);
        parsedImages = [];
      }

      return {
        ...post,
        images: parsedImages,
      };
    });

    console.log("Fetched posts from DB:", parsedPosts);
    res.json({ posts: parsedPosts });
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/posts/:postId - Retrieve a single forum posting by ID
router.get("/posts/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const [posts] = await db
      .promise()
      .query(
        "SELECT id, title, content AS description, created_at FROM forum_postings WHERE id = ?",
        [postId]
      );
    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    res.json({ post: posts[0] });
  } catch (err) {
    console.error("Error fetching post details:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/posts/:postId/replies - Retrieve replies for a specific post
router.get("/posts/:postId/replies", async (req, res) => {
  try {
    const postId = req.params.postId;
    const [replies] = await db.promise().query(
      `SELECT r.id, r.content, r.created_at, 
              u.username as author,
              COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
              COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes
       FROM post_replies r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN votes v ON v.reply_id = r.id
       WHERE r.post_id = ?
       GROUP BY r.id
       ORDER BY r.created_at ASC`,
      [postId]
    );
    res.json({ replies });
  } catch (err) {
    console.error("Error fetching replies:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/posts/:postId/replies - Add a reply to a post
router.post("/posts/:postId/replies", authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.postId;
    // Use fallback if req.user.id is missing
    const userId = req.user.id || req.user.userId;

    if (!content || content.trim() === "") {
      return res.status(400).json({ error: "Reply content is required" });
    }

    // Check if post exists
    const [posts] = await db
      .promise()
      .query("SELECT id FROM forum_postings WHERE id = ?", [postId]);

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Insert reply
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO post_replies (post_id, user_id, content) VALUES (?, ?, ?)",
        [postId, userId, content]
      );

    // Fetch the newly created reply with author info
    const [replies] = await db.promise().query(
      `SELECT r.id, r.content, r.created_at, u.username as author, 0 as upvotes, 0 as downvotes
       FROM post_replies r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ reply: replies[0] });
  } catch (err) {
    console.error("Error creating reply:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/posts/:postId/vote - Vote on a post
router.post("/posts/:postId/vote", authenticateToken, async (req, res) => {
  try {
    const { voteType } = req.body;
    const postId = req.params.postId;
    const userId = req.user.id || req.user.userId;

    if (!["up", "down"].includes(voteType)) {
      return res.status(400).json({ error: "Invalid vote type" });
    }

    // Check if post exists
    const [posts] = await db
      .promise()
      .query("SELECT id FROM forum_postings WHERE id = ?", [postId]);

    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user has already voted on this post
    const [existingVotes] = await db
      .promise()
      .query(
        "SELECT id, vote_type FROM votes WHERE user_id = ? AND post_id = ?",
        [userId, postId]
      );

    let query;
    let params;

    if (existingVotes.length > 0) {
      if (existingVotes[0].vote_type === voteType) {
        query = "DELETE FROM votes WHERE id = ?";
        params = [existingVotes[0].id];
      } else {
        query = "UPDATE votes SET vote_type = ? WHERE id = ?";
        params = [voteType, existingVotes[0].id];
      }
    } else {
      query =
        "INSERT INTO votes (user_id, post_id, vote_type) VALUES (?, ?, ?)";
      params = [userId, postId, voteType];
    }

    await db.promise().query(query, params);

    // Get updated vote counts
    const [updatedVotes] = await db.promise().query(
      `SELECT 
         COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
         COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes
       FROM votes
       WHERE post_id = ?`,
      [postId]
    );

    res.json(updatedVotes[0]);
  } catch (err) {
    console.error("Error processing vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/replies/:replyId/vote - Vote on a reply
router.post("/replies/:replyId/vote", authenticateToken, async (req, res) => {
  try {
    const { voteType } = req.body;
    const replyId = req.params.replyId;
    const userId = req.user.id || req.user.userId;

    if (!["up", "down"].includes(voteType)) {
      return res.status(400).json({ error: "Invalid vote type" });
    }

    // Check if reply exists
    const [replies] = await db
      .promise()
      .query("SELECT id FROM post_replies WHERE id = ?", [replyId]);

    if (replies.length === 0) {
      return res.status(404).json({ error: "Reply not found" });
    }

    // Check if user has already voted on this reply
    const [existingVotes] = await db
      .promise()
      .query(
        "SELECT id, vote_type FROM votes WHERE user_id = ? AND reply_id = ?",
        [userId, replyId]
      );

    let query;
    let params;

    if (existingVotes.length > 0) {
      if (existingVotes[0].vote_type === voteType) {
        query = "DELETE FROM votes WHERE id = ?";
        params = [existingVotes[0].id];
      } else {
        query = "UPDATE votes SET vote_type = ? WHERE id = ?";
        params = [voteType, existingVotes[0].id];
      }
    } else {
      query =
        "INSERT INTO votes (user_id, reply_id, vote_type) VALUES (?, ?, ?)";
      params = [userId, replyId, voteType];
    }

    await db.promise().query(query, params);

    // Get updated vote counts
    const [updatedVotes] = await db.promise().query(
      `SELECT 
         COALESCE(SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END), 0) as upvotes,
         COALESCE(SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END), 0) as downvotes
       FROM votes
       WHERE reply_id = ?`,
      [replyId]
    );

    res.json(updatedVotes[0]);
  } catch (err) {
    console.error("Error processing vote:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/posts/:postId/user-votes - Get user's votes for a post and its replies
router.get("/posts/:postId/user-votes", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id || req.user.userId;

    const [postVotes] = await db
      .promise()
      .query("SELECT vote_type FROM votes WHERE user_id = ? AND post_id = ?", [
        userId,
        postId,
      ]);

    const [replyVotes] = await db.promise().query(
      `SELECT v.reply_id, v.vote_type
       FROM votes v
       JOIN post_replies r ON v.reply_id = r.id
       WHERE v.user_id = ? AND r.post_id = ?`,
      [userId, postId]
    );

    const votes = {
      post: postVotes.length > 0 ? postVotes[0].vote_type : null,
    };

    replyVotes.forEach((vote) => {
      votes[`reply_${vote.reply_id}`] = vote.vote_type;
    });

    res.json({ votes });
  } catch (err) {
    console.error("Error fetching user votes:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/posts/:postId - Edit a forum posting
router.put("/posts/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const [posts] = await db
      .promise()
      .query("SELECT id, client_id FROM forum_postings WHERE id = ?", [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Optionally, add a check that (req.user.id || req.user.userId) matches posts[0].client_id

    await db
      .promise()
      .query(
        "UPDATE forum_postings SET title = ?, content = ?, category = ? WHERE id = ?",
        [title, content, category || "general", postId]
      );

    const [updatedPosts] = await db
      .promise()
      .query(
        "SELECT id, title, content AS description, created_at, category FROM forum_postings WHERE id = ?",
        [postId]
      );
    res.json({ post: updatedPosts[0] });
  } catch (err) {
    console.error("Error updating post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/posts/:postId - Delete a forum posting
router.delete("/posts/:postId", authenticateToken, async (req, res) => {
  try {
    const postId = req.params.postId;
    const [posts] = await db
      .promise()
      .query("SELECT id FROM forum_postings WHERE id = ?", [postId]);
    if (posts.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    await db
      .promise()
      .query("DELETE FROM forum_postings WHERE id = ?", [postId]);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Error deleting post:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/posts/:postId/replies/:replyId - Edit a reply
router.put(
  "/posts/:postId/replies/:replyId",
  authenticateToken,
  async (req, res) => {
    try {
      const { postId, replyId } = req.params;
      const { content } = req.body;

      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Reply content is required" });
      }

      const [replies] = await db
        .promise()
        .query(
          "SELECT id, user_id FROM post_replies WHERE id = ? AND post_id = ?",
          [replyId, postId]
        );
      if (replies.length === 0) {
        return res.status(404).json({ error: "Reply not found" });
      }
      // Optionally, ensure (req.user.id || req.user.userId) matches replies[0].user_id

      await db
        .promise()
        .query("UPDATE post_replies SET content = ? WHERE id = ?", [
          content,
          replyId,
        ]);

      const [updatedReplies] = await db.promise().query(
        `SELECT r.id, r.content, r.created_at, u.username as author, 0 as upvotes, 0 as downvotes
       FROM post_replies r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
        [replyId]
      );
      res.json({ reply: updatedReplies[0] });
    } catch (err) {
      console.error("Error updating reply:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /api/posts/:postId/replies/:replyId - Delete a reply
router.delete(
  "/posts/:postId/replies/:replyId",
  authenticateToken,
  async (req, res) => {
    try {
      const { postId, replyId } = req.params;
      const [replies] = await db
        .promise()
        .query("SELECT id FROM post_replies WHERE id = ? AND post_id = ?", [
          replyId,
          postId,
        ]);
      if (replies.length === 0) {
        return res.status(404).json({ error: "Reply not found" });
      }
      await db
        .promise()
        .query("DELETE FROM post_replies WHERE id = ?", [replyId]);
      res.json({ message: "Reply deleted successfully" });
    } catch (err) {
      console.error("Error deleting reply:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
