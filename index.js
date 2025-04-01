require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const path = require("path");
const axios = require("axios"); 
const { startUp } = require("./handlers/api_users.handlers");

// Initialize Express app
const app = express();
const server = http.createServer(app); // ✅ Attach HTTP server for socket.io

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // You can restrict this to your frontend origin later
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Import routes
const userRoutes = require("./routes/api_users.routes");
const authRoutes = require("./routes/api_auth.routes");
const postsRoutes = require("./routes/api_posts.routes");
const jobPostingsRoutes = require("./routes/api_job_postings.routes");
const chatRoutes = require("./routes/api_chatbot.routes");
const chatRoomRoutes = require("./routes/api_chat.routes");
const adminRoutes = require("./routes/api_admin.routes");


// Use routes
app.use("/api", userRoutes);
app.use("/api", authRoutes);
app.use("/api", postsRoutes);
app.use("/api", jobPostingsRoutes);
app.use("/api", chatRoutes);
app.use("/api", chatRoomRoutes);

// WebSocket logic
io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined room: ${roomId}`);
  });

  socket.on("send_message", async (data) => {
    const { room, senderId, recipientId, message } = data;
  
    console.log("💬 Message from", senderId, "to room", room, ":", message);
  
    try {
      // Send POST request to your API route
      await axios.post("http://localhost:5001/api/save-message", {
        room_id: room,
        sender_id: senderId,
        recipient_id: recipientId,
        message,
      });
  
      io.to(room).emit("receive_message", data);
    } catch (error) {
      console.error("🔥 Failed to save message to DB:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(" Client disconnected:", socket.id);
  });
});
app.use("/api", adminRoutes);

// Root test route
app.get("/", (req, res) => {
  res.send("Server is running successfully!");
});

const PORT = process.env.PORT || 5001; // Start the combined Express + Socket.IO server
server.listen(PORT, () => console.log(`Server + WebSocket running on port ${PORT}`));
// app.listen(PORT, async () => {
//   console.log(`Server running on port ${PORT}`);
//   await startUp();
// });
