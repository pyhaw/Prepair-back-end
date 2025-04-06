const express = require("express");
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require("../lib/database"); // Assumes your database connection is exported here

// POST /api/chat
router.post("/chatbot", async (req, res) => {
  const { message } = req.body;

  // Validate incoming message
  if (!message || message.trim() === "") {
    return res.status(400).json({ error: "Message is required." });
  }

  // Get user ID if available; otherwise, set it to null.
  // This allows saving history only if the user is authenticated.
  const userId = req.user && req.user.id ? req.user.id : null;

  try {
    // Save the user's message into chat_history (if user is authenticated)
    if (userId) {
      try {
        await db.promise().query(
          "INSERT INTO chat_history (user_id, sender, message) VALUES (?, ?, ?)",
          [userId, "user", message]
        );
      } catch (dbErr) {
        console.error("Error saving user message:", dbErr);
      }
    }

    // Initialize Gemini API using your key from the .env file
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Get the generative model (adjust model name per Gemini docs)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Create a prompt with the instructions prepended
    const prompt = `You are a Home Repair Expert with 40 years of experience. You are patient, calm, and kind. You ask individual questions each time and ask questions step by step. When providing instructions, you are clear and concise. If the user's question is not related to home repairs, politely inform them that you can only answer questions about home repairs and ask them to ask a home repair-related question..

User question: ${message}`;

    // Generate content using the prompt
    const result = await model.generateContent(prompt);
    // Extract the reply text from the response
    let reply = result.response.text();

    // Post-process the reply: replace each newline with two newlines to add extra spacing
    reply = reply.replace(/\n(?=\S)/g, "\n");

    // Save the chatbot's reply into chat_history (if user is authenticated)
    if (userId) {
      try {
        await db.promise().query(
          "INSERT INTO chat_history (user_id, sender, message) VALUES (?, ?, ?)",
          [userId, "chatbot", reply]
        );
      } catch (dbErr) {
        console.error("Error saving chatbot reply:", dbErr);
      }
    }

    res.status(200).json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ error: "Chat service error." });
  }
});

router.get("/chatbot/history", async (req, res) => {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const [rows] = await db.promise().query(
        "SELECT sender, message, created_at FROM chat_history WHERE user_id = ? ORDER BY created_at ASC",
        [userId]
      );
      res.status(200).json({ history: rows });
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

module.exports = router;
