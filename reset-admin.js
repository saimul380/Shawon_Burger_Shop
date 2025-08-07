const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://shawon_burger_db1_user:aFMqN3VmCqP3Pn5UiiaFqH849aYlKkXY@dpg-d2adta3e5dus73co9ra0-a.singapore-postgres.render.com/shawon_burger_db1',
  ssl: { rejectUnauthorized: false }
});

async function resetAdmin() {
  const client = await pool.connect();
  try {
    // Generate a new password hash
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    // Update admin user
    await client.query(`
      UPDATE users 
      SET password_hash = $1, 
          role = 'admin', 
          verified = true 
      WHERE email = 'admin@shawonburger.com'
    `, [passwordHash]);

    // Verify the update
    const res = await client.query(`
      SELECT id, name, email, role, verified 
      FROM users 
      WHERE email = 'admin@shawonburger.com'
    `);
    
    console.log('✅ Admin user updated:');
    console.table(res.rows);
    
    if (res.rows.length === 0) {
      console.log('\n⚠️  No admin user found. Creating one...');
      await client.query(`
        INSERT INTO users (name, email, password_hash, phone, address, role, verified)
        VALUES ($1, $2, $3, $4, $5, 'admin', true)
      `, [
        'Admin User',
        'admin@shawonburger.com',
        passwordHash,
        '1234567890',
        '123 Admin St'
      ]);
      console.log('✅ Admin user created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

resetAdmin();
