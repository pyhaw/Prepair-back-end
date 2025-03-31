const express = require("express");
const router = express.Router();
const { authenticateToken, isAdmin } = require("../middleware/auth");
const { getAllUsersHandler } = require("../handlers/api_users.handlers");
const { deleteUserHandler, deleteJobPostingHandler, verifyAdmin } = require("../handlers/api_admin.handlers");

//Get all users
router.get("/admin/users", authenticateToken, isAdmin, getAllUsersHandler); 
router.get("/admin/verify", authenticateToken, isAdmin, verifyAdmin);
router.delete("/admin/user/:id",  authenticateToken, isAdmin, deleteUserHandler)
router.delete("/admin/jobPosting/:id",  authenticateToken, isAdmin, deleteJobPostingHandler);
module.exports = router;