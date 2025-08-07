const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shawon_burger_shop',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const menuItems = [
    // Burgers
    { name: 'Classic Burger', price: 199, category: 'Burgers', description: 'Our signature beef patty with fresh lettuce, tomatoes, and special sauce.' },
    { name: 'Double Cheese Burger', price: 299, category: 'Burgers', description: 'Double cheese with caramelized onions and bacon.' },
    { name: 'Veggie Burger', price: 149, category: 'Burgers', description: 'Plant-based patty with fresh vegetables and vegan sauce.' },
    { name: 'BBQ Burger', price: 199, category: 'Burgers', description: 'Smoky BBQ sauce, crispy onion rings, and cheddar cheese.' },
    
    // Pizzas
    { name: 'Margherita Pizza', price: 599, category: 'Pizzas', description: 'Classic pizza with tomato sauce, mozzarella, and fresh basil.' },
    { name: 'Spinach & Feta Pizza', price: 649, category: 'Pizzas', description: 'Fresh spinach, feta cheese, and garlic on a thin crust.' },
    
    // Drinks
    { name: 'Coca-Cola', price: 60, category: 'Drinks', description: 'Refreshing cola drink.' },
    { name: 'Special Lassi', price: 120, category: 'Drinks', description: 'Creamy yogurt-based drink with special spices.' }
];

async function updateMenuItems() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // First, get all existing menu items
        const existingItems = await client.query('SELECT id, name FROM menu_items');
        const existingItemsMap = new Map(existingItems.rows.map(item => [item.name, item.id]));
        
        // Update or insert menu items
        for (const item of menuItems) {
            if (existingItemsMap.has(item.name)) {
                // Update existing item
                const result = await client.query(
                    `UPDATE menu_items 
                     SET price = $1, category = $2, description = $3
                     WHERE name = $4
                     RETURNING *`,
                    [item.price, item.category, item.description, item.name]
                );
                console.log(`Updated: ${item.name} (${item.category}) - ৳${item.price}`);
            } else {
                // Insert new item
                const result = await client.query(
                    `INSERT INTO menu_items (name, price, category, description)
                     VALUES ($1, $2, $3, $4)
                     RETURNING *`,
                    [item.name, item.price, item.category, item.description]
                );
                console.log(`Added: ${item.name} (${item.category}) - ৳${item.price}`);
            }
        }
        
        // Check for any items that exist in DB but not in our list
        const dbItemNames = new Set(existingItems.rows.map(item => item.name));
        const menuItemNames = new Set(menuItems.map(item => item.name));
        const itemsToRemove = [...dbItemNames].filter(name => !menuItemNames.has(name));
        
        if (itemsToRemove.length > 0) {
            console.log('\nThe following items exist in the database but not in the menu:');
            for (const name of itemsToRemove) {
                console.log(`- ${name} (not removed to preserve data integrity)`);
            }
            console.log('\nThese items were not removed to maintain data integrity.');
            console.log('If you want to remove them, please do so manually from the database.');
        }
        
        await client.query('COMMIT');
        console.log('\nMenu items synchronized successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating menu items:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the update
updateMenuItems();
