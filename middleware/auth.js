const jwt = require('jsonwebtoken');
const User = require('../models/user.pg.js');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Handle both { userId, role } and { user: { id, role } } token formats
        const userId = decoded.userId || (decoded.user && decoded.user.id);
        if (!userId) {
            throw new Error('Invalid token format');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Attach user and token to the request object
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ 
            error: 'Please authenticate.',
            details: error.message 
        });
    }
};

const isAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

module.exports = { auth, isAdmin };
