# Project Setup Guide

## 1. Install Dependencies
Run the following command to install the required dependencies:
```bash
npm install
```
## 2. Create `.env` File
Create a `.env` file in the root directory and add the following environment variables:
```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=prepair_db
DB_PORT=3306
PORT=5001
JWT_SECRET=your-strong-secret-key

EMAIL_HOST= "Your email host", eg: "smtp.gmail.com" 
EMAIL_PORT=465
EMAIL_USER="your email address"
EMAIL_PASS="your email app password (Login to your email and go to create new app password in settings)"
```
## 3. Setup Database
Run the `schema.sql` script to create the required tables in your MySQL database:
```
mysql -u your_username -p < path/to/schema.sql
```

## 4. Start the server
To start the server, run the following command:
```
node index.js
```
Open 
http://localhost:5001/ to see the results

