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
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/burger-shop';
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
    port, 
    mongoDbConfigured: !!process.env.MONGODB_URI 
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

// Set up minimal API routes that work without DB
app.use('/api/auth', async (req, res, next) => {
    try {
        // Even if DB isn't connected yet, try to use the real auth handlers
        // This allows login/signup to work once DB connects
        const authRoutes = require('./routes/auth');
        
        // Create a mini express router just for this request
        const router = express.Router();
        router.use('/', authRoutes);
        
        // Process the request with the auth routes
        router(req, res, next);
    } catch (error) {
        console.error('Auth route error:', error);
        res.status(503).json({ 
            error: 'Service Unavailable', 
            message: 'Authentication services temporarily unavailable',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});



// Health check endpoint
app.get('/health', (req, res) => {
    const mongoStatus = mongoose.connection.readyState;
    const statusNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
        status: 'ok',
        server: 'running',
        mongo: statusNames[mongoStatus] || 'unknown',
        routes: 'full', 
        timestamp: new Date().toISOString()
    });
});

// Test route to create and verify admin login
app.get('/test-admin-login', async (req, res) => {
    try {
        console.log('Starting admin account creation/verification...');
        
        // Delete existing admin user if it exists
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        const jwt = require('jsonwebtoken');
        
        const existingAdmin = await User.findOne({ email: 'admin@shawonburger.com' });
        if (existingAdmin) {
            console.log('Removing existing admin account...');
            await User.deleteOne({ email: 'admin@shawonburger.com' });
        }
        
        // Create a fresh admin user with known credentials
        console.log('Creating fresh admin account...');
        
        // Create admin user directly with bcrypt hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        // Create user with pre-hashed password
        const admin = new User({
            name: 'Admin User',
            email: 'admin@shawonburger.com',
            password: hashedPassword, // Pre-hashed password
            phone: '1234567890',
            address: 'Admin Address',
            role: 'admin'
        });
        
        // Save without triggering the pre-save hook
        const savedAdmin = await admin.save();
        console.log('Admin saved to database, ID:', savedAdmin._id);
        
        // Test password verification manually
        console.log('Testing password verification...');
        const isPasswordValid = await bcrypt.compare('admin123', savedAdmin.password);
        console.log('Password verification result:', isPasswordValid);

        // Generate a token for testing
        const token = jwt.sign(
            { userId: savedAdmin._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        // Return success with account details and token
        return res.json({
            success: true,
            message: 'Admin account created successfully',
            user: {
                id: savedAdmin._id,
                name: savedAdmin.name,
                email: savedAdmin.email,
                role: savedAdmin.role
            },
            token,
            password_verified: isPasswordValid
        });
    } catch (error) {
        console.error('Error creating admin account:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Special route for manual login tests
app.post('/test-manual-login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Manual login attempt:', { email, passwordLength: password?.length });
        
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ 
                error: 'User not found',
                email
            });
        }
        
        // Try both comparison methods
        const manualCompare = await bcrypt.compare(password, user.password);
        const modelCompare = await user.comparePassword(password);
        
        if (manualCompare) {
            const jwt = require('jsonwebtoken');
            const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
            
            res.json({
                success: true,
                token,
                user: { 
                    id: user._id, 
                    name: user.name,
                    email,
                    role: user.role
                }
            });
        } else {
            res.status(401).json({
                error: 'Invalid password',
                manualCompare,
                modelCompare,
                providedPassword: password,
                hashedPassword: user.password
            });
        }
    } catch (error) {
        console.error('Manual login error:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack
        });
    }
});

// Create test user route
app.get('/create-test-user', async (req, res) => {
    try {
        const User = require('./models/User');
        const bcrypt = require('bcryptjs');
        
        const email = 'test@example.com';
        const hashedPassword = await bcrypt.hash('password123', 10);
        
        // Check if user exists
        let user = await User.findOne({ email });
        
        if (user) {
            // Update password
            user = await User.findOneAndUpdate(
                { email },
                { password: hashedPassword },
                { new: true }
            );
        } else {
            // Create new user
            user = await User.create({
                name: 'Test User',
                email,
                password: hashedPassword,
                phone: '123456789',
                address: 'Test Address',
                role: 'user'
            });
        }
        
        res.json({
            success: true,
            message: 'Test user created/updated',
            loginInfo: {
                email: 'test@example.com',
                password: 'password123'
            }
        });
    } catch (error) {
        console.error('Create test user error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

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
app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
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
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('Server startup error:', err);
});

// Create admin user function
async function createAdminUser() {
    try {
        const User = require('./models/User');
        const adminExists = await User.findOne({ email: 'admin@shawonburger.com' });
        if (!adminExists) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'Admin',
                email: 'admin@shawonburger.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Admin user created successfully');
        }
    } catch (error) {
        console.error('Error creating admin user:', error.message);
    }
}
