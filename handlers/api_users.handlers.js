const {
    createUser,
    userExistsByEmail,
    getUserById,
    updateUserProfile,
    deleteUser,
    getAllUsers,
    getUserByEmail,
    userExistByUsername,
} = require("../lib/database");

const bcrypt = require("bcrypt"); // Import bcrypt for hashing

const jwt = require("jsonwebtoken");

// Register a new user
async function registerUser(req, res) {
    try {
        const { username, email, password, role } = req.body;

        // Validate input
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Validate role
        const allowedRoles = ["admin", "client", "fixer"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        // Check if the email already exists
        const existsEmail = await userExistsByEmail(email);
        if (existsEmail) {
            return res.status(400).json({ error: "Email already exists" });
        }

        // Check if the username already exists
        const existsUsername = await userExistByUsername(username);
        if (existsUsername) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create the user
        const userId = await createUser(username, email, hashedPassword, role);

        // Generate JWT token for automatic login
        const jwt = require("jsonwebtoken");
        const token = jwt.sign(
            { userId: userId, name: username, role: role },
            process.env.JWT_SECRET
        );

        // Return success response with token
        res.status(201).json({
            message: "User created successfully",
            userId: userId,
            token: token,
        });
    } catch (error) {
        console.error("Error during registration:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Login a user
async function loginUser(req, res) {
    const { email, password } = req.body;
    try {
        // Fetch the user from the database
        const user = await getUserByEmail(email);
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Compare the provided password with the hashed password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const jwt = require("jsonwebtoken");
        const token = jwt.sign(
            { id: user.id, name: user.username, role: user.role },
            process.env.JWT_SECRET
        );

        res.status(200).json({ message: "Login successful", user: user.id, token });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get user profile by ID
async function getUserProfile(req, res) {
    const userId = req.params.userId;
    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Update user profile
async function updateUserProfileImpl(req, res) {
    const fs = require("fs");
    const path = require("path");
    const userId = req.params.userId;
  
    try {
      // Extract form data from the request
      const { name, email, phone, jobTitle, company, experience, skills, degree, university, graduationYear, previousRole, duration } =
        req.body;
      const newProfilePicture = req.file ? req.file.filename : null; // New uploaded file
  
      // Validate required fields
      if (!email || email.trim() === "") {
        return res.status(400).json({ error: "Email cannot be blank" });
      }
  
      // Fetch the existing user data to get the old profile picture filename
      const existingUser = await getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Delete the old profile picture if it exists and a new one is uploaded
      const oldProfilePicture = existingUser.profilePicture;
      if (oldProfilePicture && newProfilePicture) {
        const filePath = path.join(__dirname, "../uploads", oldProfilePicture);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Delete the old file
        }
      }
  
      // Prepare updates object
      const updates = {
        name,
        email,
        phone,
        jobTitle,
        company,
        experience,
        skills,
        degree,
        university,
        graduationYear: graduationYear || null,
        previousRole,
        duration,
        profilePicture: newProfilePicture || oldProfilePicture, // Use new or keep old
      };
  
      // Call the database function to update the user profile
      const success = await updateUserProfile(userId, updates);
  
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Return success response
      res.json({ message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  }

// Delete a user
async function deleteUserHandler(req, res) {
    const userId = req.params.userId;

    try {
        const success = await deleteUser(userId);
        if (!success) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Get all users (Admin route)
async function getAllUsersHandler(req, res) {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Export all functions
module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfileImpl,
    deleteUserHandler,
    getAllUsersHandler,
};