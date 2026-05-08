// src/security/auth.js
// JWT Authentication Logic
// High-security token-based access control

const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

/**
 * Security Guard: Verify JWT Bearer Token
 * Attach the decoded user to req.user so controllers can use it
 * Usage: add to any protected route
 */
async function verifyToken(req, res, next) {
  // Extract token from Authorization header
  // Format: "Authorization: Bearer <token>"
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. No token provided.' 
    });
  }

  const token = authHeader.split(' ')[1]; // Get the token part after "Bearer "

  try {
    // Verify the token using our JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check user still exists in DB (token could be valid but user deleted)
    const [rows] = await pool.query('SELECT id, email, role, is_verified FROM users WHERE id = ?', [decoded.id]);

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User no longer exists.' });
    }

    // Attach user info to request for use in controllers
    req.user = rows[0];
    next(); // Pass control to next system layer or route handler

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

/**
 * Security Guard: Validate API Bearer Token (for external clients like the AR app or Dashboard)
 * 
 * ALGORITHM:
 * 1. Extract the raw Bearer token from the 'Authorization' header.
 * 2. Hash the raw token using SHA-256 (matching the storage mechanism in adminController.js).
 *    -> This ensures that even if the database is compromised, the raw tokens remain secure.
 * 3. Query the `api_tokens` table for a matching hash that has NOT been revoked.
 * 4. Log the usage (endpoint and IP) to `token_logs` for audit trails and security monitoring.
 * 5. Update the `last_used_at` timestamp for active session tracking.
 * 6. Inject the token metadata (including permissions) into `req.apiToken` for downstream middleware.
 */
async function verifyApiToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'API token required.' });
  }

  const rawToken = authHeader.split(' ')[1].trim(); // Trim accidental spaces

  // Hash the incoming token to compare with stored hash
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  try {
    const [rows] = await pool.query(
      'SELECT * FROM api_tokens WHERE token_hash = ? AND is_revoked = FALSE',
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked API token.' });
    }

    const apiToken = rows[0];

    // Log this usage for audit trails (track timestamps + endpoints accessed)
    await pool.query(
      'INSERT INTO token_logs (token_id, endpoint, ip_address) VALUES (?, ?, ?)',
      [apiToken.id, `${req.method} ${req.path}`, req.ip]
    );

    // Update last_used_at
    await pool.query(
      'UPDATE api_tokens SET last_used_at = NOW() WHERE id = ?',
      [apiToken.id]
    );

    req.apiToken = apiToken;
    next();

  } catch (err) {
    console.error('API token verification error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

/**
 * Security Guard: Verify Developer Authority
 * Ensures the logged-in user has 'developer' role before proceeding
 */
async function verifyDeveloper(req, res, next) {
  if (!req.user || req.user.role !== 'developer') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Developer authority required.' 
    });
  }
  next();
}

/**
 * Granular Permission Guard
 * 
 * Factory function that returns a middleware checking if the current API token 
 * possesses a specific permission scope (e.g., 'read:alumni').
 * Relies on `req.apiToken` being populated by `verifyApiToken`.
 */
function requirePermission(permission) {
  return (req, res, next) => {
    const raw   = req.apiToken.permissions;
    const perms = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
    if (!perms.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This token does not have the '${permission}' permission.`,
      });
    }
    next();
  };
}

module.exports = { verifyToken, verifyApiToken, verifyDeveloper, requirePermission };
