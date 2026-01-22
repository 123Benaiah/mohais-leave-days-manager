import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FaTrash } from 'react-icons/fa';
import { FaEye } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { API_URL as CONFIG_API_URL, BASE_URL } from '../config';
import './SuperAdminDashboard.css';

function SuperAdminDashboard() {
    const [superAdmin, setSuperAdmin] = useState(null);
    const [admins, setAdmins] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({
        show: false,
        type: '',
        title: '',
        message: ''
    });
    
    // Filter states
    const [filters, setFilters] = useState({
        employeeName: '',
        employeeNumber: '',
        startDate: '',
        endDate: '',
        adminName: '',
        actionType: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Client-side pagination state
    const [clientPagination, setClientPagination] = useState({
        page: 1,
        limit: 10
    });
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: ''
    });

    // Audit log deletion states
    const [selectedLogs, setSelectedLogs] = useState([]);

    // View log detail modal
    const [showLogDetailModal, setShowLogDetailModal] = useState(false);
    const [selectedLogDetail, setSelectedLogDetail] = useState(null);

    // Delete confirmation modal states
    const [showDeleteLogModal, setShowDeleteLogModal] = useState(false);
    const [logToDelete, setLogToDelete] = useState(null);
    const [deleteType, setDeleteType] = useState('single'); // 'single' or 'multiple'
    const [deleteModalTitle, setDeleteModalTitle] = useState('');
    const [deleteModalMessage, setDeleteModalMessage] = useState('');

    const navigate = useNavigate();
    const API_URL = CONFIG_API_URL;

    const getAuthHeaders = useCallback(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('superAdminToken')}`
    }), []);

    // Helper function to format action type for display
    const formatActionType = useCallback((actionType) => {
        switch (actionType) {
            case 'CREATE': return 'Created';
            case 'UPDATE': return 'Updated';
            case 'DELETE': return 'Deleted';
            case 'ADD_DAYS': return 'Added Days';
            case 'SUBTRACT_DAYS': return 'Subtracted';
            case 'SET_DAYS': return 'Set Leave  Days';
            default: return actionType.replace('_', ' ');
        }
    }, []);

    // Helper function to format entity type for display
    const formatEntityType = useCallback((entityType) => {
        switch (entityType) {
            case 'ADMIN': return 'Admin Account';
            case 'SUPER_ADMIN': return 'Super Admin Account';
            case 'EMPLOYEE': return 'Employee';
            case 'LEAVE_REQUEST': return 'Leave Request';
            default: return entityType.replace('_', ' ');
        }
    }, []);

    // Helper function to format values as readable text with interpretations
    const formatValuesAsText = useCallback((values) => {
        if (!values || Object.keys(values).length === 0) return 'No data';
        
        try {
            const parsed = typeof values === 'string' ? JSON.parse(values) : values;
            
            if (typeof parsed === 'object' && parsed !== null) {
                return Object.entries(parsed)
                    .map(([key, value]) => {
                        // Format key
                        const formattedKey = key
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                        
                        // Format value with interpretations
                        let formattedValue = value;
                        
                        // Special interpretations
                        if (key === 'is_active' || key === 'isActive') {
                            formattedValue = value === 1 || value === true ? 'Active' : 'Inactive';
                        } else if (key === 'status') {
                            if (value === 'approved') formattedValue = 'Approved ✅';
                            else if (value === 'pending') formattedValue = 'Pending ⏳';
                            else if (value === 'rejected') formattedValue = 'Rejected ❌';
                            else formattedValue = value;
                        } else if (key === 'action_type') {
                            formattedValue = formatActionType(value);
                        } else if (key === 'entity_type') {
                            formattedValue = formatEntityType(value);
                        } else if (key === 'leave_days' || key === 'total_leave_days') {
                            formattedValue = `${value} day${value !== 1 ? 's' : ''}`;
                        } else if (value === null || value === undefined) {
                            formattedValue = 'None';
                        } else if (typeof value === 'boolean') {
                            formattedValue = value ? 'Yes' : 'No';
                        } else if (typeof value === 'object') {
                            if (Array.isArray(value)) {
                                formattedValue = value.join(', ');
                            } else {
                                formattedValue = JSON.stringify(value, null, 2);
                            }
                        } else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
                            try {
                                const date = new Date(value);
                                if (!isNaN(date.getTime())) {
                                    formattedValue = date.toLocaleString();
                                }
                            } catch (e) {
                                // Keep original value
                            }
                        }
                        
                        return `${formattedKey}: ${formattedValue}`;
                    })
                    .join('\n');
            }
            
            return String(parsed);
        } catch (error) {
            console.error('Error formatting values:', error);
            return String(values);
        }
    }, [formatActionType, formatEntityType]);

    // Get formatted changes with interpretations
    const getFormattedChange = useCallback((log) => {
        if (!log.old_values && !log.new_values) return 'No changes recorded';
        
        const oldValues = log.old_values || {};
        const newValues = log.new_values || {};
        
        const changes = [];
        
        // Common fields with interpretations
        if (oldValues.leave_days !== undefined && newValues.leave_days !== undefined) {
            const change = newValues.leave_days - oldValues.leave_days;
            const changeText = change > 0 ? `Increased by ${change} days` : `Decreased by ${Math.abs(change)} days`;
            changes.push(`Leave days: ${oldValues.leave_days} → ${newValues.leave_days} (${changeText})`);
        }
        
        if (oldValues.total_leave_days !== undefined && newValues.total_leave_days !== undefined) {
            const change = newValues.total_leave_days - oldValues.total_leave_days;
            const changeText = change > 0 ? `Increased by ${change} days` : `Decreased by ${Math.abs(change)} days`;
            changes.push(`Total leave balance: ${oldValues.total_leave_days} → ${newValues.total_leave_days} (${changeText})`);
        }
        
        if (oldValues.status !== undefined && newValues.status !== undefined) {
            let oldStatus = oldValues.status;
            let newStatus = newValues.status;
            
            // Format status values
            if (oldValues.status === 'approved') oldStatus = 'Approved';
            else if (oldValues.status === 'pending') oldStatus = 'Pending';
            else if (oldValues.status === 'rejected') oldStatus = 'Rejected';
            
            if (newValues.status === 'approved') newStatus = 'Approved';
            else if (newValues.status === 'pending') newStatus = 'Pending';
            else if (newValues.status === 'rejected') newStatus = 'Rejected';
            
            changes.push(`Status: ${oldStatus} → ${newStatus}`);
        }
        
        if (oldValues.is_active !== undefined && newValues.is_active !== undefined) {
            const oldStatus = oldValues.is_active ? 'Active' : 'Inactive';
            const newStatus = newValues.is_active ? 'Active' : 'Inactive';
            changes.push(`Account status: ${oldStatus} → ${newStatus}`);
        }
        
        if (oldValues.employee_number !== undefined || newValues.employee_number !== undefined) {
            if (oldValues.employee_number !== newValues.employee_number) {
                changes.push(`Employee #: ${oldValues.employee_number || 'None'} → ${newValues.employee_number || 'None'}`);
            }
        }
        
        if (oldValues.name !== undefined || newValues.name !== undefined) {
            if (oldValues.name !== newValues.name) {
                changes.push(`Name: ${oldValues.name || 'None'} → ${newValues.name || 'None'}`);
            }
        }
        
        if (oldValues.email !== undefined || newValues.email !== undefined) {
            if (oldValues.email !== newValues.email) {
                changes.push(`Email: ${oldValues.email || 'None'} → ${newValues.email || 'None'}`);
            }
        }
        
        // If no specific changes found, show all changes with interpretations
        if (changes.length === 0) {
            const allKeys = [...new Set([
                ...Object.keys(oldValues),
                ...Object.keys(newValues)
            ])];
            
            allKeys.forEach(key => {
                if (oldValues[key] !== newValues[key]) {
                    let oldVal = oldValues[key] !== undefined ? oldValues[key] : 'None';
                    let newVal = newValues[key] !== undefined ? newValues[key] : 'None';
                    
                    // Apply interpretations
                    if (key === 'is_active' || key === 'isActive') {
                        oldVal = oldVal === 1 || oldVal === true ? 'Active' : oldVal === 0 || oldVal === false ? 'Inactive' : oldVal;
                        newVal = newVal === 1 || newVal === true ? 'Active' : newVal === 0 || newVal === false ? 'Inactive' : newVal;
                    } else if (key === 'status') {
                        if (oldVal === 'approved') oldVal = 'Approved';
                        else if (oldVal === 'pending') oldVal = 'Pending';
                        else if (oldVal === 'rejected') oldVal = 'Rejected';
                        
                        if (newVal === 'approved') newVal = 'Approved';
                        else if (newVal === 'pending') newVal = 'Pending';
                        else if (newVal === 'rejected') newVal = 'Rejected';
                    }
                    
                    const formattedKey = key
                        .split('_')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    
                    changes.push(`${formattedKey}: ${oldVal} → ${newVal}`);
                }
            });
        }
        
        return changes.length > 0 ? changes.join('\n') : 'No changes detected';
    }, []);

    // Client-side filtering function
    const applyClientSideFilters = useCallback((logs) => {
        let filtered = [...logs];
        
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(log => 
                log.entity_name?.toLowerCase().includes(term) ||
                log.performed_by_name?.toLowerCase().includes(term) ||
                (log.new_values?.employee_number && log.new_values.employee_number.toLowerCase().includes(term)) ||
                (log.old_values?.employee_number && log.old_values.employee_number.toLowerCase().includes(term))
            );
        }
        
        if (filters.actionType) {
            filtered = filtered.filter(log => log.action_type === filters.actionType);
        }
        
        if (filters.employeeNumber) {
            filtered = filtered.filter(log => 
                (log.new_values?.employee_number && log.new_values.employee_number.includes(filters.employeeNumber)) ||
                (log.old_values?.employee_number && log.old_values.employee_number.includes(filters.employeeNumber))
            );
        }
        
        if (filters.startDate || filters.endDate) {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.created_at);
                const startDate = filters.startDate ? new Date(filters.startDate) : null;
                const endDate = filters.endDate ? new Date(filters.endDate) : null;
                
                if (startDate && endDate) {
                    return logDate >= startDate && logDate <= new Date(endDate.setHours(23, 59, 59, 999));
                } else if (startDate) {
                    return logDate >= startDate;
                } else if (endDate) {
                    return logDate <= new Date(endDate.setHours(23, 59, 59, 999));
                }
                return true;
            });
        }
        
        if (filters.adminName) {
            filtered = filtered.filter(log => 
                log.performed_by_name?.toLowerCase().includes(filters.adminName.toLowerCase())
            );
        }
        
        return filtered;
    }, [searchTerm, filters]);

    // Handle filter changes
    const handleFilterChange = useCallback((field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const handleApplyFilters = useCallback(() => {
        setClientPagination(prev => ({ ...prev, page: 1 }));
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchData(1);
    }, []);

    const handleClearFilters = useCallback(() => {
        setSearchTerm('');
        setFilters({
            employeeName: '',
            employeeNumber: '',
            startDate: '',
            endDate: '',
            adminName: '',
            actionType: ''
        });
        setClientPagination(prev => ({ ...prev, page: 1 }));
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchData(1);
    }, []);

    // Client-side pagination handlers
    const handleClientPageChange = useCallback((newPage) => {
        setClientPagination(prev => ({ ...prev, page: newPage }));
    }, []);

    // Server-side pagination handlers
    const handleServerPageChange = useCallback((newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
        fetchData(newPage);
    }, []);

    // Real-time handlers
    const handleSearchChange = useCallback((value) => {
        setSearchTerm(value);
        setClientPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    const handleDateChange = useCallback((field, value) => {
        handleFilterChange(field, value);
        setClientPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    const handleActionTypeChange = useCallback((value) => {
        handleFilterChange('actionType', value);
        setClientPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    const handleEmployeeNumberChange = useCallback((value) => {
        handleFilterChange('employeeNumber', value);
        setClientPagination(prev => ({ ...prev, page: 1 }));
    }, []);

    const fetchData = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: (pagination.limit || 10).toString(),
                ...filters
            });

            Object.keys(filters).forEach(key => {
                if (!filters[key]) {
                    queryParams.delete(key);
                }
            });

            const auditLogsUrl = `${API_URL}/simple-logs?${queryParams}`;

            const [adminsRes, logsRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/admins`, {
                    headers: getAuthHeaders()
                }),
                fetch(auditLogsUrl, {
                    headers: getAuthHeaders()
                }),
                fetch(`${API_URL}/stats`, {
                    headers: getAuthHeaders()
                })
            ]);

            const adminsData = await adminsRes.json();
            const logsData = await logsRes.json();
            const statsData = await statsRes.json();

            // Process admins data - convert is_active to boolean and format
            if (adminsData.success) {
                const processedAdmins = adminsData.admins.map(admin => ({
                    ...admin,
                    is_active: admin.is_active === 1 || admin.is_active === true,
                    statusText: admin.is_active === 1 || admin.is_active === true ? 'Active' : 'Inactive'
                }));
                setAdmins(processedAdmins);
            }
            
            if (logsData.success) {
                const processedLogs = (logsData.logs || []).map(log => {
                    try {
                        const processedLog = {
                            ...log,
                            old_values: log.old_values
                                ? (typeof log.old_values === 'string'
                                    ? JSON.parse(log.old_values)
                                    : log.old_values)
                                : null,
                            new_values: log.new_values
                                ? (typeof log.new_values === 'string'
                                    ? JSON.parse(log.new_values)
                                    : log.new_values)
                                : null,
                            // Add formatted fields for display
                            formatted_action_type: formatActionType(log.action_type),
                            formatted_entity_type: formatEntityType(log.entity_type)
                        };
                        return processedLog;
                    } catch (e) {
                        return {
                            ...log,
                            old_values: {},
                            new_values: {},
                            formatted_action_type: formatActionType(log.action_type),
                            formatted_entity_type: formatEntityType(log.entity_type)
                        };
                    }
                });
                setAuditLogs(processedLogs);
                setFilteredLogs(processedLogs);

                setPagination(logsData.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
            } else {
                console.warn('Logs returned success=false');
                setAuditLogs([]);
                setFilteredLogs([]);
                setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
            }
            
            if (statsData.success) setStats(statsData.stats);
        } catch (err) {
            console.error('Fetch error details:', err);
            showToast('error', 'Error', `Failed to fetch data: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [API_URL, filters, pagination.limit, getAuthHeaders, formatActionType, formatEntityType]);

    // Apply client-side filters
    useEffect(() => {
        // Only apply client-side search if we have logs and a generic search term
        // server-side filtering handles specific field filters
        if (auditLogs.length > 0 && searchTerm) {
            const filtered = applyClientSideFilters(auditLogs);
            setFilteredLogs(filtered);
            setClientPagination(prev => ({ ...prev, page: 1 }));
        } else if (auditLogs.length > 0) {
           // If no search term, reset filtered logs to all audit logs (which might be filtered by server)
           setFilteredLogs(auditLogs);
        }
    }, [searchTerm, auditLogs, applyClientSideFilters]);

    useEffect(() => {
        const data = localStorage.getItem('superAdminData');
        const token = localStorage.getItem('superAdminToken');

        if (!data || !token) {
            navigate('/super-admin/login');
            return;
        }

        try {
            setSuperAdmin(JSON.parse(data));
        } catch (err) {
            navigate('/super-admin/login');
        }
    }, [navigate]);

    // Initial data fetch
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchData(pagination.page);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, pagination.page]);

    // Calculate paginated data
    const paginatedLogs = useMemo(() => {
        const startIndex = (clientPagination.page - 1) * clientPagination.limit;
        const endIndex = startIndex + clientPagination.limit;
        return filteredLogs.slice(startIndex, endIndex);
    }, [filteredLogs, clientPagination]);

    // Calculate total pages
    const clientTotalPages = Math.ceil(filteredLogs.length / clientPagination.limit);

    const showToast = useCallback((type, title, message) => {
        setToast({
            show: true,
            type,
            title,
            message,
            hiding: false
        });
        setTimeout(() => {
            setToast((prev) => ({
                ...prev,
                hiding: true
            }));
            setTimeout(() => setToast({
                show: false,
                type: '',
                title: '',
                message: ''
            }), 300);
        }, 4000);
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminData');
        navigate('/super-admin/login');
    }, [navigate]);

    // Admin CRUD Operations
    const handleAddAdmin = useCallback(async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/admins`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                const newAdmin = {
                    ...data.admin,
                    is_active: data.admin.is_active === 1 || data.admin.is_active === true,
                    statusText: data.admin.is_active === 1 || data.admin.is_active === true ? 'Active' : 'Inactive'
                };
                setAdmins([newAdmin, ...admins]);
                setShowAddModal(false);
                setFormData({
                    email: '',
                    password: '',
                    name: ''
                });
                showToast('success', 'Admin Created', `${data.admin.name || data.admin.email} has been added.`);
                fetchData(pagination.page);
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to create admin');
        }
    }, [API_URL, formData, getAuthHeaders, admins, pagination.page, showToast, fetchData]);

    const handleEditAdmin = useCallback(async (e) => {
        e.preventDefault();
        try {
            const updateData = {
                ...formData
            };
            if (!updateData.password) delete updateData.password;

            const res = await fetch(`${API_URL}/admins/${selectedAdmin.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(updateData)
            });
            const data = await res.json();

            if (data.success) {
                const updatedAdmin = {
                    ...data.admin,
                    is_active: data.admin.is_active === 1 || data.admin.is_active === true,
                    statusText: data.admin.is_active === 1 || data.admin.is_active === true ? 'Active' : 'Inactive'
                };
                setAdmins(admins.map((a) => a.id === selectedAdmin.id ? updatedAdmin : a));
                setShowEditModal(false);
                setSelectedAdmin(null);
                setFormData({
                    email: '',
                    password: '',
                    name: ''
                });
                showToast('success', 'Admin Updated', `${data.admin.name || data.admin.email} has been updated.`);
                fetchData(pagination.page);
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to update admin');
        }
    }, [API_URL, formData, selectedAdmin, getAuthHeaders, admins, pagination.page, showToast, fetchData]);

    const handleDeleteAdmin = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/admins/${selectedAdmin.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (data.success) {
                setAdmins(admins.filter((a) => a.id !== selectedAdmin.id));
                setShowDeleteModal(false);
                showToast('success', 'Admin Deleted', `${selectedAdmin.name || selectedAdmin.email} has been removed.`);
                setSelectedAdmin(null);
                fetchData(pagination.page);
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to delete admin');
        }
    }, [API_URL, selectedAdmin, getAuthHeaders, admins, pagination.page, showToast, fetchData]);

    const handleToggleActive = useCallback(async (admin) => {
        try {
            const res = await fetch(`${API_URL}/admins/${admin.id}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    is_active: !admin.is_active
                })
            });
            const data = await res.json();

            if (data.success) {
                const updatedAdmin = {
                    ...data.admin,
                    is_active: data.admin.is_active === 1 || data.admin.is_active === true,
                    statusText: data.admin.is_active === 1 || data.admin.is_active === true ? 'Active' : 'Inactive'
                };
                setAdmins(admins.map((a) => a.id === admin.id ? updatedAdmin : a));
                const action = updatedAdmin.is_active ? 'activated' : 'deactivated';
                showToast('success', 'Status Updated', `${admin.name || admin.email} has been ${action}.`);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to update status');
        }
    }, [API_URL, getAuthHeaders, admins, showToast]);

    // Open delete confirmation modal for single log
    // Open delete confirmation modal for single log (alternative version)
const openDeleteLogModal = useCallback((logId) => {
    // Find the log from filteredLogs or auditLogs
    const log = filteredLogs.find(l => l.id === logId) || auditLogs.find(l => l.id === logId);
    
    if (!log) {
        // Fallback to simple message if log not found
        setDeleteModalTitle('Delete Audit Log');
        setDeleteModalMessage(`Are you sure you want to delete audit log #${logId}? This action cannot be undone.`);
    } else {
        // Get action type name
        const actionName = log.formatted_action_type || formatActionType(log.action_type) || 'Unknown Action';
        
        // Get employee number
        const getEmployeeNumber = () => {
            try {
                return log.new_values?.employee_number || 
                       log.old_values?.employee_number || 
                       'Unknown Employee';
            } catch (e) {
                return 'Unknown Employee';
            }
        };
        
        const employeeNumber = getEmployeeNumber();
        
        setDeleteModalTitle(`Delete ${actionName} Record`);
        setDeleteModalMessage(`Are you sure you want to delete the "${actionName}" record for Employee Number ${employeeNumber}? This action cannot be undone.`);
    }
    
    setLogToDelete(logId);
    setDeleteType('single');
    setShowDeleteLogModal(true);
}, [filteredLogs, auditLogs, formatActionType]);

    // Open delete confirmation modal for multiple logs
    const openDeleteMultipleModal = useCallback(() => {
        if (selectedLogs.length === 0) {
            showToast('warning', 'Warning', 'Please select logs to delete');
            return;
        }
        setDeleteType('multiple');
        setDeleteModalTitle('Delete Multiple Audit Logs');
        setDeleteModalMessage(`Are you sure you want to delete ${selectedLogs.length} selected audit log${selectedLogs.length > 1 ? 's' : ''}? This action cannot be undone.`);
        setShowDeleteLogModal(true);
    }, [selectedLogs.length, showToast]);

    // Open delete confirmation from log detail modal
    const openDeleteFromDetailModal = useCallback((log) => {
        setSelectedLogDetail(null);
        setShowLogDetailModal(false);
        setTimeout(() => {
            setLogToDelete(log.id);
            setDeleteType('single');
            setDeleteModalTitle('Delete Audit Log');
            setDeleteModalMessage(`Are you sure you want to delete audit log #${log.id}? This action cannot be undone.`);
            setShowDeleteLogModal(true);
        }, 100);
    }, []);

    // Audit Log Deletion Operations
    const handleDeleteLog = useCallback(async (logId) => {
        try {
            // Show loading toast
            showToast('info', 'Processing', 'Deleting audit log...');
            
            const token = localStorage.getItem('superAdminToken');
            
            if (!token) {
                showToast('error', 'Authentication Error', 'Please login again');
                setTimeout(() => navigate('/super-admin/login'), 1000);
                return;
            }

            // Try multiple endpoint patterns
            const endpoints = [
                `${API_URL}/audit-logs/${logId}`,
                `${API_URL}/audit-logs/${logId}/`,
                `${BASE_URL}/api/super-admin/audit-logs/${logId}`,
                `${BASE_URL}/api/super-admin/audit-logs/${logId}/`
            ];

            let response = null;
            let lastError = null;

            // Try each endpoint
            for (const endpoint of endpoints) {
                try {
                    console.log('Trying endpoint:', endpoint);
                    
                    response = await fetch(endpoint, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        mode: 'cors'
                    });
                    
                    console.log(`Response from ${endpoint}:`, response.status);
                    
                    if (response.ok) {
                        break; // Success, exit loop
                    }
                } catch (error) {
                    lastError = error;
                    console.log(`Failed on ${endpoint}:`, error.message);
                    continue; // Try next endpoint
                }
            }

            if (!response) {
                throw new Error('All endpoints failed: ' + (lastError?.message || 'Unknown error'));
            }

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.log('Non-JSON response:', text.substring(0, 300));
                
                // Try to parse as JSON anyway (some servers don't set content-type correctly)
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error(`Server returned HTML/error page (${response.status}): ${text.substring(0, 100)}...`);
                }
            }

            console.log('Parsed response:', data);

            if (response.ok && data.success) {
                // Update state
                setAuditLogs(prev => prev.filter(log => log.id !== logId));
                setFilteredLogs(prev => prev.filter(log => log.id !== logId));
                setSelectedLogs(prev => prev.filter(id => id !== logId));
                
                showToast('success', 'Success', `Audit log #${logId} deleted successfully`);
                
                // Refresh data
                fetchData(pagination.page);
            } else {
                showToast('error', 'Error', data?.message || `Delete failed (${response.status})`);
            }

        } catch (error) {
            console.error('Delete failed:', error);
            
            if (error.message.includes('HTML') || error.message.includes('error page')) {
                showToast('error', 'Server Configuration Error', 
                'Backend returned an error page. The DELETE endpoint may not be configured.');
            } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                showToast('error', 'Network Error', 'Cannot connect to server. Check if backend is running.');
            } else if (error.message.includes('401') || error.message.includes('403')) {
                showToast('error', 'Session Expired', 'Please login again');
                setTimeout(() => {
                    localStorage.clear();
                    navigate('/super-admin/login');
                }, 1500);
            } else {
                showToast('error', 'Delete Failed', error.message);
            }
        }
    }, [API_URL, showToast, navigate, fetchData, pagination.page]);

    const handleDeleteMultipleLogs = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/audit-logs`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids: selectedLogs })
            });

            const data = await res.json();

            if (data.success) {
                setAuditLogs(prev => prev.filter(log => !selectedLogs.includes(log.id)));
                setFilteredLogs(prev => prev.filter(log => !selectedLogs.includes(log.id)));
                setSelectedLogs([]);
                showToast('success', 'Logs Deleted', `${data.deletedCount} audit log(s) have been deleted successfully.`);
            } else {
                showToast('error', 'Error', data.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Failed to delete audit logs');
        }
    }, [API_URL, getAuthHeaders, selectedLogs, showToast]);

    // Confirm delete from modal
    const confirmDeleteLog = useCallback(async () => {
        setShowDeleteLogModal(false);
        if (deleteType === 'single' && logToDelete) {
            await handleDeleteLog(logToDelete);
            setLogToDelete(null);
        } else if (deleteType === 'multiple') {
            await handleDeleteMultipleLogs();
        }
    }, [deleteType, logToDelete, handleDeleteLog, handleDeleteMultipleLogs]);

    // Cancel delete
    const cancelDeleteLog = useCallback(() => {
        setShowDeleteLogModal(false);
        setLogToDelete(null);
    }, []);

    const openEditModal = useCallback((admin) => {
        setSelectedAdmin(admin);
        setFormData({
            email: admin.email,
            name: admin.name || '',
            password: ''
        });
        setShowEditModal(true);
    }, []);

    const openDeleteModal = useCallback((admin) => {
        setSelectedAdmin(admin);
        setShowDeleteModal(true);
    }, []);

    const getActionIcon = useCallback((actionType) => {
        switch (actionType) {
            case 'CREATE':
                return '➕';
            case 'UPDATE':
                return '✏️';
            case 'DELETE':
                return <FaTrash className="sa-btn-icon" />;
            case 'ADD_DAYS':
                return '📈';
            case 'SUBTRACT_DAYS':
                return '📉';
            case 'SET_DAYS':
                return '📊';
            default:
                return '📋';
        }
    }, []);

    const getActionColor = useCallback((actionType) => {
        switch (actionType) {
            case 'CREATE':
                return '#28a745';
            case 'UPDATE':
                return '#17a2b8';
            case 'DELETE':
                return '#dc3545';
            case 'ADD_DAYS':
                return '#20c997';
            case 'SUBTRACT_DAYS':
                return '#fd7e14';
            case 'SET_DAYS':
                return '#6f42c1';
            default:
                return '#6c757d';
        }
    }, []);

    const formatDate = useCallback((dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, []);

    // Toggle select all logs
    const toggleSelectAllLogs = useCallback(() => {
        if (selectedLogs.length === paginatedLogs.length && paginatedLogs.length > 0) {
            setSelectedLogs([]);
        } else {
            setSelectedLogs(paginatedLogs.map(log => log.id));
        }
    }, [selectedLogs.length, paginatedLogs]);

    // Get recent activity description
    const getRecentActivityDescription = useCallback((log) => {
        const action = formatActionType(log.action_type).toLowerCase();
        const entity = formatEntityType(log.entity_type).toLowerCase();
        const entityName = log.entity_name || 'item';
        
        return `${entityName} was ${action}`;
    }, [formatActionType, formatEntityType]);

    if (loading) {
        return ( 
            <div className="super-admin-loading">
                <div className="loading-spinner-large"></div> 
                <p>Loading dashboard...</p> 
            </div>
        );
    }

    return ( 
        <div className="super-admin-dashboard"> 
            {/* Header */}
            <header className="sa-header">
                <div className="sa-header-left">
                    <span className="sa-crown">👑</span> 
                    <h1>Super Admin Panel</h1> 
                </div> 
                <div className="sa-header-right">
                    <span className="sa-user"> 
                        {superAdmin?.name || superAdmin?.email} 
                    </span> 
                    <button className="sa-logout-btn" onClick={handleLogout}>
                        Logout 
                    </button> 
                </div> 
            </header>

            {/* Navigation */}
            <nav className="sa-nav">
                <button className={`sa-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}> 
                    📊Dashboard 
                </button> 
                <button className={`sa-nav-btn ${activeTab === 'admins' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admins')}> 
                    👥Admin Management 
                </button> 
                <button className={`sa-nav-btn ${activeTab === 'audit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('audit')}> 
                    📋Audit Logs 
                </button> 
            </nav>

            {/* Main Content */}
            <main className="sa-main"> 
                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && stats && ( 
                    <div className="sa-dashboard">
                        <h2>Overview</h2> 
                        <div className="sa-stats-grid">
                            <div className="sa-stat-card">
                                <div className="sa-stat-icon" style={{ background: '#dc2626' }}>👥</div> 
                                <div className="sa-stat-info">
                                    <h3>{stats.totalAdmins}</h3> 
                                    <p>Total Admins</p> 
                                </div> 
                            </div> 
                            <div className="sa-stat-card">
                                <div className="sa-stat-icon" style={{ background: '#22c55e' }}>👤</div> 
                                <div className="sa-stat-info">
                                    <h3>{stats.totalEmployees}</h3> 
                                    <p>Total Employees</p> 
                                </div> 
                            </div> 
                            <div className="sa-stat-card">
                                <div className="sa-stat-icon" style={{ background: '#f97316' }}>📊</div> 
                                <div className="sa-stat-info">
                                    <h3>{stats.todayActivity}</h3> 
                                    <p>Today's Activity</p> 
                                </div> 
                            </div> 
                        </div>

                        <h3 className="sa-section-title">Recent Activity</h3> 
                        <div className="sa-recent-activity"> 
                            {auditLogs.slice(0, 5).map((log) => ( 
                                <div key={log.id} className="sa-activity-item">
                                    <span className="sa-activity-icon" style={{ color: getActionColor(log.action_type) }}> 
                                        {getActionIcon(log.action_type)} 
                                    </span> 
                                    <div className="sa-activity-info">
                                        <p>{getRecentActivityDescription(log)}</p>
                                        <span>
                                            by {log.performed_by_name} • {formatDate(log.created_at)} 
                                        </span> 
                                    </div> 
                                </div>
                            ))} 
                        </div> 
                    </div>
                )}

                {/* Admin Management Tab */}
                {activeTab === 'admins' && ( 
                    <div className="sa-admins">
                        <div className="sa-admins-header">
                            <h2>Admin Management</h2> 
                            <button className="sa-add-btn" onClick={() => setShowAddModal(true)}>
                                +Add Admin 
                            </button> 
                        </div>

                        <div className="sa-table-container">
                            <table className="sa-table">
                                <thead>
                                    <tr>
                                        <th>Name</th> 
                                        <th>Email</th> 
                                        <th>Status</th> 
                                        <th>Last Login</th> 
                                        <th>Created</th> 
                                        <th>Actions</th> 
                                    </tr> 
                                </thead> 
                                <tbody> 
                                    {admins.map((admin) => ( 
                                        <tr key={admin.id}>
                                            <td>{admin.name || '-'}</td> 
                                            <td>{admin.email}</td> 
                                            <td>
                                                <span className={`sa-status ${admin.is_active ? 'active' : 'inactive'}`}> 
                                                    {admin.is_active ? 'Active' : 'Inactive'} 
                                                </span> 
                                            </td> 
                                            <td>{admin.last_login ? formatDate(admin.last_login) : 'Never'}</td> 
                                            <td>{formatDate(admin.created_at)}</td> 
                                            <td className="sa-actions">
                                                <button className="sa-action-btn toggle" onClick={() => handleToggleActive(admin)}
                                                    title={admin.is_active ? 'Deactivate' : 'Activate'}> 
                                                    {admin.is_active ? '🔒' : '🔓'} 
                                                </button> 
                                                <button className="sa-action-btn edit" onClick={() => openEditModal(admin)}
                                                    title="Edit"> 
                                                    ✏️
                                                </button> 
                                                <button className="sa-action-btn delete" onClick={() => openDeleteModal(admin)}
                                                    title="Delete"> 
                                                  <FaTrash className="sa-btn-icon" />
                                                </button> 
                                            </td> 
                                        </tr>
                                    ))} 
                                </tbody> 
                            </table> 
                        </div> 
                    </div>
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'audit' && (
                    <div className="sa-audit">
                        {/* Floating Bulk Delete Bar */}
                        {selectedLogs.length > 0 && (
                            <div className="sa-bulk-action-bar">
                                <div className="sa-bulk-action-content">
                                    <span className="sa-bulk-count">
                                        {selectedLogs.length} log{selectedLogs.length > 1 ? 's' : ''} selected
                                    </span>
                                    <div className="sa-bulk-buttons">
                                        <button
                                            className="sa-bulk-cancel-btn"
                                            onClick={() => setSelectedLogs([])}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="sa-bulk-delete-btn"
                                            onClick={openDeleteMultipleModal}
                                        >
                                             <FaTrash className="sa-btn-icon" /> Delete Selected
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="sa-audit-header-section">
                            <div>
                                <h2>Audit Logs</h2>
                                <p className="sa-audit-subtitle">
                                    {filteredLogs.length > 0
                                        ? `Showing ${paginatedLogs.length} of ${filteredLogs.length} filtered audit logs`
                                        : 'No audit logs found'}
                                </p>
                            </div>
                            <div className="sa-audit-actions">
                                <button
                                    className="sa-refresh-btn"
                                    onClick={() => fetchData(pagination.page)}
                                    title="Refresh Logs"
                                >
                                    🔄 Refresh
                                </button>
                            </div>
                        </div>

                        {/* Quick Search Bar */}
                        <div className="sa-quick-search">
                            <div className="sa-search-container">
                                <input
                                    type="text"
                                    placeholder="Search by employee or admin name..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className="sa-search-input"
                                />
                            </div>
                        </div>

                        {filteredLogs.length === 0 ? (
                            <div className="sa-empty-state">
                                <div className="sa-empty-icon">📊</div>
                                <h3>No audit logs found</h3>
                                <p>
                                    {searchTerm
                                        ? 'Try adjusting your search criteria'
                                        : 'Activity will appear here once admins start making changes.'}
                                </p>
                                {searchTerm && (
                                    <button
                                        className="sa-clear-filters-btn"
                                        onClick={() => handleSearchChange('')}
                                        style={{ marginTop: '1rem' }}
                                    >
                                        Clear Search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="sa-table-container">
                                    <table className="sa-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLogs.length === paginatedLogs.length && paginatedLogs.length > 0}
                                                        onChange={toggleSelectAllLogs}
                                                        title="Select all"
                                                    />
                                                </th>
                                                <th>Action</th>
                                                <th>Entity</th>
                                                <th>Employee</th>
                                                <th>Admin</th>
                                                <th>Changes</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedLogs.map((log) => {
                                                const getEmployeeNumber = () => {
                                                    try {
                                                        return log.new_values?.employee_number || 
                                                               log.old_values?.employee_number || 
                                                               'N/A';
                                                    } catch (e) {
                                                        return 'N/A';
                                                    }
                                                };

                                                return (
                                                    <tr key={log.id}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedLogs.includes(log.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedLogs(prev => [...prev, log.id]);
                                                                    } else {
                                                                        setSelectedLogs(prev => prev.filter(id => id !== log.id));
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <span className="sa-audit-action" 
                                                                style={{ 
                                                                    color: getActionColor(log.action_type),
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                {getActionIcon(log.action_type)} {log.formatted_action_type || formatActionType(log.action_type)}
                                                            </span>
                                                        </td>
                                                        <td>{log.formatted_entity_type || formatEntityType(log.entity_type)}</td>
                                                        <td>
                                                            <strong>{log.entity_name}</strong>
                                                            <br />
                                                            <small>Employee #: {getEmployeeNumber()}</small>
                                                        </td>
                                                        <td>
                                                            <strong>{log.performed_by_name}</strong>
                                                            <br />
                                                            <small>({log.performed_by_type})</small>
                                                        </td>
                                                        <td>
                                                            <div className="sa-change-summary-compact">
                                                                {getFormattedChange(log).split('\n').slice(0, 2).map((line, idx) => (
                                                                    <div key={idx} className="sa-change-line">{line}</div>
                                                                ))}
                                                                {getFormattedChange(log).split('\n').length > 2 && (
                                                                    <span className="sa-more-changes">+{getFormattedChange(log).split('\n').length - 2} more</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {formatDate(log.created_at)}
                                                            <br />
                                                            <small>{new Date(log.created_at).toLocaleDateString()}</small>
                                                        </td>
                                                        <td className="sa-actions-cell">
                                                            <button
                                                                className="sa-action-btn view"
                                                                onClick={() => {
                                                                    setSelectedLogDetail(log);
                                                                    setShowLogDetailModal(true);
                                                                }}
                                                                title="View details"
                                                            >
                                                                 <FaEye className="sa-btn-icon" />
                                                            </button>
                                                            <button
                                                                className="sa-action-btn delete"
                                                                onClick={() => openDeleteLogModal(log.id)}
                                                                title="Delete"
                                                            >
                                                                 <FaTrash className="sa-btn-icon" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className="sa-pagination">
                                    <div className="sa-pagination-controls">
                                        <button
                                            className="sa-page-btn"
                                            onClick={() => handleClientPageChange(1)}
                                            disabled={clientPagination.page === 1}
                                            title="First page"
                                        >
                                            ⟪ First
                                        </button>
                                        <button
                                            className="sa-page-btn"
                                            onClick={() => handleClientPageChange(clientPagination.page - 1)}
                                            disabled={clientPagination.page === 1}
                                        >
                                            ← Prev
                                        </button>

                                        <div className="sa-page-numbers">
                                            {/* Show limited page numbers with ellipsis */}
                                            {(() => {
                                                const pages = [];
                                                const totalPages = clientTotalPages || 1;
                                                const current = clientPagination.page;

                                                if (totalPages <= 7) {
                                                    // Show all pages if 7 or fewer
                                                    for (let i = 1; i <= totalPages; i++) {
                                                        pages.push(i);
                                                    }
                                                } else {
                                                    // Always show first page
                                                    pages.push(1);

                                                    if (current > 3) {
                                                        pages.push('...');
                                                    }

                                                    // Show pages around current
                                                    const start = Math.max(2, current - 1);
                                                    const end = Math.min(totalPages - 1, current + 1);

                                                    for (let i = start; i <= end; i++) {
                                                        if (!pages.includes(i)) {
                                                            pages.push(i);
                                                        }
                                                    }

                                                    if (current < totalPages - 2) {
                                                        pages.push('...');
                                                    }

                                                    // Always show last page
                                                    if (!pages.includes(totalPages)) {
                                                        pages.push(totalPages);
                                                    }
                                                }

                                                return pages.map((pageNum, idx) => (
                                                    pageNum === '...' ? (
                                                        <span key={`ellipsis-${idx}`} className="sa-page-ellipsis">...</span>
                                                    ) : (
                                                        <button
                                                            key={pageNum}
                                                            className={`sa-page-num ${clientPagination.page === pageNum ? 'active' : ''}`}
                                                            onClick={() => handleClientPageChange(pageNum)}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    )
                                                ));
                                            })()}
                                        </div>

                                        <button
                                            className="sa-page-btn"
                                            onClick={() => handleClientPageChange(clientPagination.page + 1)}
                                            disabled={clientPagination.page >= clientTotalPages}
                                        >
                                            Next →
                                        </button>
                                        <button
                                            className="sa-page-btn"
                                            onClick={() => handleClientPageChange(clientTotalPages)}
                                            disabled={clientPagination.page >= clientTotalPages}
                                            title="Last page"
                                        >
                                            Last ⟫
                                        </button>
                                    </div>

                                    <div className="sa-pagination-info">
                                        <span className="sa-page-info">
                                            Page {clientPagination.page} of {clientTotalPages || 1} | Showing {((clientPagination.page - 1) * clientPagination.limit) + 1}-{Math.min(clientPagination.page * clientPagination.limit, filteredLogs.length)} of {filteredLogs.length} logs
                                        </span>

                                        <div className="sa-page-size-selector">
                                            <label>Rows per page:</label>
                                            <select
                                                value={clientPagination.limit}
                                                onChange={(e) => {
                                                    const newLimit = parseInt(e.target.value);
                                                    setClientPagination({ page: 1, limit: newLimit });
                                                }}
                                                className="sa-page-size-select"
                                            >
                                                <option value={10}>10</option>
                                                <option value={25}>25</option>
                                                <option value={50}>50</option>
                                                <option value={100}>100</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Add Admin Modal */}
            {showAddModal && ( 
                <div className="sa-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Add New Admin</h3> 
                        <form onSubmit={handleAddAdmin}>
                            <div className="sa-form-group">
                                <label>Name</label> 
                                <input type="text" value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Enter name" />
                            </div> 
                            <div className="sa-form-group">
                                <label>Email *</label> 
                                <input type="email" value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="Enter email" required />
                            </div> 
                            <div className="sa-form-group">
                                <label>Password *</label> 
                                <input type="password" value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    placeholder="Enter password" required />
                            </div> 
                            <div className="sa-modal-actions">
                                <button type="button" className="sa-cancel-btn" onClick={() => setShowAddModal(false)}>
                                    Cancel 
                                </button> 
                                <button type="submit" className="sa-submit-btn">
                                    Add Admin 
                                </button> 
                            </div> 
                        </form> 
                    </div> 
                </div>
            )}

            {/* Edit Admin Modal */}
            {showEditModal && selectedAdmin && ( 
                <div className="sa-modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Edit Admin</h3> 
                        <form onSubmit={handleEditAdmin}>
                            <div className="sa-form-group">
                                <label>Name</label> 
                                <input type="text" value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Enter name" />
                            </div> 
                            <div className="sa-form-group">
                                <label>Email *</label> 
                                <input type="email" value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="Enter email" required />
                            </div> 
                            <div className="sa-form-group">
                                <label>New Password (leave blank to keep current)</label> 
                                <input type="password" value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    placeholder="Enter new password" />
                            </div> 
                            <div className="sa-modal-actions">
                                <button type="button" className="sa-cancel-btn" onClick={() => setShowEditModal(false)}>
                                    Cancel 
                                </button> 
                                <button type="submit" className="sa-submit-btn">
                                    Save Changes 
                                </button> 
                            </div> 
                        </form> 
                    </div> 
                </div>
            )}

            {/* Delete Admin Modal */}
            {showDeleteModal && selectedAdmin && ( 
                <div className="sa-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="sa-modal sa-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete Admin</h3> 
                        <p>
                            Are you sure you want to delete <strong>{selectedAdmin.name || selectedAdmin.email}</strong>? 
                        </p> 
                        <p className="sa-warning">This action cannot be undone.</p> 
                        <div className="sa-modal-actions">
                            <button type="button" className="sa-cancel-btn" onClick={() => setShowDeleteModal(false)}>
                                Cancel 
                            </button> 
                            <button type="button" className="sa-delete-btn" onClick={handleDeleteAdmin}>
                                Delete 
                            </button> 
                        </div> 
                    </div> 
                </div>
            )}

            {/* Delete Audit Log Confirmation Modal */}
            {showDeleteLogModal && (
                <div className="sa-modal-overlay" onClick={cancelDeleteLog}>
                    <div className="sa-modal sa-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>{deleteModalTitle}</h3> 
                        <p>
                            {deleteModalMessage}
                        </p> 
                        <p className="sa-warning">⚠️ This action cannot be undone.</p> 
                        <div className="sa-modal-actions">
                            <button type="button" className="sa-cancel-btn" onClick={cancelDeleteLog}>
                                Cancel 
                            </button> 
                            <button type="button" className="sa-delete-btn" onClick={confirmDeleteLog}>
                                 <FaTrash className="sa-btn-icon" /> Delete
                            </button> 
                        </div> 
                    </div> 
                </div>
            )}

           {/* Log Detail Modal */}
{showLogDetailModal && selectedLogDetail && (
    <div className="sa-modal-overlay" onClick={() => setShowLogDetailModal(false)}>
        <div className="sa-modal sa-log-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
                <div className="sa-modal-header-content">
                    <div className="sa-modal-title-section">
                        <div className="sa-modal-icon" style={{ color: getActionColor(selectedLogDetail.action_type) }}>
                            {getActionIcon(selectedLogDetail.action_type)}
                        </div>
                        <div>
                            <h3>Audit Log Details</h3>
                        </div>
                    </div>
                    <button
                        className="sa-modal-close"
                        onClick={() => setShowLogDetailModal(false)}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="sa-modal-body">
                <div className="sa-log-summary-section">
                    <div className="sa-log-summary-card">
                        <div className="sa-summary-item">
                            <span className="sa-summary-label">Action:</span>
                            <span 
                                className="sa-summary-value sa-action-badge"
                                style={{ 
                                    color: getActionColor(selectedLogDetail.action_type),
                                    backgroundColor: `${getActionColor(selectedLogDetail.action_type)}15`
                                }}
                            >
                                {selectedLogDetail.formatted_action_type || formatActionType(selectedLogDetail.action_type)}
                            </span>
                        </div>
                        <div className="sa-summary-item">
                            <span className="sa-summary-label">Entity:</span>
                            <span className="sa-summary-value">
                                <strong>{selectedLogDetail.entity_name}</strong>
                                <span className="sa-entity-type">
                                    ({selectedLogDetail.formatted_entity_type || formatEntityType(selectedLogDetail.entity_type)})
                                </span>
                            </span>
                        </div>
                        <div className="sa-summary-item">
                            <span className="sa-summary-label">Performed By:</span>
                            <span className="sa-summary-value">
                                <strong>{selectedLogDetail.performed_by_name}</strong>
                                <span className="sa-performer-type">
                                    ({selectedLogDetail.performed_by_type})
                                </span>
                            </span>
                        </div>
                        <div className="sa-summary-item">
                            <span className="sa-summary-label">Date & Time:</span>
                            <span className="sa-summary-value">
                                {formatDate(selectedLogDetail.created_at)}
                            </span>
                        </div>
                    </div>

                    {selectedLogDetail.description && (
                        <div className="sa-description-card">
                            <h4>Description</h4>
                            <p className="sa-description-text">{selectedLogDetail.description}</p>
                        </div>
                    )}
                </div>

                <div className="sa-log-detail-section">
                    <div className="sa-section-header">
                        <h4>Changes Made</h4>
                        <span className="sa-section-badge">
                            {getFormattedChange(selectedLogDetail).split('\n').length} change(s)
                        </span>
                    </div>
                    <div className="sa-changes-list">
                        {getFormattedChange(selectedLogDetail).split('\n').map((line, idx) => (
                            <div key={idx} className="sa-change-item">
                                <span className="sa-change-icon">→</span>
                                <span className="sa-change-text">{line}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sa-values-comparison-section">
                    <div className="sa-section-header">
                        <h4>Values Comparison</h4>
                    </div>
                    <div className="sa-values-grid">
                        <div className="sa-values-card sa-old-values">
                            <div className="sa-values-header">
                                <h5>Before</h5>
                                <span className="sa-values-badge">Old Values</span>
                            </div>
                            <div className="sa-values-content">
                                <pre>{formatValuesAsText(selectedLogDetail.old_values)}</pre>
                            </div>
                        </div>
                        <div className="sa-values-card sa-new-values">
                            <div className="sa-values-header">
                                <h5>After</h5>
                                <span className="sa-values-badge">New Values</span>
                            </div>
                            <div className="sa-values-content">
                                <pre>{formatValuesAsText(selectedLogDetail.new_values)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="sa-modal-footer">
                <div className="sa-modal-actions">
                    <button
                        type="button"
                        className="sa-cancel-btn"
                        onClick={() => setShowLogDetailModal(false)}
                    >
                        Close
                    </button>
       <button
  type="button"
  className="sa-delete-btn"
  onClick={() => openDeleteFromDetailModal(selectedLogDetail)}
>
  <FaTrash className="sa-btn-icon" />
  Delete This Log
</button>
                </div>
            </div>
        </div>
    </div>
)}

            {/* Toast Notification */}
            {toast.show && (
                <div className={`sa-toast ${toast.hiding ? 'hiding' : ''}`}>
                    <div className="sa-toast-content">
                        <div className={`sa-toast-icon ${toast.type}`}>
                            {toast.type === 'success' && '✓'}
                            {toast.type === 'error' && '✕'}
                            {toast.type === 'warning' && '⚠'}
                        </div>
                        <div className="sa-toast-message">
                            <h4>{toast.title}</h4>
                            <p>{toast.message}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SuperAdminDashboard;