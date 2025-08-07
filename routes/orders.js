const express = require('express');
const router = express.Router();
const Order = require('../models/order.pg.js');
const { auth, admin } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create new order
router.post('/', auth, async (req, res) => {
    console.log('Received new order request at /api/orders');
    console.log('Authenticated User:', req.user);
    console.log('Request Body:', req.body);
    
    // Validate required fields
    const { items, totalAmount, deliveryAddress, paymentMethod, customerName, customerPhone } = req.body;
    
    // Input validation
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Your cart is empty. Please add items before placing an order.' 
        });
    }
    
    const requiredFields = { totalAmount, deliveryAddress, paymentMethod, customerName, customerPhone };
    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
        
    if (missingFields.length > 0) {
        return res.status(400).json({
            success: false,
            error: `Missing required fields: ${missingFields.join(', ')}`
        });
    }
    
    try {
        // Create the order
        const orderData = {
            items: items.map(item => ({
                name: item.name,
                price: parseFloat(item.price),
                quantity: parseInt(item.quantity, 10)
            })),
            totalAmount: parseFloat(totalAmount),
            deliveryAddress: deliveryAddress.trim(),
            paymentMethod: paymentMethod.trim(),
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            specialInstructions: (req.body.specialInstructions || '').trim()
        };
        
        console.log('Creating order with data:', orderData);
        const newOrder = await Order.create(req.user.id, orderData);
        
        if (!newOrder || !newOrder.id) {
            throw new Error('Failed to create order: Invalid response from database');
        }
        
        console.log('Order created successfully:', newOrder);
        
        // Emit real-time update to admin panel
        if (req.app.get('io')) {
            req.app.get('io').emit('newOrder', newOrder);
        }
        
        res.status(201).json({
            success: true,
            message: 'Order placed successfully!',
            order: newOrder
        });
        
    } catch (error) {
        console.error('Order creation failed:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ 
            success: false,
            error: error.message || 'Failed to process your order. Please try again.'
        });
    }
});

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
    try {
        const orders = await Order.findByUserId(req.user.id);
        res.json(orders);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id, req.user.id);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update payment status (webhook endpoint for Stripe)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

        if (event.type === 'payment_intent.succeeded') {
            const orderId = event.data.object.metadata.orderId;
            await Order.updateAfterPayment(orderId);
        }

        res.json({ received: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Admin: Update order status
router.put('/:id/status', auth, admin, async (req, res) => {
    try {
        const { status, payment_completed } = req.body;
        const orderId = req.params.id;
        const userId = req.user.id;
        
        // Validate status
        const validStatuses = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid status' 
            });
        }

        // Get the current order first
        const currentOrder = await Order.findById(orderId);
        if (!currentOrder) {
            return res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
        }
        
        // Update order status
        const updatedOrder = await Order.updateStatus(orderId, userId, status);
        
        // Handle payment status if marking as delivered
        if (status === 'delivered') {
            if (payment_completed) {
                await Order.updatePaymentStatus(orderId, 'completed');
                updatedOrder.payment_status = 'completed';
                
                // If payment method was cash on delivery, we can consider it paid now
                if (currentOrder.payment_method === 'cash_on_delivery') {
                    await Order.updatePaymentStatus(orderId, 'completed');
                    updatedOrder.payment_status = 'completed';
                }
            } else if (currentOrder.payment_method === 'cash_on_delivery') {
                // If cash on delivery and payment not completed, mark as pending
                await Order.updatePaymentStatus(orderId, 'pending');
                updatedOrder.payment_status = 'pending';
            }
            // );
        }

        // If order is cancelled, update cancelled_at
        if (status === 'cancelled') {
            order.cancelled_at = new Date();
            order.cancelled_by = userId;
        }

        await order.save();

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order
        });

    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update order status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
