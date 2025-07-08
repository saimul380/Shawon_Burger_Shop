const express = require('express');
const router = express.Router();
const Review = require('../models/review.pg.js');
const { auth, isAdmin } = require('../middleware/auth');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

// Get all reviews (admin)
router.get('/admin/reviews', auth, isAdmin, async (req, res) => {
    try {
        const { rating, page = 1, limit = 10 } = req.query;
        const [{ reviews, total }, stats] = await Promise.all([
            Review.findAllAdmin({ rating, page, limit }),
            Review.getStats()
        ]);

        res.json({
            reviews,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            stats
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Respond to a review (admin)
router.post('/admin/reviews/:id/respond', auth, isAdmin, async (req, res) => {
    try {
        const { text } = req.body;
        const review = await Review.addAdminResponse({
            reviewId: req.params.id,
            adminId: req.user.id,
            responseText: text
        });

        if (!review) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json(review);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete a review (admin)
router.delete('/admin/reviews/:id', auth, isAdmin, async (req, res) => {
    try {
        const result = await Review.delete(req.params.id);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Export reviews to CSV (admin)
router.get('/admin/reviews/export', auth, isAdmin, async (req, res) => {
    try {
        // Fetch all reviews for export
        const { reviews } = await Review.findAllAdmin({ limit: 10000, page: 1 }); // High limit to get all

        const filePath = path.join(__dirname, '../temp/reviews-export.csv');
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'date', title: 'Date' },
                { id: 'customerName', title: 'Customer Name' },
                { id: 'customerEmail', title: 'Customer Email' },
                { id: 'orderId', title: 'Order ID' },
                { id: 'rating', title: 'Rating' },
                { id: 'comment', title: 'Comment' },
                { id: 'adminResponse', title: 'Admin Response' },
                { id: 'responseDate', title: 'Response Date' }
            ]
        });

        const records = reviews.map(review => ({
            date: new Date(review.created_at).toLocaleDateString(),
            customerName: review.user_name,
            customerEmail: review.email,
            orderId: review.order_id,
            rating: review.rating,
            comment: review.comment,
            adminResponse: review.admin_response_text || '',
            responseDate: review.admin_response_at ? new Date(review.admin_response_at).toLocaleDateString() : ''
        }));

        await csvWriter.writeRecords(records);

        res.download(filePath, 'reviews-export.csv', (err) => {
            if (err) console.error('Error downloading file:', err);
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error('Error deleting temporary file:', unlinkErr);
            });
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get reviews for a specific order
router.get('/orders/:orderId/reviews', auth, async (req, res) => {
    try {
        const reviews = await Review.findByOrderId(req.params.orderId);
        res.json(reviews);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add a review for an order
router.post('/orders/:orderId/reviews', auth, async (req, res) => {
    try {
        const { rating, comment, images } = req.body;
        const orderId = req.params.orderId;

        const existingReview = await Review.findUserReviewForOrder(req.user.id, orderId);
        if (existingReview) {
            return res.status(400).json({ error: 'You have already reviewed this order' });
        }

        const newReview = await Review.create({
            user_id: req.user.id,
            order_id: orderId,
            rating,
            comment,
            images: images || []
        });

        res.status(201).json(newReview);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update a review
router.patch('/reviews/:id', auth, async (req, res) => {
    try {
        const { rating, comment, images } = req.body;
        
        // First, fetch the review to check ownership and creation date
        const existingResult = await pool.query('SELECT * FROM reviews WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        const existingReview = existingResult.rows[0];

        if (!existingReview) {
            return res.status(404).json({ error: 'Review not found or you do not have permission to edit it' });
        }

        const hoursSincePosted = (Date.now() - new Date(existingReview.created_at).getTime()) / (1000 * 60 * 60);
        if (hoursSincePosted > 24) {
            return res.status(400).json({ error: 'Reviews can only be updated within 24 hours of posting' });
        }

        const updatedReview = await Review.update({
            id: req.params.id,
            user_id: req.user.id,
            rating: rating || existingReview.rating,
            comment: comment || existingReview.comment,
            images: images || existingReview.images
        });

        res.json(updatedReview);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
