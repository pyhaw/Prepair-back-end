const express = require("express");
const router = express.Router();
const { db } = require("../lib/database");
const { savePrivateMessage, fetchChatHistory} = require("../handlers/api_chat.handlers");
const { createChatRoom, getChatList } = require("../handlers/api_chatRoom.handlers");
const { getUserChats } = require("../handlers/api_chat.handlers");

router.post("/save-message", savePrivateMessage);
router.get("/chat-history/:room_id", fetchChatHistory);
router.post("/chat-room", createChatRoom);
router.get("/chats/:userId", getChatList);

module.exports = router;
