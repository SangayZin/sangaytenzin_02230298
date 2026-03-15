require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb' }));

// Initialize SQLite Database
const dbPath = path.join(__dirname, 'tasks.db');
let db;

function initializeDatabase() {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      // Retry connection
      setTimeout(initializeDatabase, 1000);
    } else {
      console.log('Connected to SQLite database');
      createTables();
    }
  });

  // Handle database errors
  db.on('error', (err) => {
    console.error('Database error:', err);
  });
}

// Create database tables
function createTables() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating table:', err);
      } else {
        console.log('Tasks table initialized');
      }
    });
  });
}

// GET all tasks
app.get('/api/tasks', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  db.all('SELECT * FROM tasks ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
    res.json(rows || []);
  });
});

// GET single task
app.get('/api/tasks/:id', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  const { id } = req.params;
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(row);
  });
});

// POST create new task
app.post('/api/tasks', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  const { title, description } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    'INSERT INTO tasks (title, description) VALUES (?, ?)',
    [title.trim(), (description || '').trim()],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to create task' });
      }
      res.status(201).json({
        id: this.lastID,
        title: title.trim(),
        description: (description || '').trim(),
        completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  );
});

// PUT update task
app.put('/api/tasks/:id', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  const { id } = req.params;
  const { title, description, completed } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    'UPDATE tasks SET title = ?, description = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [title.trim(), (description || '').trim(), completed ? 1 : 0, id],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update task' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({
        id: parseInt(id),
        title: title.trim(),
        description: (description || '').trim(),
        completed: completed ? 1 : 0,
        updated_at: new Date().toISOString()
      });
    }
  );
});

// DELETE task
app.delete('/api/tasks/:id', (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database not connected' });
  }
  
  const { id } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Failed to delete task' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
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
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Gracefully shutdown
  process.exit(1);
});

// Initialize database
initializeDatabase();

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Database location: ${dbPath}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});
