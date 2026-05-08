// inject-aotd.js — sets Alumni of the Day in the database
require('dotenv').config();
const { pool } = require('./src/config/db');

(async () => {
  try {
    // Clear any existing featured
    await pool.query('UPDATE profiles SET is_featured_today = FALSE');

    // Set Priya Sharma as today's Alumni of the Day
    const [result] = await pool.query(
      `UPDATE profiles SET is_featured_today = TRUE, appearance_count = appearance_count + 1
       WHERE user_id = (SELECT id FROM users WHERE email = 'priya.sharma@westminster.ac.uk')`
    );

    if (result.affectedRows > 0) {
      console.log('Alumni of the Day set: Priya Sharma (priya.sharma@westminster.ac.uk)');
    } else {
      console.error('User not found — make sure seed.js has been run first.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
})();
