import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../config';
import './AdminAuditLogs.css';

function AdminAuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminToken, setAdminToken] = useState(null);
  const [adminData, setAdminData] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage, setLogsPerPage] = useState(10);
  
  // Filtering
  const [filters, setFilters] = useState({
    actionType: '',
    startDate: '',
    endDate: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Selection
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Modals
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Initialize
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const data = localStorage.getItem('adminData');

    if (!token || !data) {
      navigate('/admin/login');
      return;
    }

    setAdminToken(token);
    setAdminData(JSON.parse(data));
    fetchLogs();
  }, [navigate]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: '1',
        limit: '1000',
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`${BASE_URL}/api/admin/audit-logs/all?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const logsData = data.data || data || [];
        setLogs(Array.isArray(logsData) ? logsData : []);
        applyFilters(Array.isArray(logsData) ? logsData : []);
      } else {
        console.error('Failed to fetch logs');
        setLogs([]);
        setFilteredLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Apply filters
  const applyFilters = useCallback((logsToFilter) => {
    let filtered = [...logsToFilter];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.entity_name?.toLowerCase().includes(term) ||
        log.action_type?.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    applyFilters(logs);
  }, [searchTerm, logs, applyFilters]);

  // Pagination
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, currentPage, logsPerPage]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Format functions
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  }, []);

  const formatActionType = useCallback((actionType) => {
    return actionType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  }, []);

  const formatEntityType = useCallback((entityType) => {
    const types = {
      'ADMIN': 'Admin Account',
      'EMPLOYEE': 'Employee',
      'LEAVE_REQUEST': 'Leave Request'
    };
    return types[entityType] || entityType?.replace(/_/g, ' ') || 'Unknown';
  }, []);

  // Export current page
  const exportCurrentPage = useCallback(async (format = 'csv') => {
    try {
      if (paginatedLogs.length === 0) {
        alert('No logs to export on current page');
        return;
      }

      const logsData = paginatedLogs.map(log => ({
        id: log.id,
        timestamp: formatDate(log.created_at),
        action: formatActionType(log.action_type),
        entity: log.entity_name,
        changes: log.description || ''
      }));

      if (format === 'csv') {
        const headers = ['ID', 'Timestamp', 'Action', 'Entity', 'Description'];
        const csvContent = [
          headers.join(','),
          ...logsData.map(log =>
            [log.id, `"${log.timestamp}"`, log.action, `"${log.entity}"`, `"${log.changes.replace(/"/g, '""')}"`].join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-page-${currentPage}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === 'json') {
        const jsonContent = JSON.stringify(logsData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-page-${currentPage}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export logs');
    }
  }, [paginatedLogs, currentPage, formatDate, formatActionType]);

  // Export selected logs
  const exportSelectedLogs = useCallback(async (format = 'csv') => {
    try {
      if (selectedLogs.length === 0) {
        alert('Please select logs to export');
        return;
      }

      const selectedLogsData = paginatedLogs.filter(log => selectedLogs.includes(log.id));
      const logsData = selectedLogsData.map(log => ({
        id: log.id,
        timestamp: formatDate(log.created_at),
        action: formatActionType(log.action_type),
        entity: log.entity_name,
        changes: log.description || ''
      }));

      if (format === 'csv') {
        const headers = ['ID', 'Timestamp', 'Action', 'Entity', 'Description'];
        const csvContent = [
          headers.join(','),
          ...logsData.map(log =>
            [log.id, `"${log.timestamp}"`, log.action, `"${log.entity}"`, `"${log.changes.replace(/"/g, '""')}"`].join(',')
          )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-selected-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === 'json') {
        const jsonContent = JSON.stringify(logsData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-selected-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export logs');
    }
  }, [selectedLogs, paginatedLogs, formatDate, formatActionType]);

  // Print current page
  const printCurrentPage = useCallback(() => {
    if (paginatedLogs.length === 0) {
      alert('No logs to print');
      return;
    }

    const printWindow = window.open('', '', 'height=600,width=800');
    const htmlContent = `
      <html>
        <head>
          <title>Audit Logs - Page ${currentPage}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Audit Logs Report</h1>
          <p>Page: ${currentPage} | Total: ${paginatedLogs.length} | Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Date/Time</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${paginatedLogs.map(log => `
                <tr>
                  <td>${formatActionType(log.action_type)}</td>
                  <td>${log.entity_name}</td>
                  <td>${formatDate(log.created_at)}</td>
                  <td>${log.description || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [paginatedLogs, currentPage, formatActionType, formatDate]);

  // Print selected
  const printSelectedLogs = useCallback(() => {
    if (selectedLogs.length === 0) {
      alert('Please select logs to print');
      return;
    }

    const selectedLogsData = paginatedLogs.filter(log => selectedLogs.includes(log.id));
    const printWindow = window.open('', '', 'height=600,width=800');
    const htmlContent = `
      <html>
        <head>
          <title>Selected Audit Logs</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>Selected Audit Logs Report</h1>
          <p>Total Selected: ${selectedLogs.length} | Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Entity</th>
                <th>Date/Time</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${selectedLogsData.map(log => `
                <tr>
                  <td>${formatActionType(log.action_type)}</td>
                  <td>${log.entity_name}</td>
                  <td>${formatDate(log.created_at)}</td>
                  <td>${log.description || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [selectedLogs, paginatedLogs, formatActionType, formatDate]);

  if (loading) {
    return (
      <div className="admin-audit-logs-loading">
        <div className="loading-spinner"></div>
        <p>Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="admin-audit-logs">
      {/* Header */}
      <div className="audit-logs-header">
        <h2>📋 My Audit Logs</h2>
        <button className="audit-back-btn" onClick={() => navigate('/employees')}>
          ← Back
        </button>
      </div>

      {/* Filter and Export Section */}
      <div className="audit-logs-controls">
        {/* Search */}
        <div className="audit-search">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="audit-search-input"
          />
        </div>

        {/* Export Buttons */}
        <div className="audit-export-controls">
          {/* Page Export */}
          <div className="export-dropdown">
            <button className="export-btn page-export-btn">
              📥 Export Page
            </button>
            <div className="export-menu">
              <button onClick={() => exportCurrentPage('csv')} className="export-option">
                📊 CSV
              </button>
              <button onClick={() => exportCurrentPage('json')} className="export-option">
                📄 JSON
              </button>
              <button onClick={() => printCurrentPage()} className="export-option">
                🖨️ Print Page
              </button>
            </div>
          </div>

          {/* Selected Export */}
          {selectedLogs.length > 0 && (
            <div className="export-dropdown">
              <button className="export-btn selected-export-btn">
                ✓ {selectedLogs.length} Selected
              </button>
              <div className="export-menu">
                <button onClick={() => exportSelectedLogs('csv')} className="export-option">
                  📊 CSV
                </button>
                <button onClick={() => exportSelectedLogs('json')} className="export-option">
                  📄 JSON
                </button>
                <button onClick={() => printSelectedLogs()} className="export-option">
                  🖨️ Print
                </button>
              </div>
            </div>
          )}

          {/* Clear Selection */}
          {selectedLogs.length > 0 && (
            <button
              className="clear-selection-btn"
              onClick={() => setSelectedLogs([])}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="audit-logs-stats">
        <span>{filteredLogs.length} total logs</span>
        {selectedLogs.length > 0 && <span>| {selectedLogs.length} selected</span>}
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div className="audit-empty-state">
          <p>No audit logs found</p>
        </div>
      ) : (
        <>
          <div className="audit-table-container">
            <table className="audit-logs-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedLogs.length === paginatedLogs.length && paginatedLogs.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLogs(paginatedLogs.map(log => log.id));
                        } else {
                          setSelectedLogs([]);
                        }
                      }}
                    />
                  </th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity Name</th>
                  <th>Date/Time</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLogs([...selectedLogs, log.id]);
                          } else {
                            setSelectedLogs(selectedLogs.filter(id => id !== log.id));
                          }
                        }}
                      />
                    </td>
                    <td><strong>{formatActionType(log.action_type)}</strong></td>
                    <td>{formatEntityType(log.entity_type)}</td>
                    <td>{log.entity_name}</td>
                    <td>{formatDate(log.created_at)}</td>
                    <td>{log.description || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="audit-pagination">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="page-btn"
            >
              ⟪ First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="page-btn"
            >
              ← Previous
            </button>

            <div className="page-numbers">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                }
                if (pageNum <= totalPages) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages}
              className="page-btn"
            >
              Next →
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="page-btn"
            >
              Last ⟫
            </button>

            <div className="pagination-info">
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminAuditLogs;
