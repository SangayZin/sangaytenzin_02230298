import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'https://be-todo-02230298-4.onrender.com';

  // Fetch all tasks
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });
      if (!response.ok) throw new Error('Failed to add task');
      const newTask = await response.json();
      setTasks([newTask, ...tasks]);
      setTitle('');
      setDescription('');
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Add error:', err);
    }
  };

  // Update task
  const handleUpdateTask = async () => {
    if (!editTitle.trim()) {
      alert('Title is required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/tasks/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDescription })
      });
      if (!response.ok) throw new Error('Failed to update task');
      
      setTasks(tasks.map(task => 
        task.id === editingId 
          ? { ...task, title: editTitle, description: editDescription }
          : task
      ));
      setEditingId(null);
      setEditTitle('');
      setEditDescription('');
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Update error:', err);
    }
  };

  // Toggle task completion
  const handleToggleTask = async (task) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: task.title, 
          description: task.description,
          completed: !task.completed 
        })
      });
      if (!response.ok) throw new Error('Failed to toggle task');
      
      setTasks(tasks.map(t => 
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ));
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Toggle error:', err);
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete task');
      
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      alert(`Error: ${err.message}`);
      console.error('Delete error:', err);
    }
  };

  // Start editing
  const handleStartEdit = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description);
  };

  return (
    <div className="App">
      <div className="container">
        <h1>✓ Todo List</h1>
        <p className="subtitle">Stay organized and track your daily tasks</p>

        {/* Statistics Section */}
        <div className="stats-container">
          <div className="stat-card total">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value">{tasks.length}</div>
          </div>
          <div className="stat-card completed">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{tasks.filter(t => t.completed).length}</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{tasks.filter(t => !t.completed).length}</div>
          </div>
        </div>

        {/* Add/Edit Task Form */}
        <form onSubmit={handleAddTask} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Task Title</label>
            <input
              id="title"
              type="text"
              placeholder="What needs to be done? (e.g., Buy groceries)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={editingId !== null}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              placeholder="Add more details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={editingId !== null}
              rows="2"
            />
          </div>
          <button type="submit" className="btn-add" disabled={editingId !== null}>
            + Add Task
          </button>
        </form>

        {editingId && (
          <div className="edit-form">
            <h3>Edit Task</h3>
            <input
              type="text"
              placeholder="Task title..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <textarea
              placeholder="Task description..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows="2"
            />
            <button onClick={handleUpdateTask} className="btn-update">
              Save Changes
            </button>
            <button 
              onClick={() => {
                setEditingId(null);
                setEditTitle('');
                setEditDescription('');
              }}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Loading State */}
        {loading && <div className="loading">Loading tasks...</div>}

        {/* Tasks List */}
        {!loading && tasks.length === 0 ? (
          <div className="no-tasks">No tasks yet. Add one to get started!</div>
        ) : (
          <div className="tasks-list">
            {tasks.map(task => (
              <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                <div className="task-content">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task)}
                    className="task-checkbox"
                  />
                  <div className="task-text">
                    <h3>{task.title}</h3>
                    {task.description && <p>{task.description}</p>}
                  </div>
                </div>
                <div className="task-actions">
                  <button 
                    onClick={() => handleStartEdit(task)}
                    className="btn-edit"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="btn-delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
