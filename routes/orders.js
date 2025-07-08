const express = require('express');
const router = express.Router();
const Order = require('../models/order.pg.js');
const { auth } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create new order
router.post('/', auth, async (req, res) => {
    console.log('Received new order request at /api/orders');
    console.log('Authenticated User:', req.user); // Log the user from the auth middleware
    console.log('Request Body:', req.body); // Log the order details from the frontend
    try {
        // The frontend sends the full cart and customer details
        const { items, totalAmount, deliveryAddress, paymentMethod, customerName, customerPhone, specialInstructions } = req.body;

        // Ensure the payload matches what Order.create expects, especially the items array.
        const orderPayload = {
            userId: req.user.id,
            items: items, // Assuming 'items' is already in the correct format [{ name, quantity, price }]
            totalAmount: totalAmount,
            deliveryAddress: deliveryAddress,
            customerName: customerName,
            customerPhone: customerPhone,
            paymentMethod: paymentMethod,
            specialInstructions: specialInstructions,
            status: 'Pending' // Set a default status
        };

        const newOrder = await Order.create(orderPayload);

        // The payment processing logic can be simplified for now
        // to ensure the order creation works first.
        res.status(201).json(newOrder);

    } catch (error) {
        console.error('Order creation failed:', error);
        res.status(400).json({ error: 'Failed to create order.' });
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

module.exports = router;
