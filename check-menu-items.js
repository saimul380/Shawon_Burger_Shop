const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://shawon_burger_db1_user:aFMqN3VmCqP3Pn5UiiaFqH849aYlKkXY@dpg-d2adta3e5dus73co9ra0-a.singapore-postgres.render.com/shawon_burger_db1',
  ssl: { rejectUnauthorized: false }
});

async function checkAndAddMenuItems() {
  const client = await pool.connect();
  try {
    // Check existing menu items
    const res = await client.query('SELECT id, name, price FROM menu_items');
    console.log('Current menu items:');
    console.table(res.rows);

    // Add missing items if needed
    const menuItems = [
      { name: 'Classic Burger', price: 199, description: 'Juicy beef patty with fresh veggies' },
      { name: 'Veggie Burger', price: 149, description: 'Delicious plant-based patty' },
      { name: 'Cheeseburger', price: 219, description: 'Classic with American cheese' },
      { name: 'Bacon Burger', price: 249, description: 'Classic with crispy bacon' },
      { name: 'Chicken Burger', price: 179, description: 'Grilled chicken with special sauce' }
    ];

    for (const item of menuItems) {
      const exists = res.rows.some(row => row.name === item.name);
      if (!exists) {
        await client.query(`
          INSERT INTO menu_items (name, price, description, category, image_url)
          VALUES ($1, $2, $3, 'Burgers', '/images/burger.jpg')
        `, [item.name, item.price, item.description]);
        console.log(`✅ Added: ${item.name}`);
      } else {
        console.log(`ℹ️  Exists: ${item.name}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

checkAndAddMenuItems();
