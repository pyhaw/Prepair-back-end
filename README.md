# Project Setup Guide

## 1. Install Dependencies

Run the following command to install the required dependencies:

```bash
npm install
```

## 2. Create `.env` File

Create a `.env` file in the root directory and add the following environment variables:

```bash
DB_HOST=hopper.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=YQqZXlERsVVwTDySkhSeUeBFFRHFTpWY
DB_NAME=railway
DB_PORT=31432
PORT=5001
JWT_SECRET=your-strong-secret-key

EMAIL_HOST= "Your email host", eg: "smtp.gmail.com"
EMAIL_PORT=465
EMAIL_USER="your email address"
EMAIL_PASS="your email app password (Login to your email and go to create new app password in settings)"
```

## 3. Setup Database

Run the schema.sql script to create the required tables in your MySQL database:

```
mysql -u your_username -p < path/to/schema.sql
```

## 4. Start the server

To start the backend server, run the following command:

```
node index.js
```

Open
https://prepair-back-end.onrender.com/ to see the results

## Production (Railway) Database

The project is hosted on [Railway](https://railway.app). The backend connects to a hosted MySQL instance via environment variables.

To access the Railway DB:

```bash
mysql -h hopper.proxy.rlwy.net -u root -p --port 31432
```
