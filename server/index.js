const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/database');
const billRoutes = require('./routes/bills');
const mongoose = require('mongoose'); // Added for mongoose.connection.readyState

const app = express();
const PORT = process.env.PORT || 5000;

// Log environment variables (without sensitive data)
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', PORT);
console.log('MongoDB URI configured:', !!process.env.MONGODB_URI);
console.log('MongoDB URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0);

// Connect to MongoDB with better error handling
const startServer = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('MongoDB connected successfully');
    
    // Middleware
    app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.vercel.app', 'http://localhost:3000'] 
        : 'http://localhost:3000',
      credentials: true
    }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Serve static files from uploads directory
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Routes
    app.use('/api/bills', billRoutes);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        success: true, 
        message: 'Bill Generator API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Server error:', err.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      console.log('404 - Route not found:', req.method, req.originalUrl);
      res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
      });
    });

    // Start server in development
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`API available at http://localhost:${PORT}/api`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
      });
    } else {
      console.log('Production server ready');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    
    // For development, still start the server even if database fails
    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting server without database connection...');
      
      // Middleware
      app.use(cors({
        origin: 'http://localhost:3000',
        credentials: true
      }));
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: true, limit: '50mb' }));

      // Health check endpoint
      app.get('/api/health', (req, res) => {
        res.json({ 
          success: true, 
          message: 'Bill Generator API is running (Database not connected)',
          timestamp: new Date().toISOString(),
          environment: 'development',
          mongodb: 'Disconnected'
        });
      });

      // Error handling middleware
      app.use((err, req, res, next) => {
        console.error('Server error:', err.stack);
        res.status(500).json({ 
          success: false, 
          message: 'Something went wrong!',
          error: err.message
        });
      });

      // 404 handler
      app.use('*', (req, res) => {
        console.log('404 - Route not found:', req.method, req.originalUrl);
        res.status(404).json({ 
          success: false, 
          message: 'Route not found' 
        });
      });

      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT} (without database)`);
        console.log(`API available at http://localhost:${PORT}/api`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
      });
    } else {
      process.exit(1);
    }
  }
};

// Initialize server
startServer();

module.exports = app; 