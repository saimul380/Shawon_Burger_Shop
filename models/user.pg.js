const bcrypt = require('bcryptjs');
const { pool } = require('../db/config');

// User Data Access Layer for PostgreSQL
const User = {
  async create({ name, email, password, phone, address, role = 'user' }) {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, address, role, verified)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [name, email, password_hash, phone, address, role]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async updateVerification(id, verified) {
    const result = await pool.query('UPDATE users SET verified = $1 WHERE id = $2 RETURNING *', [verified, id]);
    return result.rows[0];
  },

  async updateOTP(id, otp_code, otp_expiry) {
    const result = await pool.query('UPDATE users SET otp_code = $1, otp_expiry = $2 WHERE id = $3 RETURNING *', [otp_code, otp_expiry, id]);
    return result.rows[0];
  },

  async updateProfile(id, updates) {
    // Only allow name, phone, address
    const { name, phone, address } = updates;
    const result = await pool.query(
      'UPDATE users SET name = $1, phone = $2, address = $3 WHERE id = $4 RETURNING *',
      [name, phone, address, id]
    );
    return result.rows[0];
  },

  async comparePassword(user, candidatePassword) {
    try {
      // Ensure we have a user and a password hash to compare against
      if (!user || !user.password_hash) {
        console.error('comparePassword error: User object or password_hash is missing.');
        return false;
      }
      // Ensure the candidate password is a string
      if (typeof candidatePassword !== 'string') {
        console.error('comparePassword error: Candidate password is not a string.');
        return false;
      }

      return await bcrypt.compare(candidatePassword, user.password_hash);

    } catch (error) {
      console.error('Error during bcrypt comparison:', error);
      return false; // Return false on error instead of crashing
    }
  },

  async setPassword(id, password) {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id', [password_hash, id]);
    return result.rows[0];
  },

  async findAll({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const usersResult = await pool.query(
      `SELECT id, name, email, phone, address, role, verified, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const totalResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(totalResult.rows[0].count, 10);

    return {
      users: usersResult.rows,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page, 10)
    };
  }
};

module.exports = User;
