import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';
import './AdminDashboard.css';

function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState({
    total: 0,
    lowDays: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const data = localStorage.getItem('adminData');
    const token = localStorage.getItem('adminToken');

    if (!data || !token) {
      navigate('/admin/login');
      return;
    }

    try {
      setAdmin(JSON.parse(data));
      fetchEmployeeStats();
    } catch (err) {
      console.error('Error parsing admin data:', err);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchEmployeeStats = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/employees`);
      const employees = await response.json();
      
      const lowDaysCount = employees.filter(emp => emp.remaining_days <= 10).length;
      setEmployeeStats({
        total: employees.length,
        lowDays: lowDaysCount
      });
    } catch (err) {
      console.error('Error fetching employee stats:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    navigate('/admin/login');
  };

  const handleManageEmployees = () => {
    navigate('/employees');
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1>MOHAIS Admin Dashboard</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-user">{admin?.name || admin?.email}</span>
          <button className="admin-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">
        {/* Welcome Section */}
        <div className="admin-welcome">
          <h2>Welcome, {admin?.name || admin?.email}!</h2>
          <p>Manage employee field work days and track employee information.</p>
        </div>

        {/* Stats Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: '#22c55e' }}>
              👥
            </div>
            <div className="admin-stat-info">
              <h3>{employeeStats.total}</h3>
              <p>Total Employees</p>
            </div>
          </div>
          
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: '#f97316' }}>
              ⚠️
            </div>
            <div className="admin-stat-info">
              <h3>{employeeStats.lowDays}</h3>
              <p>Low field work Days (&lt;10)</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="admin-actions">
          <h3>Quick Actions</h3>
          <div className="admin-action-buttons">
            <button className="admin-action-btn primary" onClick={handleManageEmployees}>
              <span style={{ marginRight: '8px' }}>👥</span>
              Manage Employees
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="admin-instructions">
          <h3>How to Use</h3>
          <ul>
            <li>Click "Manage Employees" to view and manage all employee field work days</li>
            <li>Add, edit, or delete employees as needed</li>
            <li>Update employee field work days using the +, -, or Set buttons</li>
            <li>All changes are automatically logged in the audit system</li>
            <li>Monitor employees with low field work days (less than 10 days remaining)</li>
            <li>Use the search function to quickly find specific employees</li>
            <li>Export data or generate reports as needed</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;