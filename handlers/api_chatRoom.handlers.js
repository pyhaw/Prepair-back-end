const { db } = require("../lib/database");

const createChatRoom = async (req, res) => {
  try {
    const { user1Id, user2Id } = req.body;
    const roomId = [user1Id, user2Id].sort().join("-");

    // Check if room already exists
    const [existing] = await db.promise().query(
      `SELECT * FROM chat_rooms WHERE room_id = ?`,
      [roomId]
    );

    if (existing.length === 0) {
      await db.promise().query(
        `INSERT INTO chat_rooms (room_id, user1_id, user2_id) VALUES (?, ?, ?)`,
        [roomId, user1Id, user2Id]
      );
    }

    return res.status(201).json({ success: true, roomId });
  } catch (error) {
    console.error("❌ Error creating room:", error);
    return res.status(500).json({ success: false, error: "Failed to create room" });
  }
};

const getChatList = async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const query = `
      SELECT
        cr.room_id,
        u.id as partner_id,
        u.username as partner_name,
        u.profilePicture as partner_picture,
        pm.message as last_message,
        pm.created_at as last_active
      FROM chat_rooms cr
      JOIN users u
        ON u.id = CASE
          WHEN cr.user1_id = ? THEN cr.user2_id
          ELSE cr.user1_id
        END
      LEFT JOIN (
        SELECT room_id, MAX(created_at) as max_time
        FROM private_messages
        GROUP BY room_id
      ) lm ON lm.room_id = cr.room_id
      LEFT JOIN private_messages pm
        ON pm.room_id = lm.room_id AND pm.created_at = lm.max_time
      WHERE cr.user1_id = ? OR cr.user2_id = ?
      ORDER BY last_active DESC;
    `;
    const [results] = await db.promise().query(query, [userId, userId, userId]);
    res.status(200).json(results);
  } catch (err) {
    console.error("❌ Error fetching chat list:", err);
    res.status(500).json({ error: "Failed to fetch chat list" });
  }
};



module.exports = { createChatRoom, getChatList };
