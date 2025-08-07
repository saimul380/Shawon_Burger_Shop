const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shawon_burger_shop'
});

const menuItems = [
  // Burgers
  { name: 'Classic Burger', price: 199, category: 'Burgers' },
  { name: 'Double Cheese Burger', price: 299, category: 'Burgers' },
  { name: 'Veggie Burger', price: 149, category: 'Burgers' },
  { name: 'BBQ Burger', price: 199, category: 'Burgers' },
  { name: 'BBQ Chicken Burger', price: 189, category: 'Burgers' },
  
  // Pizzas
  { name: 'Margherita Pizza', price: 349, category: 'Pizzas' },
  { name: 'Pepperoni Supreme', price: 399, category: 'Pizzas' },
  { name: 'BBQ Chicken Pizza', price: 399, category: 'Pizzas' },
  { name: 'Vegetarian Delight', price: 299, category: 'Pizzas' },
  { name: 'Meat Lovers', price: 349, category: 'Pizzas' },
  { name: 'Hawaiian Paradise', price: 329, category: 'Pizzas' },
  { name: 'Buffalo Chicken', price: 349, category: 'Pizzas' },
  { name: 'Spinach & Feta', price: 329, category: 'Pizzas' },
  { name: 'Supreme', price: 379, category: 'Pizzas' },
  { name: 'Pesto Chicken', price: 349, category: 'Pizzas' },
  
  // Drinks
  { name: 'Coca-Cola', price: 25, category: 'Drinks' },
  { name: "Shawon's JuiceCola", price: 35, category: 'Drinks' },
  { name: 'Fresh Orange Juice', price: 90, category: 'Drinks' },
  { name: 'Watermelon Juice', price: 80, category: 'Drinks' },
  { name: 'Pistachio Special', price: 150, category: 'Drinks' },
  { name: 'Special Lassi', price: 100, category: 'Drinks' }
];

async function updateMenuItems() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Update existing items and insert new ones
    for (const item of menuItems) {
      await client.query(
        `INSERT INTO menu_items (name, price, category) 
         VALUES ($1, $2, $3)
         ON CONFLICT (name) 
         DO UPDATE SET price = $2, category = $3`,
        [item.name, item.price, item.category]
      );
    }
    
    await client.query('COMMIT');
    console.log('Menu items updated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating menu items:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateMenuItems().catch(console.error);
