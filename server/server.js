const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const employeeRoutes = require('./routes/employees');
const adminAuthRoutes = require('./routes/adminAuth');
const superAdminRoutes = require('./routes/superAdmin');

const app = express();
const PORT = process.env.PORT || 5000;
const SERVER_IP = process.env.SERVER_IP || '192.168.1.62';

// Middleware - Allow phone access
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/employees', employeeRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
} else {
  // Development routes
  app.get('/', (req, res) => {
    res.json({
      message: 'MOHAIS Day Manager API',
      database: 'MySQL',
      status: 'Running',
      environment: 'development',
      phone_access: `http://${SERVER_IP}:${PORT}`
    });
  });
}

// Listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Local access: http://localhost:${PORT}`);
  console.log(`📱 Phone access: http://${SERVER_IP}:${PORT}`);
  console.log(`👥 Employee API: http://${SERVER_IP}:${PORT}/api/employees`);
  console.log(`🔐 Admin API: http://${SERVER_IP}:${PORT}/api/admin/auth`);
  console.log(`👑 Super Admin API: http://${SERVER_IP}:${PORT}/api/super-admin`);
});