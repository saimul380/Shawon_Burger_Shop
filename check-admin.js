const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shawon_burger_shop'
});

async function checkAdminUser() {
  try {
    const query = {
      text: 'SELECT id, name, email, role FROM users WHERE role = $1',
      values: ['admin']
    };
    
    const result = await pool.query(query);
    console.log('Admin users in database:');
    console.log(result.rows);
    
    if (result.rows.length === 0) {
      console.log('No admin users found in the database.');
    } else {
      console.log('Admin user found:');
      result.rows.forEach((user, index) => {
        console.log(`Admin #${index + 1}:`, user);
      });
    }
  } catch (error) {
    console.error('Error checking admin user:', error);
  } finally {
    await pool.end();
  }
}

checkAdminUser();
