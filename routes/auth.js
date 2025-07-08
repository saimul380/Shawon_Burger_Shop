const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user.pg');
const { auth } = require('../middleware/auth');

// Register a new user (simplified with auto-verification and immediate login)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;

        if (!name || !email || !password || !phone || !address) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user (who is now auto-verified at the DB level)
        const user = await User.create({ name, email, password, phone, address });

        // Since user is auto-verified, generate token and log them in immediately
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        // Diagnostic: Return the full error to the client to understand the root cause
        res.status(500).json({
            error: 'Server error during registration.',
            details: error.message,
            stack: error.stack
        });
    }
});

// Login (simplified)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await User.comparePassword(user, password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // User is valid, generate token
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (user) {
            // Remove sensitive fields
            delete user.password_hash;
            delete user.otp_code;
            delete user.otp_expiry;
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update user profile
router.patch('/profile', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'phone', 'address'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).json({ error: 'Invalid updates' });
    }

    try {
        const updateData = {};
        updates.forEach(update => {
            if (allowedUpdates.includes(update)) {
                updateData[update] = req.body[update];
            }
        });
        const updatedUser = await User.updateProfile(req.user.userId, updateData);
        if (updatedUser) {
            delete updatedUser.password_hash;
            delete updatedUser.otp_code;
            delete updatedUser.otp_expiry;
            res.json(updatedUser);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
