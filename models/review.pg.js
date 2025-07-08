const { pool } = require('../db/config');

const Review = {
    async create({ user_id, order_id, rating, comment, images }) {
        const result = await pool.query(
            `INSERT INTO reviews (user_id, order_id, rating, comment, images)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [user_id, order_id, rating, comment, JSON.stringify(images)]
        );
        return result.rows[0];
    },

    async findByOrderId(orderId) {
        const result = await pool.query(
            `SELECT r.*, u.name as user_name 
             FROM reviews r JOIN users u ON r.user_id = u.id 
             WHERE r.order_id = $1 ORDER BY r.created_at DESC`,
            [orderId]
        );
        return result.rows;
    },

    async findUserReviewForOrder(userId, orderId) {
        const result = await pool.query(
            'SELECT * FROM reviews WHERE user_id = $1 AND order_id = $2',
            [userId, orderId]
        );
        return result.rows[0];
    },

    async update({ id, user_id, rating, comment, images }) {
        const result = await pool.query(
            `UPDATE reviews SET rating = $1, comment = $2, images = $3
             WHERE id = $4 AND user_id = $5
             RETURNING *`,
            [rating, comment, JSON.stringify(images), id, user_id]
        );
        return result.rows[0];
    },

    async addAdminResponse({ reviewId, adminId, responseText }) {
        const result = await pool.query(
            `UPDATE reviews 
             SET admin_response_text = $1, admin_responded_by_id = $2, admin_response_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING *`,
            [responseText, adminId, reviewId]
        );
        return result.rows[0];
    },

    async delete(id) {
        return await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING *', [id]);
    },

    async findAllAdmin({ rating, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        let whereClause = '';
        const queryParams = [limit, offset];

        if (rating && rating !== 'all') {
            whereClause = 'WHERE r.rating = $3';
            queryParams.push(parseInt(rating, 10));
        }

        const reviewsQuery = `
            SELECT r.*, u.name as user_name, u.email, o.id as order_id
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN orders o ON r.order_id = o.id
            ${whereClause}
            ORDER BY r.created_at DESC
            LIMIT $1 OFFSET $2`;

        const totalQuery = `SELECT COUNT(*) FROM reviews r ${whereClause}`;

        const reviewsResult = await pool.query(reviewsQuery, queryParams);
        const totalResult = await pool.query(totalQuery, rating ? [queryParams[2]] : []);

        return {
            reviews: reviewsResult.rows,
            total: parseInt(totalResult.rows[0].count, 10)
        };
    },

    async getStats() {
        const statsQuery = `
            SELECT
                AVG(rating) as "averageRating",
                COUNT(*) as "totalReviews",
                json_object_agg(rating, count) as "ratingCounts"
            FROM (
                SELECT rating, COUNT(*) as count
                FROM reviews
                GROUP BY rating
            ) as rating_counts`;

        const result = await pool.query(statsQuery);
        const stats = result.rows[0];

        // Ensure structure matches what frontend expects
        const ratingCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        if (stats.ratingCounts) {
            for (const key in stats.ratingCounts) {
                ratingCounts[key] = stats.ratingCounts[key];
            }
        }

        return {
            averageRating: parseFloat(stats.averageRating) || 0,
            totalReviews: parseInt(stats.totalReviews) || 0,
            ratingCounts
        };
    }
};

module.exports = Review;
