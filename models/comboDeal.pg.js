const { pool } = require('../db/config');

const ComboDeal = {
    async create(deal) {
        const { name, description, price, available = true, items } = deal;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const dealRes = await client.query(
                `INSERT INTO combo_deals (name, description, price, available)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [name, description, price, available]
            );
            const newDeal = dealRes.rows[0];

            if (items && items.length > 0) {
                for (const item of items) {
                    await client.query(
                        `INSERT INTO combo_deal_items (combo_deal_id, menu_item_id, quantity)
                         VALUES ($1, $2, $3)`,
                        [newDeal.id, item.menu_item_id, item.quantity]
                    );
                }
            }

            await client.query('COMMIT');
            return newDeal;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async findAll() {
        const result = await pool.query(`
            SELECT
                cd.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'menu_item_id', mi.id,
                            'name', mi.name,
                            'quantity', cdi.quantity
                        )
                    ) FILTER (WHERE mi.id IS NOT NULL), '[]'
                ) as items
            FROM combo_deals cd
            LEFT JOIN combo_deal_items cdi ON cd.id = cdi.combo_deal_id
            LEFT JOIN menu_items mi ON cdi.menu_item_id = mi.id
            GROUP BY cd.id
            ORDER BY cd.created_at DESC
        `);
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query('SELECT * FROM combo_deals WHERE id = $1', [id]);
        return result.rows[0];
    },

    async update(id, updates) {
        const { name, description, price, available } = updates;
        const result = await pool.query(
            `UPDATE combo_deals
             SET name = $1, description = $2, price = $3, available = $4
             WHERE id = $5
             RETURNING *`,
            [name, description, price, available, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        const result = await pool.query('DELETE FROM combo_deals WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
};

module.exports = ComboDeal;
