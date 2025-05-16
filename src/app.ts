import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { MongoClient, Db } from 'mongodb';
import cors from 'cors';

const app = express();
const port = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// MongoDB setup
const mongoUri = 'mongodb://127.0.0.1:27017';
const dbName = 'jsonplaceholder';
const client = new MongoClient(mongoUri);
let db: Db;

// Connect to MongoDB once and reuse for all routes
const connectToDatabase = async () => {
  if (!db) {
    await client.connect();
    db = client.db(dbName);
    console.log('MongoDB connected');
  }
};

// Middleware to ensure DB connection is active
const withDb = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    res.status(500).json({ error: 'Could not connect to database' });
  }
};

// Route: Load users from JSONPlaceholder and insert into MongoDB
app.get('/load', withDb, async (_req, res) => {
  try {
    const usersResponse = await axios.get('https://jsonplaceholder.typicode.com/users?_embed=posts');
    const users = usersResponse.data;

    // For each user, fetch posts and their comments
    for (const user of users) {
      const postsRes = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}&_embed=comments`);
      user.posts = postsRes.data.map((post: any) => ({
        ...post,
        comments: post.comments || []
      }));
    }

    const usersCollection = db.collection('users');
    await usersCollection.deleteMany({}); // Clear existing data
    await usersCollection.insertMany(users);

    res.status(200).json({ message: 'Users loaded into MongoDB successfully' });
  } catch (err) {
    console.error('Failed to load users:', err);
    res.status(500).json({ error: 'Failed to load user data' });
  }
});

// Route: Get user by ID
app.get('/users/:userId', withDb, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const user = await db.collection('users').findOne({ id: userId });

  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Route: Add a new user
app.put('/users', withDb, async (req, res) => {
  const newUser = req.body;

  // Basic validation
  if (!newUser.id || !newUser.name || !newUser.username || !newUser.email) {
    return res.status(400).json({ error: 'Required user fields are missing' });
  }

  const existing = await db.collection('users').findOne({ id: newUser.id });
  if (existing) {
    return res.status(409).json({ error: 'User with this ID already exists' });
  }

  await db.collection('users').insertOne(newUser);
  res.status(201).json({ message: 'User added successfully' });
});

// Route: Delete user by ID
app.delete('/users/:userId', withDb, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const result = await db.collection('users').deleteOne({ id: userId });

  if (result.deletedCount === 1) {
    res.json({ message: 'User deleted successfully' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Route: Delete all users
app.delete('/users', withDb, async (_req, res) => {
  await db.collection('users').deleteMany({});
  res.json({ message: '🧹 All users removed from database' });
});

// Start server
app.listen(port, async () => {
  try {
    await connectToDatabase();
    console.log(`🚀 Server running at http://localhost:${port}`);
  } catch (err) {
    console.error('Server failed to start:', err);
  }
});
