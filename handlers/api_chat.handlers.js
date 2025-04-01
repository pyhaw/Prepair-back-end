const { db } = require("../lib/database");

const savePrivateMessage = async (req, res) => {
  try {
    const { room_id, sender_id, recipient_id, message } = req.body;

    if (!room_id || !sender_id || !recipient_id || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const query = `
      INSERT INTO private_messages (room_id, sender_id, recipient_id, message)
      VALUES (?, ?, ?, ?);
    `;
    const values = [room_id, sender_id, recipient_id, message];

    await db.promise().query(query, values);

    return res.status(201).json({ message: "Message saved successfully" });
  } catch (error) {
    console.error("🔥 Error saving message:", error);
    return res.status(500).json({ error: "Failed to save message" });
  }
};

const getUserChats = async (req, res) => {
  const { user_id } = req.params;
  try {
    const query = `
      SELECT 
        room_id,
        CASE
          WHEN user1_id = ? THEN user2_id
          ELSE user1_id
        END as partner_id
      FROM chat_rooms
      WHERE user1_id = ? OR user2_id = ?
    `;
    const [results] = await db.promise().query(query, [user_id, user_id, user_id]);
    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching user chats:", err);
    res.status(500).json({ error: "Failed to fetch user chats" });
  }
};

const fetchChatHistory = async (req, res) => {
    const { room_id } = req.params;
  
    if (!room_id) {
      return res.status(400).json({ error: "Missing room_id" });
    }
  
    try {
      const query = `
        SELECT sender_id, recipient_id, message, created_at
        FROM private_messages
        WHERE room_id = ?
        ORDER BY created_at ASC
      `;
      const [results] = await db.promise().query(query, [room_id]);
  
      return res.status(200).json(results);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      return res.status(500).json({ error: "Failed to fetch chat history" });
    }
  };
  
  module.exports = {
    savePrivateMessage,
    fetchChatHistory,
    getUserChats
  };
  


