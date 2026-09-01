const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const AuditLogger = require('../services/audit-logger');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ai-youtube-os-secure-jwt-secret-key-2026';

// Password hashing utility using PBKDF2 (built-in crypto)
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return checkHash === hash;
}

// Generate simple secure signed JWT-like token
function createToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

// Token verification helper
function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// Middleware: Authenticate Request
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = user;
  next();
}

// Middleware: Require specific roles (RBAC)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, name, role = 'EDITOR' } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const { hash, salt } = hashPassword(password);
  const userId = uuidv4();

  // Validate allowed roles: OWNER, ADMIN, EDITOR, VIEWER
  const validRoles = ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'];
  const userRole = validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'EDITOR';

  // Seed user in database
  db.prepare(`
    INSERT INTO users (id, username, display_name, name, email, password_hash, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
  `).run(userId, email, name, name, email, `${salt}:${hash}`, userRole);

  const newUser = { id: userId, name, email, role: userRole };
  const token = createToken(newUser);

  AuditLogger.log('USER_REGISTERED', { userId, email, role: userRole, entityType: 'user' });

  res.status(201).json({
    message: 'User registered successfully',
    user: newUser,
    token
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email, email);

  if (!user) {
    // If it is the default admin/owner login during initial setup, create it
    if (email === 'admin@domain.com' || email === 'owner@domain.com') {
      const { hash, salt } = hashPassword(password);
      const userId = uuidv4();
      const role = 'OWNER';
      db.prepare(`
        INSERT INTO users (id, username, display_name, name, email, password_hash, role, status, created_at, updated_at)
        VALUES (?, ?, 'System Owner', 'System Owner', ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now'))
      `).run(userId, email, email, `${salt}:${hash}`, role);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  }

  const [salt, storedHash] = (user.password_hash || '').split(':');
  if (salt && storedHash) {
    const isValid = verifyPassword(password, storedHash, salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
  }

  const token = createToken(user);
  AuditLogger.log('USER_LOGGED_IN', { userId: user.id, email: user.email, entityType: 'user' });

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'OWNER',
      status: user.status
    },
    token
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, role, status, created_at FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// GET /api/auth/users (Admin / Owner only)
router.get('/users', authMiddleware, requireRole('OWNER', 'ADMIN'), (req, res) => {
  const db = getDb();
  const users = db.prepare('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at ASC').all();
  res.json({ users });
});

module.exports = {
  router,
  authMiddleware,
  requireRole,
  verifyToken
};
