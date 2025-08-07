const { Pool } = require('pg');
require('dotenv').config();
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shawon_burger_shop',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const ADMIN_EMAIL = 'admin@shawonburger.com';
const ADMIN_PASSWORD = 'admin123';

async function checkAndCreateAdmin() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Check if admin exists
        const result = await client.query('SELECT * FROM users WHERE email = $1', [ADMIN_EMAIL]);
        
        if (result.rows.length === 0) {
            // Admin doesn't exist, create one
            console.log('Admin user not found. Creating admin user...');
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            
            await client.query(
                `INSERT INTO users (name, email, password_hash, role, phone, address, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                ['Admin User', ADMIN_EMAIL, hashedPassword, 'admin', '1234567890', 'Admin Address']
            );
            
            console.log('Admin user created successfully!');
            console.log(`Email: ${ADMIN_EMAIL}`);
            console.log('Password: admin123');
        } else {
            console.log('Admin user already exists:');
            console.log(`Email: ${result.rows[0].email}`);
            console.log(`Role: ${result.rows[0].role}`);
            
            // Update password if needed
            const isMatch = await bcrypt.compare(ADMIN_PASSWORD, result.rows[0].password_hash);
            if (!isMatch) {
                const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
                await client.query(
                    'UPDATE users SET password_hash = $1 WHERE email = $2',
                    [hashedPassword, ADMIN_EMAIL]
                );
                console.log('Admin password has been reset to: admin123');
            }
        }
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error checking/creating admin user:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkAndCreateAdmin();
