const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shawon_burger_shop',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function listMenuItems() {
    try {
        const result = await pool.query('SELECT id, name, price FROM menu_items ORDER BY name');
        console.log('Available Menu Items:');
        console.table(result.rows);
    } catch (error) {
        console.error('Error fetching menu items:', error);
    } finally {
        await pool.end();
    }
}

listMenuItems();
