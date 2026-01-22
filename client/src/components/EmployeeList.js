import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BASE_URL } from '../config';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TextField, Button,
  Typography, Box, Chip, Snackbar, Alert,
  TablePagination
} from '@mui/material';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [daysToAdd, setDaysToAdd] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = `${BASE_URL}/api/employees`;

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await axios.get(API_URL);
      setEmployees(response.data);
      setFilteredEmployees(response.data);
    } catch (error) {
      showSnackbar('Error fetching employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
    setPage(0);
  }, [searchTerm, employees]);

  const updateEmployeeDays = async (id, days, action) => {
    try {
      const response = await axios.put(`${API_URL}/${id}`, {
        usedDays: days,
        action
      });
      
      setEmployees(prev => prev.map(emp => 
        emp.id === id ? response.data : emp
      ));
      
      setFilteredEmployees(prev => prev.map(emp => 
        emp.id === id ? response.data : emp
      ));
      
      setDaysToAdd(prev => ({ ...prev, [id]: '' }));
      showSnackbar('Days updated successfully', 'success');
    } catch (error) {
      showSnackbar(error.response?.data?.message || 'Error updating days', 'error');
    }
  };

  const handleAddDays = async (id, days) => {
    await updateEmployeeDays(id, days, 'add');
  };

  const handleSetDays = async (id, days) => {
    await updateEmployeeDays(id, days, 'set');
  };

  const handleResetAll = async () => {
    if (window.confirm('Are you sure you want to reset ALL employees to 0 used days?')) {
      try {
        await axios.post(`${API_URL}/reset`);
        fetchEmployees();
        showSnackbar('All employees reset successfully', 'success');
      } catch (error) {
        showSnackbar('Error resetting employees', 'error');
      }
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Typography>Loading employees...</Typography>
      </Box>
    );
  }

  const getDaysColor = (remaining) => {
    if (remaining > 100) return 'success';
    if (remaining > 50) return 'warning';
    return 'error';
  };

  const getStatus = (remaining) => {
    if (remaining === 0) return 'No days left';
    if (remaining <= 30) return 'Low days';
    if (remaining <= 100) return 'Moderate';
    return 'Good';
  };

  const stats = {
    total: employees.length,
    usedDays: employees.reduce((sum, emp) => sum + emp.used_days, 0),
    remainingDays: employees.reduce((sum, emp) => sum + (emp.total_days - emp.used_days), 0),
    lowDays: employees.filter(emp => (emp.total_days - emp.used_days) <= 30).length,
    noDaysLeft: employees.filter(emp => emp.used_days >= emp.total_days).length
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          MOHAIS Field Work Day Manager
        </Typography>
        <Button
          variant="outlined"
          onClick={handleResetAll}
          color="secondary"
        >
          Reset All to 0
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Typography color="text.secondary" variant="body2">Total Employees</Typography>
          <Typography variant="h6">{stats.total}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Typography color="text.secondary" variant="body2">Total Days Used</Typography>
          <Typography variant="h6">{stats.usedDays}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Typography color="text.secondary" variant="body2">Total Days Left</Typography>
          <Typography variant="h6">{stats.remainingDays}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: 150 }}>
          <Typography color="text.secondary" variant="body2">Low Days (≤30)</Typography>
          <Typography variant="h6" color="error">{stats.lowDays}</Typography>
        </Paper>
      </Box>

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Search employees by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          variant="outlined"
        />
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell><strong>#</strong></TableCell>
              <TableCell><strong>Employee Name</strong></TableCell>
              <TableCell><strong>Total Days</strong></TableCell>
              <TableCell><strong>Used Days</strong></TableCell>
              <TableCell><strong>Remaining Days</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Manage Days</strong></TableCell>
              <TableCell><strong>Set Days</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((employee, index) => (
              <TableRow key={employee.id} hover>
                <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                <TableCell>{employee.name}</TableCell>
                <TableCell>
                  <Chip label={employee.total_days} color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip label={employee.used_days} color="secondary" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={employee.remaining_days} 
                    color={getDaysColor(employee.remaining_days)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    color={getDaysColor(employee.remaining_days)}
                    sx={{ fontWeight: 'bold' }}
                  >
                    {getStatus(employee.remaining_days)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="Days"
                      value={daysToAdd[employee.id] || ''}
                      onChange={(e) => setDaysToAdd(prev => ({
                        ...prev,
                        [employee.id]: e.target.value
                      }))}
                      sx={{ width: 80 }}
                      InputProps={{ inputProps: { min: 0, max: 150 } }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleAddDays(employee.id, parseInt(daysToAdd[employee.id] || 0))}
                      title="Add days"
                    >
                      +
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      onClick={() => handleAddDays(employee.id, -parseInt(daysToAdd[employee.id] || 0))}
                      title="Remove days"
                    >
                      -
                    </Button>
                  </Box>
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      const days = prompt(`Set used days for ${employee.name} (Max: ${employee.total_days}):`, employee.used_days);
                      if (days !== null) {
                        const parsedDays = parseInt(days);
                        if (!isNaN(parsedDays)) {
                          handleSetDays(employee.id, parsedDays);
                        }
                      }
                    }}
                  >
                    Set Exact
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={filteredEmployees.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[10, 20, 50, 100]}
      />

      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {Math.min(rowsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
          {searchTerm && ` (filtered from ${employees.length} total)`}
          {' • '}
          <Chip size="small" label="Green: >100 days left" color="success" variant="outlined" sx={{ ml: 1, mr: 1 }} />
          <Chip size="small" label="Yellow: 50-100 days left" color="warning" variant="outlined" sx={{ mr: 1 }} />
          <Chip size="small" label="Red: <50 days left" color="error" variant="outlined" />
        </Typography>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployeeList;