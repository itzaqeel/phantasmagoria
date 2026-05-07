const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'phantasmagoria - General Platform', '.env') });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    // MySQL 8.0.19+ supports IF NOT EXISTS for ADD COLUMN
    // For older versions, we check if it exists first
    const [columns] = await connection.execute('SHOW COLUMNS FROM api_tokens LIKE "permissions"');
    
    if (columns.length === 0) {
      await connection.execute('ALTER TABLE api_tokens ADD COLUMN permissions JSON COMMENT "Scoped permissions like [\\"read:alumni\\"]"');
      console.log('Successfully added permissions column to api_tokens');
    } else {
      console.log('permissions column already exists, skipping.');
    }

  } catch (err) {
    console.error('Error during database migration:', err);
  } finally {
    await connection.end();
  }
}

run();
