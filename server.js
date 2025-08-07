require('dotenv').config();
const express = require('express');

const cors = require('cors');
const path = require('path');
const compression = require('compression');

// Start with just loading the Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(__dirname));

// Create temp directory
const fs = require('fs');
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

// Environmental variables
const nodeEnv = process.env.NODE_ENV;
const port = 3001;
const jwtSecret = process.env.JWT_SECRET || 'burger-shop-secret-key';
const emailUser = process.env.EMAIL_USER || 'shawonburger@gmail.com'; // Email for OTP sending
const emailPassword = process.env.EMAIL_PASSWORD || 'app_password_here'; // App password for email

// Set environment variables if not set already
if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = jwtSecret;
}

if (!process.env.EMAIL_USER) {
    process.env.EMAIL_USER = emailUser;
}

if (!process.env.EMAIL_PASSWORD) {
    process.env.EMAIL_PASSWORD = emailPassword;
}

// Log environment details (without sensitive info)
console.log('Starting server with environment:', { 
    nodeEnv, 
    port 
});

// Global error handler for all route handlers
const safeHandler = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        console.error('Route handler error:', {
            path: req.path,
            method: req.method,
            error: error.message
        });
        res.status(500).json({ 
            error: 'Server error', 
            message: 'Operation failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Direct admin verification endpoint
app.post('/api/auth/verify-token', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                error: 'No token provided'
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // The token is valid, send back user info
        // In a real app, you might re-fetch user from DB to ensure they still exist/have rights
        return res.json({
            success: true,
            user: {
                id: decoded.userId,
                role: decoded.role,
                // Add other non-sensitive info from token if available
            }
        });

    } catch (error) {
        console.error('Token verification error:', error.message);
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
});

// Load API routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const reviewRoutes = require('./routes/reviews');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reviewRoutes);
console.log('API routes loaded');

// Serve static files for the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin panel routes
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin.html', (req, res) => {
    res.redirect('/admin');
});

app.get('/user-auth.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'user-auth.html'));
});

// Fallback for client-side routing: send index.html
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        // For API routes not found, send a 404
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

// Final error-handling middleware
app.use((err, req, res, next) => {
    console.error('Global server error:', {
        message: err.message,
        path: req.path,
        method: req.method,
        stack: err.stack
    });
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server startup error:', err);
});


