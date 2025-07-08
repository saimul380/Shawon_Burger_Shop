require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db/config');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    const client = await pool.connect();
    try {
        console.log('Starting database setup...');

        // --- Read and Execute Schema ---
        console.log('Reading schema.sql...');
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schemaSql);
        console.log('Schema applied successfully.');

        await client.query('BEGIN');

        // --- Create Admin User ---
        const adminEmail = 'admin@shawonburger.com';
        const adminPassword = await bcrypt.hash('admin123', 10);
        const adminRes = await client.query(
            `INSERT INTO users (name, email, password_hash, phone, address, role, verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role
             RETURNING id, email;`,
            ['Admin', adminEmail, adminPassword, '01234567890', 'Admin Address', 'admin', true]
        );
        console.log('Admin user created/updated:', adminRes.rows[0].email);

        // --- Create Sample Menu Items ---
        console.log('Inserting menu items...');
        const menuItems = [
            { name: 'Classic Burger', description: 'Juicy beef patty with fresh lettuce, tomato, and our special sauce', price: 250, category: 'Burgers', image_url: '/images/classic-burger.jpg' },
            { name: 'Chicken Supreme', description: 'Crispy chicken fillet with cheese and mayo', price: 280, category: 'Burgers', image_url: '/images/chicken-supreme.jpg' },
            { name: 'Veggie Burger', description: 'A delicious veggie patty with all the fixings', price: 220, category: 'Burgers', image_url: '/images/veggie-burger.jpg' },
            { name: 'French Fries', description: 'Golden crispy french fries', price: 120, category: 'Sides', image_url: '/images/fries.jpg' },
            { name: 'Coca Cola', description: 'Chilled soft drink', price: 60, category: 'Drinks', image_url: '/images/coke.jpg' }
        ];

        const menuItemIds = {};
        for (const item of menuItems) {
            const res = await client.query(
                `INSERT INTO menu_items (name, description, price, category, image_url, available)
                 VALUES ($1, $2, $3, $4, $5, true)
                 ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price
                 RETURNING id, name;`,
                [item.name, item.description, item.price, item.category, item.image_url]
            );
            menuItemIds[res.rows[0].name] = res.rows[0].id;
        }
        console.log('Menu items inserted/updated.');

        // --- Create Sample Combo Deals ---
        console.log('Inserting combo deals...');
        const comboDeals = [
            {
                name: 'Burger Combo',
                description: '1 Classic Burger, 1 French Fries, 1 Coca Cola',
                price: 399,
                items: [
                    { name: 'Classic Burger', quantity: 1 },
                    { name: 'French Fries', quantity: 1 },
                    { name: 'Coca Cola', quantity: 1 }
                ]
            },
            {
                name: 'Family Feast',
                description: '2 Classic Burgers, 2 Chicken Supreme, 2 Large Fries',
                price: 999,
                items: [
                    { name: 'Classic Burger', quantity: 2 },
                    { name: 'Chicken Supreme', quantity: 2 },
                    { name: 'French Fries', quantity: 2 }
                ]
            }
        ];

        for (const deal of comboDeals) {
            const dealRes = await client.query(
                `INSERT INTO combo_deals (name, description, price, available)
                 VALUES ($1, $2, $3, true)
                 ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price
                 RETURNING id;`,
                [deal.name, deal.description, deal.price]
            );
            const comboDealId = dealRes.rows[0].id;

            // Clear old items for this deal to prevent duplicates on re-run
            await client.query('DELETE FROM combo_deal_items WHERE combo_deal_id = $1', [comboDealId]);

            for (const item of deal.items) {
                const menuItemId = menuItemIds[item.name];
                if (menuItemId) {
                    await client.query(
                        `INSERT INTO combo_deal_items (combo_deal_id, menu_item_id, quantity)
                         VALUES ($1, $2, $3);`,
                        [comboDealId, menuItemId, item.quantity]
                    );
                }
            }
        }
        console.log('Combo deals inserted/updated.');

        await client.query('COMMIT');
        console.log('✅ Database setup completed successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error setting up database:', error);
        process.exit(1);
    } finally {
        client.release();
        console.log('Database connection closed.');
    }
}

setupDatabase().then(() => {
    pool.end(); // Close all connections in the pool
});
