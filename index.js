require('dotenv').config();
const mysql = require('mysql2');
const express = require('express');
const bcrypt = require('bcrypt');

const app = express();
// Middleware to parse JSON and URL-encoded data
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  } else {
    console.log('Connected to MySQL');
  }
});

// Sample route to test the connection
app.get('/', (req, res) => {
  res.send('MySQL connection is successful!');
});

// Another route to fetch data from the database
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Server error');
    } else {
      res.json(results);
    }
  });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if the email already exists
    const [existingUser] = await db.promise().query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    const [result] = await db.promise().query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    // Return success response
    res.status(201).json({
      message: 'User created successfully',
      userId: result.insertId,
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Login
app.post('/api/login', async(req, res) => {
    const { email, password } = req.body;
    const [ users ] = await db.promise().query(
      "SELECT * FROM USERS WHERE email = ?", [email]
    );
    //if no such email exist in database
    if (users.length === 0) {
      return res.status(400).json({ error: "Invalid email" });
    }
    //if valid password
    if (await bcrypt.compare(password, users[0].password)) {
      return res.status(200).json({ message: "Login successful", userId: users[0].id });
    } else { //invalid password
      return res.status(400).json({ message: "Incorrect password" });
    }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
