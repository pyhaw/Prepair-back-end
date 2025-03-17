-- Drop the database if it already exists
DROP DATABASE IF EXISTS prepair_db;

-- Create the database
CREATE DATABASE prepair_db;

-- Use the database
USE prepair_db;

-- Users Table
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews Table
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL, -- Foreign key to the users table (Client)
  fixer_id INT NOT NULL, -- Foreign key to the users table (Fixer)
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job Postings Table (Updated)
CREATE TABLE job_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL, -- Foreign key to the users table (Client)
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL, -- ✅ Added
  urgency ENUM('Low', 'Medium', 'High') NOT NULL, -- ✅ Added
  date DATE NOT NULL, -- ✅ Added
  min_budget DECIMAL(10,2) DEFAULT NULL, -- ✅ Added
  max_budget DECIMAL(10,2) DEFAULT NULL, -- ✅ Added
  notify BOOLEAN DEFAULT 0, -- ✅ Added
  status ENUM('open', 'in_progress', 'completed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Job Bids Table
CREATE TABLE job_bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_posting_id INT NOT NULL, -- Foreign key to the job_postings table
  fixer_id INT NOT NULL, -- Foreign key to the users table (Fixer)
  bid_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Completed Jobs Table
CREATE TABLE completed_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_posting_id INT NOT NULL, -- Foreign key to the job_postings table
  fixer_id INT NOT NULL, -- Foreign key to the users table (Fixer)
  completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  review_id INT NULL, -- Optional link to a review
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL
);

-- Forum Postings Table
CREATE TABLE forum_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL, -- Foreign key to the users table (Client)
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);
