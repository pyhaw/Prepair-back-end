const express = require("express");
const router = express.Router();
const { deleteUser, deleteJobPosting } = require("../lib/database");

async function deleteUserHandler(req, res) {
  try {
    const { id } = req.params;

    // Attempt to delete the user
    const success = await deleteUser(id);

    if (success) {
      // Return a success response with a message
      return res.status(200).json({
        message: "User deleted successfully",
      });
    } else {
      // User not found or deletion failed
      return res.status(404).json({
        error: "User not found or failed to delete",
      });
    }
  } catch (error) {
    // Log the error for debugging
    console.error("Error in deleteUserHandler:", error);

    // Return a generic 500 error for unexpected issues
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

async function deleteJobPostingHandler(req, res) {
  try {
    const { id } = req.params;

    // Call the deleteJobPosting function
    const success = await deleteJobPosting(id);

    if (!success) {
      return res.status(404).json({ error: "Job posting not found." });
    }

    return res.status(200).json({ message: "Job posting deleted successfully." });
  } catch (error) {
    console.error("Error deleting job posting:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

async function verifyAdmin(req, res) {
  try {
    // If the request reaches here, it means the user is authenticated and is an admin
    return res.status(200).json({ isAdmin: true });
  } catch (error) {
    console.error("Error verifying admin status:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  deleteUserHandler,
  deleteJobPostingHandler,
  verifyAdmin,
}