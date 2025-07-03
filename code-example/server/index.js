const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { z } = require('zod');
const mongoose = require('mongoose');
const { User, Todo } = require('./db');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());

app.use(express.json());

// JWT Authentication Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.userId = decoded.userId;
  next();
};



// Zod Schema for Email Validation
const userSchema = z.object({
  email: z.string().email()
});



// Register Route
app.post('/register', async (req, res) => {
  userSchema.parse(req.body); // Validate email only
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.create({ username, email, password: hashedPassword });
  res.status(201).json({ message: 'User registered' });
});



// Login Route
app.post('/login', async (req, res) => {
  userSchema.parse(req.body); // Validate email only
  const { username, email, password } = req.body;
  const user = await User.findOne({ 
    username, 
    email 
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Logged in', token });
});



// Create To-Do
app.post('/todos', authMiddleware, async (req, res) => {
  const { title } = req.body;
  const todo = await Todo.create({ userId: req.userId, title });
  res.json(todo);
});



// Read All To-Dos
app.get('/todos', authMiddleware, async (req, res) => {
  const todos = await Todo.find({ userId: req.userId });
  res.json(todos);
});



// Update To-Do
app.put('/todos', authMiddleware, async (req, res) => {
  const { id, title, completed } = req.body;
  const todo = await Todo.findOneAndUpdate(
    { _id: id, userId: req.userId },
    { title, completed },
    { new: true }
  );
  if (!todo) return res.status(404).json({ error: 'To-Do not found' });
  res.json(todo);
});



// Delete To-Do
app.delete('/todos', authMiddleware, async (req, res) => {
  const { id } = req.body;
  const todo = await Todo.findOneAndDelete({ _id: id, userId: req.userId });
  if (!todo) return res.status(404).json({ error: 'To-Do not found' });
  res.json({ message: 'To-Do deleted' });
});



// Start Server
app.listen(3000, async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  console.log(`Server running on 3000`);
});