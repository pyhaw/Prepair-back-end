-- Drop the database if it already exists
DROP DATABASE IF EXISTS prepair_db;

-- Create the database
CREATE DATABASE prepair_db;

-- Use the database
USE prepair_db;

-- ======================================
-- Create Users Table
-- ======================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(50) NULL,
  phone VARCHAR(20) NULL,
  jobTitle VARCHAR(100) NULL,
  company VARCHAR(100) NULL,
  experience VARCHAR(255) NULL,
  skills TEXT NULL,
  degree VARCHAR(100) NULL,
  university VARCHAR(100) NULL,
  graduationYear INT NULL,
  previousRole VARCHAR(100) NULL,
  duration VARCHAR(50) NULL,
  role ENUM('admin', 'client', 'fixer') NOT NULL,
  profilePicture VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ======================================
-- Create OTP Table
-- ======================================
CREATE TABLE otp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  otp VARCHAR(6) NOT NULL, -- Store OTP as a string (e.g., "1234")
  expires_at TIMESTAMP NOT NULL, -- Expiration time
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- ======================================
-- Create Reviews Table
-- ======================================
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  fixer_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job Postings Table (Updated)
CREATE TABLE job_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL, -- ✅ Added
  urgency ENUM('Low', 'Medium', 'High') NOT NULL, -- ✅ Added
  date DATE NOT NULL, -- ✅ Added
  min_budget DECIMAL(10,2) DEFAULT NULL, -- ✅ Added
  max_budget DECIMAL(10,2) DEFAULT NULL, -- ✅ Added
  notify BOOLEAN DEFAULT 0, -- ✅ Added
  images JSON DEFAULT NULL,
  status ENUM('open', 'in_progress', 'completed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert placeholder users
INSERT INTO users (username, email, password, role)
VALUES 
  ('testuser', 'testuser@gmail.com', 'password', 'fixer'),
  ('clientuser', 'client@gmail.com', 'password', 'client');


-- Insert a placeholder job posting
INSERT INTO job_postings 
(client_id, title, description, location, urgency, date, min_budget, max_budget, notify)
VALUES 
(1, 'Test', 'Test description', 'Central', 'Medium', '2024-01-01', 100, 500, 0);

-- ======================================
-- Create Job Bids Table
-- ======================================
CREATE TABLE job_bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_posting_id INT NOT NULL,
  fixer_id INT NOT NULL,
  bid_amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert a placeholder job bid
INSERT INTO job_bids (job_posting_id, fixer_id, bid_amount, status)
VALUES (1, 1, 2500.00, 'pending');

-- ======================================
-- Create Completed Jobs Table
-- ======================================
CREATE TABLE completed_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_posting_id INT NOT NULL,
  fixer_id INT NOT NULL,
  completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  review_id INT NULL,
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL
);

-- ======================================
-- Create Forum Postings Table
-- ======================================
CREATE TABLE forum_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  images JSON DEFAULT NULL, 
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Alter forum_postings to add upvotes, downvotes, and category
ALTER TABLE forum_postings
  ADD COLUMN upvotes INT DEFAULT 0,
  ADD COLUMN downvotes INT DEFAULT 0,
  ADD COLUMN category VARCHAR(50) DEFAULT 'general';

-- Insert a placeholder forum posting
INSERT INTO forum_postings (client_id, title, content, category)
VALUES (1, 'Test Discussion Post', 'This is a test discussion post.', 'general');

-- ======================================
-- Create Post Replies Table
-- ======================================
CREATE TABLE post_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES forum_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert a placeholder reply
INSERT INTO post_replies (post_id, user_id, content)
VALUES (1, 2, 'This is a reply to the test discussion.');

-- ======================================
-- Create Votes Table (for posts and replies)
-- ======================================
CREATE TABLE votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NULL,
  reply_id INT NULL,
  vote_type ENUM('up', 'down') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES forum_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (reply_id) REFERENCES post_replies(id) ON DELETE CASCADE,
  CONSTRAINT unique_post_vote UNIQUE (user_id, post_id),
  CONSTRAINT unique_reply_vote UNIQUE (user_id, reply_id),
  CONSTRAINT check_vote_target CHECK (
    (post_id IS NULL AND reply_id IS NOT NULL) OR 
    (post_id IS NOT NULL AND reply_id IS NULL)
  )
);

-- ======================================
-- Create Chat History 
-- ======================================

CREATE TABLE chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,           
  sender ENUM('user', 'chatbot') NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ======================================
-- Create Indexes for Performance
-- ======================================
CREATE INDEX idx_post_replies_post_id ON post_replies(post_id);
CREATE INDEX idx_votes_post_id ON votes(post_id);
CREATE INDEX idx_votes_reply_id ON votes(reply_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);

-- ======================================
-- Create ChatRooms Table
-- ======================================

CREATE TABLE chat_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL UNIQUE, -- e.g., "3-7"
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE private_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(255) NOT NULL, -- Format: "11-12"
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
);
