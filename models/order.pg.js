const { pool } = require('../db/config');

const Order = {
    async create(userId, orderData) {
        const { items, totalAmount, deliveryAddress, paymentMethod, customerName, customerPhone, specialInstructions } = orderData;
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const orderRes = await client.query(
                `INSERT INTO orders (user_id, total_amount, delivery_address, payment_method, customer_name, customer_phone, special_instructions, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending') RETURNING id`,
                [userId, totalAmount, deliveryAddress, paymentMethod, customerName, customerPhone, specialInstructions]
            );
            const newOrderId = orderRes.rows[0].id;

            // Fetch menu_item_id for each item by name and insert into order_items
            for (const item of items) {
                const menuItemRes = await client.query('SELECT id FROM menu_items WHERE LOWER(name) = LOWER($1)', [item.name]);
                if (menuItemRes.rows.length === 0) {
                    throw new Error(`Menu item "${item.name}" not found.`);
                }
                const menuItemId = menuItemRes.rows[0].id;

                await client.query(
                    `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
                    [newOrderId, menuItemId, item.quantity, item.price]
                );
            }

            await client.query('COMMIT');
            return { id: newOrderId, ...orderData };
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Error creating order:', e);
            throw e;
        } finally {
            client.release();
        }
    },

    async findAll() {
        const result = await pool.query(`
            SELECT 
                o.*, 
                json_agg(json_build_object(
                    'name', mi.name, 
                    'quantity', oi.quantity, 
                    'price', oi.unit_price
                )) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN menu_items mi on oi.menu_item_id = mi.id
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `);
        return result.rows;
    },

    async findByUserId(userId) {
        const result = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return result.rows;
    },

    async findById(orderId, userId) {
        const result = await pool.query(`
            SELECT 
                o.*, 
                json_agg(json_build_object(
                    'menu_item_id', oi.menu_item_id, 
                    'name', mi.name, 
                    'quantity', oi.quantity, 
                    'price', oi.price
                )) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menu_items mi ON oi.menu_item_id = mi.id
            WHERE o.id = $1 AND o.user_id = $2
            GROUP BY o.id
        `, [orderId, userId]);
        return result.rows[0];
    },

    async updateStatus(orderId, status) {
        const result = await pool.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, orderId]
        );
        return result.rows[0];
    },

    async updateAfterPayment(orderId) {
        const result = await pool.query(
            `UPDATE orders 
             SET payment_status = 'Completed', order_status = 'Confirmed' 
             WHERE id = $1 RETURNING *`,
            [orderId]
        );
        return result.rows[0];
    }
};

module.exports = Order;
