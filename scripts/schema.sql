-- run: mysql -u your_username -p < path/to/schema.sql

-- Drop the database if it already exists
DROP DATABASE IF EXISTS prepair_db;

-- Create the database
CREATE DATABASE prepair_db;

-- Use the database
USE prepair_db;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(50) NULL,
  phone VARCHAR(20) NULL, -- Added phone number
  jobTitle VARCHAR(100) NULL, -- Job title
  company VARCHAR(100) NULL, -- Company name
  experience VARCHAR(255) NULL, -- Years of experience
  skills TEXT NULL, -- List of skills
  degree VARCHAR(100) NULL, -- Degree
  university VARCHAR(100) NULL, -- University
  graduationYear INT NULL, -- Year of graduation
  previousRole VARCHAR(100) NULL, -- Previous job role
  duration VARCHAR(50) NULL, -- Duration of previous role
  role ENUM('admin', 'client', 'fixer') NOT NULL, -- Differentiates user roles
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL, -- Foreign key to the users table (Client)
  fixer_id INT NOT NULL, -- Foreign key to the users table (Fixer)
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5), -- Rating from 1 to 5
  comment TEXT NULL, -- Optional comment
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE job_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL, -- Foreign key to the users table (Client)
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'completed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE job_bids (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_posting_id INT NOT NULL, -- Foreign key to the job_postings table
  fixer_id INT NOT NULL, -- Foreign key to the users table (Fixer)
  bid_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_posting_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (fixer_id) REFERENCES users(id) ON DELETE CASCADE
);

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

CREATE TABLE forum_postings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL, -- Foreign key to the users table (Client)
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

