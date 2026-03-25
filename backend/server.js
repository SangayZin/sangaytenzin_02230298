require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Configure CORS explicitly to ensure preflight and cross-origin requests succeed
const allowedOrigin = process.env.ALLOWED_ORIGIN;
let originOption = true; // reflect origin by default
if (allowedOrigin && allowedOrigin !== '*') {
  originOption = allowedOrigin; // restrict to specific origin
}

const corsOptions = {
  origin: originOption,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Respond to preflight requests for all routes
app.options('*', cors(corsOptions));

// Add permissive headers as a fallback (uses ALLOWED_ORIGIN if set)
app.use((req, res, next) => {
  if (process.env.ALLOWED_ORIGIN && process.env.ALLOWED_ORIGIN !== '*') {
    res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
  } else {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Initialize better-sqlite3
let db;
let dbInitialized = false;

try {
  const Database = require('better-sqlite3');
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'tasks.db');
  
  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  console.log(`Connected to SQLite database at: ${dbPath}`);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      completed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Tasks table initialized');
  dbInitialized = true;
  
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Prepare statements
let getAllTasks, getTaskById, createTask, updateTask, deleteTask;

try {
  getAllTasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');
  getTaskById = db.prepare('SELECT * FROM tasks WHERE id = ?');
  createTask = db.prepare('INSERT INTO tasks (title, description) VALUES (?, ?)');
  updateTask = db.prepare('UPDATE tasks SET title = ?, description = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  deleteTask = db.prepare('DELETE FROM tasks WHERE id = ?');
} catch (error) {
  console.error('Failed to prepare statements:', error);
  process.exit(1);
}

// Middleware to check database connection
const checkDB = (req, res, next) => {
  if (!dbInitialized || !db) {
    return res.status(503).json({ error: 'Database not ready' });
  }
  next();
};

// GET all tasks
app.get('/api/tasks', checkDB, (req, res) => {
  try {
    const rows = getAllTasks.all();
    res.json(rows || []);
  } catch (error) {
    console.error('Error in GET /api/tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET single task
app.get('/api/tasks/:id', checkDB, (req, res) => {
  try {
    const { id } = req.params;
    const row = getTaskById.get(id);
    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(row);
  } catch (error) {
    console.error('Error in GET /api/tasks/:id:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// POST create new task
app.post('/api/tasks', checkDB, (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const info = createTask.run(title.trim(), (description || '').trim());
    
    res.status(201).json({
      id: info.lastInsertRowid,
      title: title.trim(),
      description: (description || '').trim(),
      completed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in POST /api/tasks:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT update task
app.put('/api/tasks/:id', checkDB, (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, completed } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const info = updateTask.run(
      title.trim(),
      (description || '').trim(),
      completed ? 1 : 0,
      id
    );

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      id: parseInt(id),
      title: title.trim(),
      description: (description || '').trim(),
      completed: completed ? 1 : 0,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in PUT /api/tasks/:id:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE task
app.delete('/api/tasks/:id', checkDB, (req, res) => {
  try {
    const { id } = req.params;
    const info = deleteTask.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/tasks/:id:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    database: dbInitialized ? 'connected' : 'initializing'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    if (db) {
      db.close();
      console.log('Database closed');
    }
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
