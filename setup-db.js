const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://shawon_burger_db1_user:aFMqN3VmCqP3Pn5UiiaFqH849aYlKkXY@dpg-d2adta3e5dus73co9ra0-a.singapore-postgres.render.com/shawon_burger_db1',
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  const client = await pool.connect().catch(err => {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  });
  
  try {
    console.log('🔌 Connected to database');
    
    // Read and execute schema
    console.log('📄 Reading schema file...');
    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    console.log('🚀 Executing schema...');
    await client.query(schema);
    console.log('✅ Database schema created successfully!');

    // Add admin user
    await pool.query(`
      INSERT INTO users (name, email, password_hash, phone, address, role, verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO NOTHING
    `, [
      'Admin User',
      'admin@shawonburger.com',
      '$2a$10$XFDq3wLx.s4Ww5U5D5X0Oe3v6Q1VY9XxY9XxY9XxY9XxY9XxY9XxY9', // password: admin123
      '1234567890',
      '123 Admin St',
      'admin',
      true
    ]);
    console.log('👑 Admin user created (email: admin@shawonburger.com, password: admin123)');

  } catch (error) {
    console.error('❌ Error setting up database:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    if (error.position) {
      console.error('Error position:', error.position);
    }
  } finally {
    console.log('🔌 Closing database connection...');
    await client.release();
    await pool.end();
  }
}

setupDatabase();
