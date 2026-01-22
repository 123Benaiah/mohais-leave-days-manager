const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Find admin user
      const admin = await Admin.findById(decoded.id);

      if (!admin || !admin.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account not found or inactive'
        });
      }

      // Attach admin info to request
      req.admin = {
        id: admin.id,
        email: admin.email,
        name: admin.name
      };

      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Optional: Skip authentication in development
const authenticateTokenOptional = async (req, res, next) => {
  if (process.env.NODE_ENV === 'development' && req.query.dev === 'true') {
    // Bypass authentication for development
    req.admin = { id: 1, email: 'dev@example.com', name: 'Developer Mode' };
    return next();
  }
  return authenticateToken(req, res, next);
};

module.exports = {
  authenticateToken,
  authenticateTokenOptional
};
