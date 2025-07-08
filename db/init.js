require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Create a temporary pool for initialization
const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    password: process.env.PGPASSWORD || 'postgres',
    port: parseInt(process.env.PGPORT || '5432')
});

async function initializeDatabase() {
    try {
        // Create database if it doesn't exist
        const dbName = process.env.PGDATABASE || 'burger_shop';
        await pool.query(`
            SELECT 'CREATE DATABASE ${dbName}'
            WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${dbName}')
        `);
        console.log(`Database ${dbName} is ready`);

        // Connect to the burger_shop database
        const appPool = new Pool({
            user: process.env.PGUSER || 'postgres',
            host: process.env.PGHOST || 'localhost',
            database: dbName,
            password: process.env.PGPASSWORD || 'postgres',
            port: parseInt(process.env.PGPORT || '5432')
        });

        // Read and execute schema.sql
        const schemaSQL = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
        await appPool.query(schemaSQL);
        console.log('Database schema created successfully');

        // Create admin user if not exists
        await appPool.query(`
            INSERT INTO users (name, email, password_hash, phone, address, role, verified)
            VALUES (
                'Admin',
                'admin@shawonburger.com',
                '$2a$10$XgXB8bi4Qi4pYYmP8Q5ZKuGz6JqZZ4Q4h4X4X4X4X4X4X4X4X4X4X',
                '1234567890',
                'Admin Address',
                'admin',
                true
            )
            ON CONFLICT (email) DO NOTHING
        `);
        console.log('Admin user created successfully');

        await appPool.end();
        console.log('Database initialization completed');
    } catch (error) {
        console.error('Database initialization failed:', error);
    } finally {
        await pool.end();
    }
}

initializeDatabase();