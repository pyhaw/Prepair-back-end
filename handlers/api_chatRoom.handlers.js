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
  if (!userId) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const [results] = await db.promise().query(
      `
      SELECT
        cr.room_id,
        CASE
          WHEN cr.user1_id = ? THEN cr.user2_id
          ELSE cr.user1_id
        END AS partner_id,
        u.name AS partner_name,
        u.profilePicture AS partner_picture,
        pm.message AS last_message,
        pm.created_at AS last_active
      FROM chat_rooms cr
      JOIN users u ON u.id = CASE
          WHEN cr.user1_id = ? THEN cr.user2_id
          ELSE cr.user1_id
        END
      LEFT JOIN (
        SELECT room_id, message, created_at
        FROM private_messages
        WHERE (room_id, created_at) IN (
          SELECT room_id, MAX(created_at)
          FROM private_messages
          GROUP BY room_id
        )
      ) pm ON cr.room_id = pm.room_id
      WHERE cr.user1_id = ? OR cr.user2_id = ?
      ORDER BY pm.created_at DESC
      `,
      [userId, userId, userId, userId]
    );

    res.status(200).json(results);
  } catch (err) {
    console.error("❌ Error fetching chat list:", err);
    res.status(500).json({ error: "Failed to fetch chat list" });
  }
};


module.exports = { createChatRoom, getChatList };
