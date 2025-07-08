const { pool } = require('../db/config');

const MenuItem = {
    async create(item) {
        const { name, description, price, category, image_url, available = true } = item;
        const result = await pool.query(
            `INSERT INTO menu_items (name, description, price, category, image_url, available)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, description, price, category, image_url, available]
        );
        return result.rows[0];
    },

    async findAll() {
        const result = await pool.query('SELECT * FROM menu_items ORDER BY category, name');
        return result.rows;
    },

    async findById(id) {
        const result = await pool.query('SELECT * FROM menu_items WHERE id = $1', [id]);
        return result.rows[0];
    },

    async update(id, updates) {
        const { name, description, price, category, image_url, available } = updates;
        const result = await pool.query(
            `UPDATE menu_items
             SET name = $1, description = $2, price = $3, category = $4, image_url = $5, available = $6
             WHERE id = $7
             RETURNING *`,
            [name, description, price, category, image_url, available, id]
        );
        return result.rows[0];
    },

    async delete(id) {
        const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
};

module.exports = MenuItem;
