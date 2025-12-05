'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users as UsersIcon, Shield, Globe, User, MapPin, Phone, Building, Search, Wifi, WifiOff, ArrowUpDown, Server, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [systemUsers, setSystemUsers] = useState([]); // Agents and Technicians
    const [pendingRegistrations, setPendingRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [reviewFormData, setReviewFormData] = useState({});
    const [editMode, setEditMode] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [customersData, setCustomersData] = useState({});
    const [activeConnections, setActiveConnections] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [formData, setFormData] = useState({
        name: '',
        password: '',
        profile: 'default',
        service: '',
        customerNumber: '',
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        agentId: '',
        technicianId: ''
    });

    const [connections, setConnections] = useState([]);
    const [selectedRouterIds, setSelectedRouterIds] = useState([]);

    useEffect(() => {
        fetchUsers();
        fetchProfiles();
        fetchCustomersData();
        fetchSystemUsers();
        fetchActiveConnections();
        fetchConnections();
        fetchPendingRegistrations();

        // Refresh active connections every 10 seconds
        const interval = setInterval(fetchActiveConnections, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchConnections = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            if (data.connections) {
                setConnections(data.connections);
                // Default to active connection or all? Let's default to active.
                if (data.activeConnectionId) {
                    setSelectedRouterIds([data.activeConnectionId]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch connections', error);
        }
    };

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                setUserRole(data.user.role);
                setCurrentUserId(data.user.id);
            })
            .catch(err => console.error('Failed to fetch user role', err));
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/pppoe/users');
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/pppoe/profiles');
            if (res.ok) {
                setProfiles(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        }
    };

    const fetchSystemUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                setSystemUsers(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch system users', error);
        }
    };

    const fetchCustomersData = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            setCustomersData(data);
        } catch (error) {
            console.error('Failed to fetch customers data', error);
        }
    };

    const fetchActiveConnections = async () => {
        try {
            const res = await fetch('/api/pppoe/active');
            if (res.ok) {
                const data = await res.json();
                setActiveConnections(data);
            }
        } catch (error) {
            console.error('Failed to fetch active connections', error);
        }
    };

    const fetchPendingRegistrations = async () => {
        try {
            const res = await fetch('/api/registrations');
            if (res.ok) {
                setPendingRegistrations(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch pending registrations', error);
        }
    };

    const handleReview = (reg) => {
        setSelectedRegistration(reg);

        if (reg.type === 'edit') {
            setReviewFormData({
                username: reg.newValues?.username || '',
                password: reg.newValues?.password || '',
                profile: reg.newValues?.profile || '',
                service: reg.newValues?.service || 'pppoe',
                name: reg.newValues?.name || '',
                address: reg.newValues?.address || '',
                phone: reg.newValues?.phone || '',
                agentId: reg.newValues?.agentId || ''
            });
        } else if (reg.type === 'delete') {
            setReviewFormData({});
        } else {
            // Register (default)
            setReviewFormData({
                username: reg.registrationData?.name || reg.username,
                password: reg.registrationData?.password || '',
                profile: reg.registrationData?.profile || '',
                service: reg.registrationData?.service || 'pppoe',
                name: reg.name || '',
                address: reg.address || '',
                phone: reg.phone || '',
                agentId: reg.agentId || ''
            });
        }
        setShowReviewModal(true);
    };

    const handleRegistrationAction = async (username, action) => {
        if (!confirm(`Are you sure you want to ${action} this registration?`)) return;

        try {
            const body = { username, action };
            if (action === 'approve') {
                body.updatedData = reviewFormData;
            }

            const res = await fetch('/api/registrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setShowReviewModal(false); // Close modal if open
                fetchPendingRegistrations();
                if (action === 'approve') {
                    fetchUsers();
                    fetchCustomersData();
                }
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (error) {
            console.error('Action failed', error);
            alert('Action failed');
        }
    };

    const isUserOnline = (username) => {
        return activeConnections.some(conn => conn.name === username);
    };

    const filteredUsers = users.filter(user => {
        const searchLower = searchTerm.toLowerCase();
        const customerName = customersData[user.name]?.name || '';
        return user.name.toLowerCase().includes(searchLower) ||
            user.profile?.toLowerCase().includes(searchLower) ||
            user.service?.toLowerCase().includes(searchLower) ||
            customerName.toLowerCase().includes(searchLower);
    });

    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedUsers = () => {
        const filtered = filteredUsers;
        if (!sortConfig.key) return filtered;

        const sorted = [...filtered].sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                case 'status':
                    aVal = isUserOnline(a.name) ? 1 : 0;
                    bVal = isUserOnline(b.name) ? 1 : 0;
                    break;
                case 'username':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'customer':
                    aVal = getCustomerName(a.name).toLowerCase();
                    bVal = getCustomerName(b.name).toLowerCase();
                    break;
                case 'profile':
                    aVal = (a.profile || '').toLowerCase();
                    bVal = (b.profile || '').toLowerCase();
                    break;
                case 'service':
                    aVal = (a.service || '').toLowerCase();
                    bVal = (b.service || '').toLowerCase();
                    break;
                case 'usage':
                    // Sort by total usage (rx + tx)
                    aVal = (a.usage?.rx || 0) + (a.usage?.tx || 0);
                    bVal = (b.usage?.rx || 0) + (b.usage?.tx || 0);
                    break;
                default:
                    aVal = a[sortConfig.key] || '';
                    bVal = b[sortConfig.key] || '';
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Partner Edit Request
        if (userRole === 'partner' && editMode) {
            try {
                const res = await fetch('/api/registrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'edit',
                        targetUsername: editingUserId, // This is actually the ID or Name? editingUserId is ID. But backend expects targetUsername.
                        // Wait, editingUserId is set to user['.id'] in handleEdit.
                        // But my backend logic expects targetUsername to be the name for finding the user.
                        // Let's check handleEdit. It sets editingUserId = user['.id'].
                        // I should probably pass the username (name) as targetUsername.
                        // In handleEdit, I have user.name. I should store it or retrieve it.
                        // I can use formData.name as targetUsername since name usually doesn't change, or if it does, the old name is needed.
                        // Actually, if name is changed, I need the OLD name to find the user.
                        // I should store the original username when entering edit mode.
                        targetUsername: formData.originalName || formData.name,
                        newValues: {
                            username: formData.name,
                            password: formData.password,
                            profile: formData.profile,
                            service: formData.service,
                            name: formData.customerName,
                            address: formData.customerAddress,
                            phone: formData.customerPhone,
                            agentId: formData.agentId,
                            technicianId: formData.technicianId
                        },
                        agentId: currentUserId
                    }),
                });

                if (res.ok) {
                    alert('Edit request submitted for approval.');
                    handleCloseModal();
                    fetchPendingRegistrations();
                } else {
                    const data = await res.json();
                    alert('Failed to submit edit request: ' + data.error);
                }
            } catch (error) {
                console.error('Failed to submit edit request', error);
                alert('Error submitting request.');
            }
            return;
        }

        try {
            const url = editMode ? `/api/pppoe/users/${encodeURIComponent(editingUserId)}` : '/api/pppoe/users';
            const method = editMode ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    password: formData.password,
                    profile: formData.profile,
                    service: formData.service,
                    routerIds: selectedRouterIds
                }),
            });

            if (res.ok) {
                const data = await res.json();

                if (data.message && data.message.includes('approval')) {
                    alert(data.message);
                    handleCloseModal();
                    return; // Stop here for pending registrations
                }

                // Save customer details
                await fetch('/api/customers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: formData.name,
                        customerNumber: formData.customerNumber,
                        name: formData.customerName,
                        address: formData.customerAddress,
                        phone: formData.customerPhone,
                        agentId: formData.agentId,
                        technicianId: formData.technicianId
                    })
                });

                handleCloseModal();
                fetchUsers();
                fetchCustomersData();
                fetchUsers();
                fetchCustomersData();
            } else {
                const data = await res.json();
                alert('Failed to save user: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to save user', error);
            alert('An error occurred while saving the user.');
        }
    };

    const handleEdit = async (user) => {
        setEditMode(true);
        setEditingUserId(user['.id']);
        // Store original name for edit request
        setFormData(prev => ({ ...prev, originalName: user.name }));

        // Fetch customer details
        try {
            const res = await fetch(`/api/customers/${encodeURIComponent(user.name)}`);
            const customerData = await res.json();

            setFormData({
                originalName: user.name, // Store original name
                name: user.name,
                password: '',
                profile: user.profile || 'default',
                service: user.service || '',
                customerNumber: customerData.customerNumber || '',
                customerName: customerData.name || '',
                customerAddress: customerData.address || '',
                customerPhone: customerData.phone || '',
                agentId: customerData.agentId || '',
                technicianId: customerData.technicianId || ''
            });
        } catch (error) {
            setFormData({
                originalName: user.name,
                name: user.name,
                password: '',
                profile: user.profile || 'default',
                service: user.service || '',
                customerNumber: '',
                customerName: '',
                customerAddress: '',
                customerPhone: '',
                agentId: '',
                technicianId: ''
            });
        }

        setShowModal(true);
    };

    const handleDelete = async (user) => {
        if (!confirm(`Are you sure you want to delete user ${user.name}?`)) return;

        // Partner Delete Request
        if (userRole === 'partner') {
            try {
                const res = await fetch('/api/registrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'delete',
                        targetUsername: user.name,
                        agentId: currentUserId
                    }),
                });

                if (res.ok) {
                    alert('Delete request submitted for approval.');
                    fetchPendingRegistrations();
                } else {
                    const data = await res.json();
                    alert('Failed to submit delete request: ' + data.error);
                }
            } catch (error) {
                console.error('Failed to submit delete request', error);
                alert('Error submitting request.');
            }
            return;
        }

        try {
            // Delete from Mikrotik
            const encodedId = encodeURIComponent(user['.id']);
            const res = await fetch(`/api/pppoe/users/${encodedId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Delete customer data
                try {
                    await fetch(`/api/customers/${user.name}`, {
                        method: 'DELETE'
                    });
                } catch (err) {
                    console.error('Failed to delete customer data', err);
                }

                fetchUsers();
                fetchCustomersData();
            } else {
                const data = await res.json();
                alert(`Failed to delete user: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user. See console for details.');
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditMode(false);
        setEditingUserId(null);
        setFormData({
            name: '',
            password: '',
            profile: 'default',
            service: '',
            customerNumber: '',
            customerName: '',
            customerAddress: '',
            customerPhone: '',
            agentId: '',
            technicianId: ''
        });
    };

    const getCustomerName = (username) => {
        return customersData[username]?.name || username;
    };

    const handleGenerateMissingNumbers = async () => {
        if (!confirm('This will generate customer numbers for all users who don\'t have one. Continue?')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/customers/generate-missing', {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                fetchCustomersData();
                fetchUsers();
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (error) {
            console.error('Error generating numbers:', error);
            alert('An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">PPPoE Users</h1>
                <div className="flex gap-2">
                    {userRole !== 'partner' && (
                        <button
                            onClick={handleGenerateMissingNumbers}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
                            title="Generate missing customer numbers"
                        >
                            <RefreshCw size={20} /> Generate Numbers
                        </button>
                    )}
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} /> Register User
                    </button>
                </div>
            </div>

            {/* Pending Registrations (Admin & Partner) */}
            {((userRole === 'admin' || userRole === 'partner') && pendingRegistrations.length > 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h2 className="text-xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
                        <Clock className="text-yellow-600" /> Pending Registrations
                    </h2>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    {userRole === 'admin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {pendingRegistrations
                                    .filter(reg => userRole === 'admin' || (userRole === 'partner' && reg.agentId === currentUserId))
                                    .map((reg) => (
                                        <tr key={reg.username}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.targetUsername || reg.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${reg.type === 'delete' ? 'bg-red-100 text-red-800' :
                                                    reg.type === 'edit' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                    {reg.type === 'edit' ? 'Edit' : reg.type === 'delete' ? 'Delete' : 'Register'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {reg.registrationData?.profile} / {reg.registrationData?.service}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-medium">
                                                Pending Review
                                            </td>
                                            {userRole === 'admin' && (
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => handleReview(reg)}
                                                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                                    >
                                                        <Edit2 size={18} /> Review
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Users</p>
                            <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <UsersIcon size={24} className="text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Online</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {users.filter(u => isUserOnline(u.name)).length}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <Wifi size={24} className="text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Offline</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {users.length - users.filter(u => isUserOnline(u.name)).length}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-full">
                            <WifiOff size={24} className="text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-md p-4">
                <div className="relative">
                    <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by username, profile, service, or customer name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    onClick={() => sortData('status')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-1">
                                        Status
                                        <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => sortData('username')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-1">
                                        Username
                                        <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => sortData('customer')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-1">
                                        Customer Name
                                        <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cust Number
                                </th>
                                <th
                                    onClick={() => sortData('profile')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-1">
                                        Profile
                                        <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => sortData('service')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-1">
                                        Service
                                        <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    onClick={() => sortData('usage')}
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-1">
                                        Monthly Usage
                                        <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : getSortedUsers().length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">No users found</td>
                                </tr>
                            ) : (
                                getSortedUsers().map((user) => (
                                    <tr key={user['.id']} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isUserOnline(user.name) ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                    <Wifi size={14} /> Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    <WifiOff size={14} /> Offline
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {user.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {getCustomerName(user.name)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {customersData[user.name]?.customerNumber || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.profile || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {user.service || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex flex-col text-xs">
                                                <span className="text-green-600">↓ {formatBytes(user.usage?.tx || 0)}</span>
                                                <span className="text-blue-600">↑ {formatBytes(user.usage?.rx || 0)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit User Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-2xl font-bold mb-4 text-gray-800">
                                {editMode ? 'Edit User' : 'Register New User'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* PPPoE Details */}
                                <div className="border-b pb-4">
                                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                        <Shield size={20} /> PPPoE Credentials
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={editMode}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                            <input
                                                type="password"
                                                required={!editMode}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder={editMode ? "Leave blank to keep current" : ""}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
                                            <select
                                                value={formData.profile}
                                                onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="default">Default</option>
                                                {profiles.map(profile => (
                                                    <option key={profile['.id']} value={profile.name}>{profile.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                                            <input
                                                type="text"
                                                value={formData.service}
                                                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>



                                {/* Router Selection */}
                                {!editMode && (
                                    <div className="border-b pb-4">
                                        <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                            <Server size={20} /> Target Routers
                                        </h3>
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500 mb-2">Select which routers to add this user to:</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {connections.map(conn => (
                                                    <label key={conn.id} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedRouterIds.includes(conn.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedRouterIds([...selectedRouterIds, conn.id]);
                                                                } else {
                                                                    setSelectedRouterIds(selectedRouterIds.filter(id => id !== conn.id));
                                                                }
                                                            }}
                                                            className="rounded text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <div className="font-medium text-sm text-gray-800">{conn.name}</div>
                                                            <div className="text-xs text-gray-500">{conn.host}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Customer Details */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
                                        <User size={20} /> Customer Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                <Building size={16} /> Customer Name
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerName}
                                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Real name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                <User size={16} /> Cust Number
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerNumber}
                                                onChange={(e) => setFormData({ ...formData, customerNumber: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="Leave blank to auto-generate"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                <Phone size={16} /> Phone Number
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customerPhone}
                                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                placeholder="08xx..."
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                                <MapPin size={16} /> Address
                                            </label>
                                            <textarea
                                                value={formData.customerAddress}
                                                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                rows="2"
                                                placeholder="Full address"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Agent and Technician Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
                                        <select
                                            value={formData.agentId}
                                            onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select Agent --</option>
                                            {systemUsers.filter(u => u.isAgent).map(user => (
                                                <option key={user.id} value={user.id}>{user.username}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                                        <select
                                            value={formData.technicianId}
                                            onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Select Technician --</option>
                                            {systemUsers.filter(u => u.isTechnician).map(user => (
                                                <option key={user.id} value={user.id}>{user.username}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {editMode ? 'Update User' : 'Create User'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Review Modal */}
            <AnimatePresence>
                {showReviewModal && selectedRegistration && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                                <Shield size={24} className="text-blue-600" />
                                {selectedRegistration.type === 'delete' ? 'Review Delete Request' :
                                    selectedRegistration.type === 'edit' ? 'Review Edit Request' :
                                        'Review Registration'}
                            </h2>

                            {selectedRegistration.type === 'delete' ? (
                                <div className="space-y-6">
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                                        <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="text-red-600" /> Warning: Delete User
                                        </h3>
                                        <p className="text-red-700 text-lg mb-4">
                                            Are you sure you want to approve the deletion of user <strong>{selectedRegistration.targetUsername}</strong>?
                                        </p>
                                        <p className="text-red-600 text-sm">
                                            This action cannot be undone. The user will be removed from Mikrotik and all customer data will be deleted.
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'reject')}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'approve')}
                                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Approve Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* PPPoE Details */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">PPPoE Account</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500">Username</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.username}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, username: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Password</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.password}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, password: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Profile</label>
                                                <select
                                                    value={reviewFormData.profile}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, profile: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                >
                                                    <option value="">-- Select Profile --</option>
                                                    {profiles.map(p => (
                                                        <option key={p.name} value={p.name}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Service</label>
                                                <select
                                                    value={reviewFormData.service}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, service: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                >
                                                    <option value="pppoe">pppoe</option>
                                                    <option value="hotspot">hotspot</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer Details */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Customer Details</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500">Name</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.name}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, name: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Phone</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.phone}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, phone: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-xs text-gray-500">Address</label>
                                                <input
                                                    type="text"
                                                    value={reviewFormData.address}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, address: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agent Info */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">Registration Info</h3>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 mr-4">
                                                <label className="text-xs text-gray-500 block mb-1">Registered By (Agent)</label>
                                                <select
                                                    value={reviewFormData.agentId}
                                                    onChange={(e) => setReviewFormData({ ...reviewFormData, agentId: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                                >
                                                    <option value="">-- No Agent --</option>
                                                    {systemUsers.filter(u => u.isAgent).map(user => (
                                                        <option key={user.id} value={user.id}>{user.username}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Date: {new Date().toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t">
                                        <button
                                            onClick={() => setShowReviewModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'reject')}
                                            className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <XCircle size={18} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleRegistrationAction(selectedRegistration.username, 'approve')}
                                            className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Approve
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
