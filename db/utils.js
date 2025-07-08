const { pool, getClient } = require('./config');

// Generic query executor with error handling
async function executeQuery(query, params = []) {
    const client = await getClient();
    try {
        const result = await client.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw new Error(`Database operation failed: ${error.message}`);
    } finally {
        client.release();
    }
}

// Transaction executor
async function executeTransaction(queries) {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const results = [];
        
        for (const { query, params } of queries) {
            const result = await client.query(query, params);
            results.push(result.rows);
        }
        
        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transaction error:', error);
        throw new Error(`Transaction failed: ${error.message}`);
    } finally {
        client.release();
    }
}

// Common database operations
const dbOperations = {
    // User operations
    async createUser(userData) {
        const query = `
            INSERT INTO users (name, email, password_hash, phone, address, role)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, email, role
        `;
        return executeQuery(query, [
            userData.name,
            userData.email,
            userData.password_hash,
            userData.phone,
            userData.address,
            userData.role || 'user'
        ]);
    },

    async updateUserOTP(userId, otpCode, otpExpiry) {
        const query = `
            UPDATE users
            SET otp_code = $2, otp_expiry = $3
            WHERE id = $1
            RETURNING id
        `;
        return executeQuery(query, [userId, otpCode, otpExpiry]);
    },

    async verifyUser(userId) {
        const query = `
            UPDATE users
            SET verified = true, otp_code = NULL, otp_expiry = NULL
            WHERE id = $1
            RETURNING id, verified
        `;
        return executeQuery(query, [userId]);
    },

    // Menu operations
    async getMenuItems(category = null) {
        const query = category
            ? 'SELECT * FROM menu_items WHERE category = $1 AND available = true'
            : 'SELECT * FROM menu_items WHERE available = true';
        return executeQuery(query, category ? [category] : []);
    },

    // Order operations
    async createOrder(orderData) {
        const queries = [
            {
                query: `
                    INSERT INTO orders (user_id, total_amount, delivery_fee, delivery_address, payment_method)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id
                `,
                params: [
                    orderData.userId,
                    orderData.totalAmount,
                    orderData.deliveryFee,
                    orderData.deliveryAddress,
                    orderData.paymentMethod
                ]
            }
        ];

        // Add order items
        orderData.items.forEach(item => {
            queries.push({
                query: `
                    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
                    VALUES ($1, $2, $3, $4)
                `,
                params: ['$1', item.menuItemId, item.quantity, item.price]
            });
        });

        return executeTransaction(queries);
    },

    // Review operations
    async createReview(reviewData) {
        const query = `
            INSERT INTO reviews (user_id, menu_item_id, rating, comment)
            VALUES ($1, $2, $3, $4)
            RETURNING id, rating, comment, created_at
        `;
        return executeQuery(query, [
            reviewData.userId,
            reviewData.menuItemId,
            reviewData.rating,
            reviewData.comment
        ]);
    },

    // Combo deal operations
    async getComboDeals() {
        const query = `
            SELECT cd.*, array_agg(json_build_object(
                'menu_item_id', mi.id,
                'name', mi.name,
                'quantity', cdi.quantity
            )) as items
            FROM combo_deals cd
            JOIN combo_deal_items cdi ON cd.id = cdi.combo_deal_id
            JOIN menu_items mi ON cdi.menu_item_id = mi.id
            WHERE cd.available = true
            GROUP BY cd.id
        `;
        return executeQuery(query);
    }
};

module.exports = {
    executeQuery,
    executeTransaction,
    dbOperations
};