import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BASE_URL } from '../config';
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Lock, Email, AdminPanelSettings, Visibility, VisibilityOff } from '@mui/icons-material';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const c = {
    b: '#1A1A1A',
    g: '#28A745',
    o: '#FD7E14',
    r: '#DC3545',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const d = await res.json();

      if (d.success) {
        localStorage.setItem('adminToken', d.token);
        localStorage.setItem('adminData', JSON.stringify(d.admin));
        setTimeout(() => navigate('/admin/dashboard'), 300);
      } else {
        setError(d.message || 'Login failed');
      }
    } catch (err) {
      setError('Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      maxWidth={false}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1f1f1f, #2a2a2a, #1f1f1f)',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 420,
          p: 3,
          borderRadius: 2.5,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
          position: 'relative',
          overflow: 'hidden',
          background: '#ffffff',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${c.g} 0%, ${c.o} 100%)`,
          },
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 2.5 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              bgcolor: '#E8F5E9',
              mb: 1,
              color: c.g,
            }}
          >
            <AdminPanelSettings sx={{ fontSize: 26 }} />
          </Box>

          <Typography
            component="h1"
            variant="h5"
            sx={{ color: c.b, fontWeight: 600 }}
          >
            Admin Login
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Sign in to access dashboard
          </Typography>
        </Box>

        {/* Form */}
        <Box component="form" onSubmit={handleSubmit}>
          {error && (
            <Alert
              severity="error"
              icon={false}
              sx={{
                mb: 2,
                py: 0.75,
                px: 1.5,
                bgcolor: c.r + '22',
                color: c.r,
                fontSize: '0.85rem',
                borderLeft: `4px solid ${c.r}`,
              }}
            >
              {error}
            </Alert>
          )}

          <TextField
            required
            fullWidth
            label="Email"
            value={email}
            autoFocus
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <Email sx={{ mr: 1, fontSize: 20, color: '#666' }} />
              ),
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: '0.95rem',
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.85rem',
              },
            }}
          />

          <TextField
            required
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Password"
            value={password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <Lock sx={{ mr: 1, fontSize: 20, color: '#666' }} />
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    tabIndex={-1}
                    sx={{ color: '#666' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: '0.95rem',
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.85rem',
              },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              py: 1.2,
              borderRadius: 2,
              bgcolor: c.g,
              fontSize: '0.95rem',
              textTransform: 'none',
              '&:hover': { bgcolor: '#1E7E34' },
            }}
          >
            {loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>

          {/* Links */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2,
            }}
          >
            <Link to="/admin/forgot-password" style={{ textDecoration: 'none' }}>
              <Typography variant="caption" sx={{ color: c.g, fontSize: '0.8rem' }}>
                Forgot password?
              </Typography>
            </Link>

            <Link to="/super-admin/login" style={{ textDecoration: 'none' }}>
              <Typography variant="caption" sx={{ color: c.o, fontSize: '0.8rem' }}>
                Super Admin
              </Typography>
            </Link>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(0,0,0,0.08)' }} />

          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              color: '#999',
              fontSize: '0.75rem',
            }}
          >
            v1.0 • {new Date().getFullYear()}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default AdminLogin;
