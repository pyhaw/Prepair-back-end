const {
  createUser,
  userExistsByEmail,
  getUserById,
  updateUserProfile,
  deleteUser,
  getAllUsers,
  getUserByEmail,
  userExistByUsername,
  storeOTP,
  getOTPByUserId,
  deleteOTPById,
  updateUserPassword,
} = require("../lib/database");

const bcrypt = require("bcrypt"); // Import bcrypt for hashing
const crypto = require("crypto");

//nodemailer for sending otp to reset password
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

require("dotenv").config();
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

    res.status(200).json({
      message: "Login successful",
      user: user.id,
      role: String(user.role),
      token,
    });
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

//Reset password
async function resetPassword(req, res) {
  const { email, password } = req.body;

  try {
    // Validate required fields
    if (!password || password.trim() === "") {
      return res.status(400).json({ error: "Password cannot be blank" });
    }
    // Fetch the user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash the new password
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password in the database
    const success = await updateUserPassword(user.id, hashedPassword);

    if (!success) {
      return res.status(500).json({ error: "Failed to update password" });
    }

    // Return success response
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

// Update user profile
async function updateUserProfileImpl(req, res) {

  try {
    const userId = req.params.userId;
    const { name, email, phone, jobTitle, company, experience, skills, degree, university, graduationYear, previousRole, duration } =
      req.body;

    // Fetch existing user
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    let newProfilePictureUrl = existingUser.profilePicture; // Default to existing image

    // If the frontend sends a new image URL, update it
    if (req.body.profilePicture) {
      newProfilePictureUrl = req.body.profilePicture;
    }

    // Prepare update object
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
      profilePicture: newProfilePictureUrl, // Store Cloudinary URL
    };

    console.log(updates)

    // Update user in database
    const success = await updateUserProfile(userId, updates);
    if (!success) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Profile updated successfully", profilePicture: newProfilePictureUrl });
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

async function sendOTPToEmail(req, res) {
  const { email } = req.body;

  try {
    // Check if the email exists in the users table
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "Email doesn't exist!" });
    }

    // Generate a random 4-digit OTP
    const otp = crypto.randomInt(1000, 10000).toString();
    const fiveMinsLater = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Store the OTP in the otp table
    await storeOTP(user.id, otp, fiveMinsLater);

    // Email content
    const mailOptions = {
      from: `"PrePair" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset",
      text: `Your OTP for password reset is: ${otp}. It will expire in 5 minutes.`,
      html: `
                <h3>Password Reset OTP</h3>
                <p>Your OTP for password reset is: <strong>${otp}</strong>.</p>
                <p>Please use this code within the next 5 minutes. It will expire at: <strong>${fiveMinsLater.toLocaleString()}</strong>.</p>
            `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    console.log(`OTP sent to ${email}: ${otp}`);
    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}

async function verifyOtp(req, res) {
  const { email, otp } = req.body;

  try {
    // Fetch the user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch the OTP record from the otp table
    const storedOtpRecord = await getOTPByUserId(user.id);
    if (!storedOtpRecord || storedOtpRecord.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Check if the OTP has expired
    if (new Date(storedOtpRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    // OTP is valid; delete it from the otp table to prevent reuse
    await deleteOTPById(storedOtpRecord.id);

    return res.status(200).json({ message: "OTP valid", email });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ error: "Failed to verify OTP" });
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
  sendOTPToEmail,
  verifyOtp,
  resetPassword, 
  updateUserProfileImpl,
};
