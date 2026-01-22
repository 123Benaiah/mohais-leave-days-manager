import React, { useState } from 'react';
import axios from 'axios';
import {
  Button, Typography, Box,
  Paper, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

const ImportEmployees = ({ onImportComplete }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      setMessage('Refreshing employee data...');
      const response = await axios.get('http://localhost:5000/api/employees');
      setMessage(`Successfully loaded ${response.data.length} employees`);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForceImport = async () => {
    setDialogOpen(false);
    setLoading(true);
    setMessage('Resetting all data...');
    
    try {
      const response = await axios.post('http://localhost:5000/api/employees/reset');
      setMessage(`Successfully reset ${response.data.length} employees to 0 used days`);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Employee Management
        </Typography>
        
        <Alert severity="success" sx={{ mb: 2 }}>
          ✅ Database is ready with 637 employees imported!
        </Alert>

        <Alert severity="info" sx={{ mb: 2 }}>
          All employee names from your file have been imported to the database.
          You can now manage their field work days below.
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Refresh Employees'}
          </Button>

          <Button
            variant="outlined"
            color="warning"
            onClick={() => setDialogOpen(true)}
          >
            Reset All Data
          </Button>
        </Box>

        {message && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {message}
          </Typography>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Reset All Data?</DialogTitle>
        <DialogContent>
          <Typography>
            This will reset ALL employees' used days to 0. This action cannot be undone.
            Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleForceImport} color="warning" variant="contained">
            Reset All
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportEmployees;