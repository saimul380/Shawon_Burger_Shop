const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://shawon_burger_db1_user:aFMqN3VmCqP3Pn5UiiaFqH849aYlKkXY@dpg-d2adta3e5dus73co9ra0-a.singapore-postgres.render.com/shawon_burger_db1',
  ssl: { rejectUnauthorized: false }
});

async function verifyAdmin() {
  const client = await pool.connect();
  try {
    // Check admin user
    const res = await client.query(`
      SELECT id, name, email, role, verified, 
             LENGTH(password_hash) as hash_length,
             password_hash LIKE '$2a$%' as is_bcrypt
      FROM users 
      WHERE email = 'admin@shawonburger.com'
    `);
    
    console.log('Admin user details:');
    console.table(res.rows);
    
    if (res.rows.length === 0) {
      console.log('❌ No admin user found');
    } else {
      const admin = res.rows[0];
      console.log('\nVerification:');
      console.log(`- Role is admin: ${admin.role === 'admin' ? '✅' : '❌'}`);
      console.log(`- Verified: ${admin.verified ? '✅' : '❌'}`);
      console.log(`- Has password hash: ${admin.hash_length > 0 ? '✅' : '❌'}`);
      console.log(`- Using bcrypt: ${admin.is_bcrypt ? '✅' : '❌'}`);
      
      if (!admin.is_bcrypt) {
        console.log('\n⚠️  Warning: Password is not properly hashed with bcrypt');
        console.log('   This is likely causing the login issues.');
      }
    }
    
    // Check JWT secret in environment
    console.log('\nEnvironment Variables:');
    console.log('- JWT_SECRET is set:', process.env.JWT_SECRET ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.release();
    await pool.end();
  }
}

verifyAdmin();
