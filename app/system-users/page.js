'use client';

import { useState, useEffect } from 'react';
import { Edit2, Plus, Trash2, Shield, ShieldAlert, User } from 'lucide-react';

export default function SystemUsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'viewer',
        isAgent: false,
        isTechnician: false,
        agentRate: 0,
        technicianRate: 0,
        prefix: '',
        fullName: '',
        phone: '',
        address: '',
        agentNumber: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const url = editMode ? `/api/admin/users/${selectedUser.id}` : '/api/admin/users';
            const method = editMode ? 'PUT' : 'POST';

            const body = { ...formData };
            if (editMode && !body.password) {
                delete body.password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                resetForm();
                fetchUsers();
            } else {
                setError(data.error || 'Operation failed');
            }
        } catch (error) {
            setError('Failed to save user');
        }
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username || '',
            password: '',
            role: user.role || 'viewer',
            isAgent: user.isAgent || false,
            isTechnician: user.isTechnician || false,
            agentRate: user.agentRate || 0,
            technicianRate: user.technicianRate || 0,
            prefix: user.prefix || '',
            fullName: user.fullName || '',
            phone: user.phone || '',
            address: user.address || '',
            agentNumber: user.agentNumber || ''
        });
        setEditMode(true);
        setShowModal(true);
        setError('');
    };

    const handleDelete = (user) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;

        try {
            const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setShowDeleteModal(false);
                setUserToDelete(null);
                fetchUsers();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Failed to delete user', error);
            alert('Failed to delete user');
        }
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            role: 'viewer',
            isAgent: false,
            isTechnician: false,
            agentRate: 0,
            technicianRate: 0,
            prefix: '',
            fullName: '',
            phone: '',
            address: '',
            agentNumber: ''
        });
        setEditMode(false);
        setSelectedUser(null);
        setError('');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800';
            case 'editor': return 'bg-blue-100 text-blue-800';
            case 'partner': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">System Users</h1>
                <button
                    onClick={() => {
                        setEditMode(false);
                        setFormData({ username: '', password: '', role: 'viewer', isAgent: false, isTechnician: false, agentRate: 0, technicianRate: 0, prefix: '' });
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} /> Add User
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Roles</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">No users found</td></tr>
                        ) : (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-100 p-2 rounded-full">
                                                <User size={20} className="text-gray-600" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.username}</div>
                                                {user.fullName && <div className="text-xs text-gray-500">{user.fullName}</div>}
                                                {user.phone && <div className="text-xs text-gray-500">{user.phone}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex gap-2">
                                            {user.isAgent && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Agent
                                                </span>
                                            )}
                                            {user.isTechnician && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                                    Tech
                                                </span>
                                            )}
                                            {!user.isAgent && !user.isTechnician && (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                        <div className="flex flex-col gap-1">
                                            {user.isAgent && (
                                                <span className="text-xs">Agent: {user.agentRate}%</span>
                                            )}
                                            {user.isTechnician && (
                                                <span className="text-xs">Tech: {user.technicianRate}%</span>
                                            )}
                                            {!user.isAgent && !user.isTechnician && (
                                                <span className="text-gray-400">-</span>
                                            )}
                                            {user.prefix && (
                                                <span className="text-xs text-gray-500">Prefix: {user.prefix}</span>
                                            )}
                                            {user.agentNumber && (
                                                <span className="text-xs text-blue-600">ID: {user.agentNumber}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(user)}
                                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                                title="Edit User"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            {user.username !== 'admin' && (
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl border border-gray-200">
                        <h2 className="text-xl font-bold mb-4 text-gray-800">
                            {editMode ? 'Edit User' : 'Add New User'}
                        </h2>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm flex items-center gap-2">
                                <ShieldAlert size={16} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Username</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username ?? ''}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:opacity-50"
                                        disabled={editMode}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.fullName ?? ''}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Phone</label>
                                        <input
                                            type="text"
                                            value={formData.phone ?? ''}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="08123456789"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1 text-gray-700">Agent Number</label>
                                        <input
                                            type="text"
                                            value={formData.agentNumber ?? ''}
                                            onChange={(e) => setFormData({ ...formData, agentNumber: e.target.value })}
                                            className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                            placeholder="AG-001"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Address</label>
                                    <textarea
                                        value={formData.address ?? ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        placeholder="Full address..."
                                        rows="2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">
                                        Password {editMode && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editMode}
                                        value={formData.password ?? ''}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">System Role</label>
                                    <select
                                        value={formData.role ?? 'viewer'}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    >
                                        <option value="viewer">Viewer (Read Only)</option>
                                        <option value="editor">Editor (Can Edit)</option>
                                        <option value="admin">Admin (Full Access)</option>
                                        <option value="partner">Partner (Agent/Technician)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Determines what pages the user can access.
                                    </p>
                                </div>

                                <div className="mb-6 space-y-4 border-t border-gray-200 pt-4">
                                    <h3 className="text-sm font-medium text-gray-900">Business Roles</h3>

                                    {/* Agent Role Checkbox */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="isAgent"
                                                type="checkbox"
                                                checked={formData.isAgent ?? false}
                                                onChange={(e) => setFormData({ ...formData, isAgent: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="isAgent" className="text-sm text-gray-700">Is Agent</label>
                                            {formData.isAgent && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-medium mb-1 text-gray-500">Agent Commission Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={formData.agentRate ?? 0}
                                                        onChange={(e) => setFormData({ ...formData, agentRate: Number(e.target.value) })}
                                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                                    />
                                                </div>
                                            )}
                                            {formData.isAgent && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-medium mb-1 text-gray-500">User Prefix (e.g. 08)</label>
                                                    <input
                                                        type="text"
                                                        value={formData.prefix ?? ''}
                                                        onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                                        placeholder="Optional"
                                                    />
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        Auto-prepended to usernames created by this agent.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Technician Role Checkbox */}
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="isTechnician"
                                                type="checkbox"
                                                checked={formData.isTechnician ?? false}
                                                onChange={(e) => setFormData({ ...formData, isTechnician: e.target.checked })}
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label htmlFor="isTechnician" className="text-sm text-gray-700">Is Technician</label>
                                            {formData.isTechnician && (
                                                <div className="mt-2">
                                                    <label className="block text-xs font-medium mb-1 text-gray-500">Technician Commission Rate (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={formData.technicianRate ?? 0}
                                                        onChange={(e) => setFormData({ ...formData, technicianRate: Number(e.target.value) })}
                                                        className="w-full border border-gray-300 rounded p-2 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    {editMode ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-lg w-full max-w-sm shadow-xl border border-gray-200">
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <ShieldAlert size={24} />
                            <h2 className="text-xl font-bold">Delete User?</h2>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete user <span className="font-semibold text-gray-900">{userToDelete?.username}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setUserToDelete(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
