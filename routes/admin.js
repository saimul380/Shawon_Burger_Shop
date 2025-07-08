const express = require('express');
const router = express.Router();
const Dashboard = require('../models/dashboard.pg.js');
const User = require('../models/user.pg.js');
const MenuItem = require('../models/menuItem.pg.js');
const ComboDeal = require('../models/comboDeal.pg.js');
const PDFDocument = require('pdfkit');
const { auth, isAdmin } = require('../middleware/auth');
const Order = require('../models/order.pg.js'); // Assuming an Order model exists
const path = require('path');
const fs = require('fs');

// Get all orders
router.get('/orders', auth, isAdmin, async (req, res) => {
    try {
        const orders = await Order.findAll(); // You will need to create this method in your Order model
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// Update order status
router.patch('/orders/:id/status', auth, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const updatedOrder = await Order.updateStatus(req.params.id, status);
        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order status.' });
    }
});


// Get dashboard statistics with date range
router.get('/dashboard', auth, isAdmin, async (req, res) => {
    try {
        const { dateRange } = req.query;
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        // Set date range based on filter
        switch(dateRange) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default: // today
                break;
        }
        
        const [stats, userCount] = await Promise.all([
            Dashboard.getStats(startDate),
            User.count()
        ]);

        res.json({ ...stats, userCount });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Export dashboard data as PDF
router.get('/dashboard/export', auth, isAdmin, async (req, res) => {
    try {
        const { dateRange } = req.query;
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        
        // Set date range based on filter
        switch(dateRange) {
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default: // today
                break;
        }

        // Fetch dashboard data
        const [stats, userCount] = await Promise.all([
            Dashboard.getStats(startDate),
            User.count()
        ]);

        const { 
            totalOrders, periodOrders, totalRevenue, periodRevenue, 
            orderStatusCounts, popularItems, dailyStats 
        } = stats;

        // Create PDF
        const doc = new PDFDocument();
        const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`;
        const filePath = path.join(__dirname, '../temp', filename);
        
        // Pipe PDF to file
        doc.pipe(fs.createWriteStream(filePath));
        
        // Add content to PDF
        doc.fontSize(20).text('Shawon Burger Shop - Dashboard Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Report Period: ${dateRange || 'Today'}`, { align: 'center' });
        doc.moveDown();
        
        // Overview section
        doc.fontSize(16).text('Overview');
        doc.moveDown();
        doc.fontSize(12).text(`Total Orders: ${totalOrders}`);
        doc.text(`Period Orders: ${periodOrders}`);
        doc.text(`Total Revenue: ৳${totalRevenue.toFixed(2)}`);
        doc.text(`Period Revenue: ৳${periodRevenue.toFixed(2)}`);
        doc.text(`Total Customers: ${userCount}`);
        doc.moveDown();
        
        // Order Status section
        doc.fontSize(16).text('Order Status Summary');
        doc.moveDown();
        for (const [status, count] of Object.entries(orderStatusCounts)) {
            doc.fontSize(12).text(`${status}: ${count}`);
        }
        doc.moveDown();
        
        // Popular Items section
        doc.fontSize(16).text('Popular Items');
        doc.moveDown();
        popularItems.forEach(item => {
            doc.fontSize(12).text(`${item._id}: ${item.count} orders (৳${item.revenue.toFixed(2)})`);
        });
        doc.moveDown();
        
        // Daily Statistics
        doc.fontSize(16).text('Daily Statistics');
        doc.moveDown();
        stats.dailyStats.forEach(day => {
            doc.fontSize(12).text(`${new Date(day._id).toLocaleDateString()}: ${day.orders} orders, ৳${day.revenue.toFixed(2)}`);
        });
        
        // Finalize PDF
        doc.end();
        
        // Send file
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            }
            // Clean up temp file
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error deleting temp file:', err);
            });
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get all orders (admin only)
router.get('/orders', auth, isAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const query = status && status !== 'all' ? { orderStatus: status } : {};
        
        const orders = await Order.find(query)
            .populate('user', 'name email phone')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await Order.countDocuments(query);
        
        res.json({
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update order status (admin only)
router.patch('/orders/:id/status', auth, isAdmin, async (req, res) => {
    try {
        const { orderStatus } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { orderStatus },
            { new: true }
        ).populate('user', 'name email phone');
        
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Menu Item Routes
// Get all menu items
router.get('/menu', auth, isAdmin, async (req, res) => {
    try {
        const items = await MenuItem.findAll();
        res.json({ menuItems: items });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add new menu item
router.post('/menu', auth, isAdmin, async (req, res) => {
    try {
        const menuItem = await MenuItem.create(req.body);
        res.status(201).json(menuItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update menu item
router.patch('/menu/:id', auth, isAdmin, async (req, res) => {
    try {
        const menuItem = await MenuItem.update(req.params.id, req.body);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(menuItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update stock status
router.patch('/menu/:id/stock', auth, isAdmin, async (req, res) => {
    try {
        const { inStock } = req.body;
        const menuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { inStock },
            { new: true }
        );
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(menuItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update price
router.patch('/menu/:id/price', auth, isAdmin, async (req, res) => {
    try {
        const { price } = req.body;
        const menuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { price },
            { new: true }
        );
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json(menuItem);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete menu item
router.delete('/menu/:id', auth, isAdmin, async (req, res) => {
    try {
        const menuItem = await MenuItem.delete(req.params.id);
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found' });
        }
        res.json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Combo Deals Routes
// Get all combo deals
router.get('/combos', auth, isAdmin, async (req, res) => {
    try {
        const combos = await ComboDeal.findAll();
        res.json({ combos });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add new combo deal
router.post('/combos', auth, isAdmin, async (req, res) => {
    try {
        const combo = await ComboDeal.create(req.body);
        res.status(201).json(combo);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update combo deal
router.patch('/combos/:id', auth, isAdmin, async (req, res) => {
    try {
        const combo = await ComboDeal.update(req.params.id, req.body);
        if (!combo) {
            return res.status(404).json({ error: 'Combo deal not found' });
        }
        res.json(combo);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete combo deal
router.delete('/combos/:id', auth, isAdmin, async (req, res) => {
    try {
        const combo = await ComboDeal.delete(req.params.id);
        if (!combo) {
            return res.status(404).json({ error: 'Combo deal not found' });
        }
        res.json({ message: 'Combo deal deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// User Management Routes
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const data = await User.findAll({ page, limit });
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
