# Project Setup Guide

This guide outlines the steps to install, configure, and run the backend server for the **Prepair** web application.

---

## Prerequisites

Ensure the following are installed on your local development environment:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [MySQL](https://www.mysql.com/)
- npm (included with Node.js)

---

## 1. Install Dependencies

Navigate to the root directory of the backend project and run:

```bash
npm install
```

This installs all required packages listed in `package.json`.

## 2. Environment Configuration

Create a `.env` file in the root directory and add the following environment variables:

```bash
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=prepair_db
DB_PORT=3306

# Server Port
PORT=5001

# JWT Secret Key
JWT_SECRET=your_strong_jwt_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password

# Chatbot Configuration
GEMINI_API_KEY=AIzaSyAOWn393vNmB8KikZG0jGmdBVOXA9WCmQg
```

Note: For Gmail accounts, an App Password must be generated and used in place of your standard email password.

## 3. Setup MySQL Database

To initialise the database schema, run the following command:

```
mysql -u your_username -p < path/to/localSchema.sql
```

## 4. Start the Backend Server

Once your environment variables are configured and database is set up, start the server:

```
node index.js
```

By default, the backend will be available at:  
http://localhost:5001
