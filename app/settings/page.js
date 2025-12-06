'use client';

import { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Edit2, CheckCircle, Power, X } from 'lucide-react';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        connections: [],
        activeConnectionId: null,
        wanInterface: '',
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [interfaces, setInterfaces] = useState([]);

    // Modal/Form state for connection
    const [isEditing, setIsEditing] = useState(false);
    const [currentConnection, setCurrentConnection] = useState(null); // null = adding new
    const [connForm, setConnForm] = useState({
        name: '',
        host: '',
        port: '8728',
        user: '',
        password: '',
    });

    useEffect(() => {
        fetchSettings();
        fetchInterfaces();
    }, []);

    const fetchInterfaces = async () => {
        try {
            const res = await fetch('/api/interfaces');
            if (res.ok) {
                setInterfaces(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch interfaces', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            // Ensure connections is array
            if (!data.connections) data.connections = [];
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (conn = null) => {
        if (conn) {
            setCurrentConnection(conn);
            setConnForm({
                name: conn.name || '',
                host: conn.host,
                port: conn.port,
                user: conn.user,
                password: conn.password, // Will be '******'
            });
        } else {
            setCurrentConnection(null);
            setConnForm({ name: '', host: '', port: '8728', user: '', password: '' });
        }
        setIsEditing(true);
    };

    const handleSaveConnection = async (e) => {
        e.preventDefault();
        // Validation
        if (!connForm.host || !connForm.user || !connForm.port) {
            setMessage({ type: 'error', text: 'Host, User, and Port are required' });
            return;
        }

        let newConnections = [...settings.connections];
        if (currentConnection) {
            // Edit existing
            newConnections = newConnections.map(c =>
                c.id === currentConnection.id ? { ...connForm, id: currentConnection.id } : c
            );
        } else {
            // Add new
            newConnections.push({ ...connForm, id: Date.now().toString() });
        }

        // If it's the first connection, make it active automatically
        let newActiveId = settings.activeConnectionId;
        if (newConnections.length === 1) {
            newActiveId = newConnections[0].id;
        }

        await saveSettings({ connections: newConnections, activeConnectionId: newActiveId });
        setIsEditing(false);
    };

    const handleDeleteConnection = async (id) => {
        if (!confirm('Are you sure you want to delete this connection?')) return;
        const newConnections = settings.connections.filter(c => c.id !== id);

        // If we deleted the active connection, unset active ID
        let newActiveId = settings.activeConnectionId;
        if (id === settings.activeConnectionId) {
            newActiveId = null;
        }

        await saveSettings({ connections: newConnections, activeConnectionId: newActiveId });
    };

    const handleConnect = async (id) => {
        await saveSettings({ activeConnectionId: id });
    };

    const saveSettings = async (newSettingsPart) => {
        const payload = { ...settings, ...newSettingsPart };
        // Optimistic update
        setSettings(payload);
        setMessage(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                if (payload.title) document.title = payload.title;
                fetchSettings(); // Refresh to get clean state
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
                fetchSettings(); // Revert on error
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' });
            fetchSettings();
        }
    };

    if (loading) return <div className="p-8 text-gray-800">Loading...</div>;

    return (
        <div className="w-full space-y-8">
            <div className="flex items-center gap-3 mb-8">
                <Server className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-800">Application Settings</h1>
            </div>

            {/* Connections Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Mikrotik Connections</h2>
                    <button
                        onClick={() => openEditModal()}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={18} /> Add Connection
                    </button>
                </div>

                <div className="space-y-4">
                    {settings.connections.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">No connections configured. Add one to get started.</p>
                    ) : (
                        <div className="grid gap-4">
                            {settings.connections.map(conn => (
                                <div key={conn.id} className={`border rounded-lg p-4 flex items-center justify-between ${settings.activeConnectionId === conn.id ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${settings.activeConnectionId === conn.id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <Power size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{conn.name || 'Unnamed Connection'}</h3>
                                            <p className="text-sm text-gray-600">{conn.host}:{conn.port} ({conn.user})</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {settings.activeConnectionId !== conn.id && (
                                            <button
                                                onClick={() => handleConnect(conn.id)}
                                                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                                            >
                                                Connect
                                            </button>
                                        )}
                                        {settings.activeConnectionId === conn.id && (
                                            <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md flex items-center gap-1">
                                                <CheckCircle size={14} /> Active
                                            </span>
                                        )}
                                        <button
                                            onClick={() => openEditModal(conn)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteConnection(conn.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-4">General Settings</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">WAN Interface (Internet Source)</label>
                        <p className="text-sm text-gray-500 mb-2">Select the interface used for internet connection to monitor traffic.</p>
                        <div className="flex gap-2">
                            <select
                                className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                value={settings.wanInterface || ''}
                                onChange={(e) => setSettings({ ...settings, wanInterface: e.target.value })}
                            >
                                <option value="">Select Interface</option>
                                {interfaces.map(iface => (
                                    <option key={iface.name} value={iface.name}>
                                        {iface.name} {iface.disabled ? '(Disabled)' : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => saveSettings({ wanInterface: settings.wanInterface })}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Edit/Add Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">{currentConnection ? 'Edit Connection' : 'Add Connection'}</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveConnection}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Connection Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Main Router"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        value={connForm.name}
                                        onChange={(e) => setConnForm({ ...connForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="192.168.88.1"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        value={connForm.host}
                                        onChange={(e) => setConnForm({ ...connForm, host: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">API Port</label>
                                    <input
                                        type="number"
                                        required
                                        placeholder="8728"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        value={connForm.port}
                                        onChange={(e) => setConnForm({ ...connForm, port: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="admin"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        value={connForm.user}
                                        onChange={(e) => setConnForm({ ...connForm, user: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        placeholder={currentConnection ? "Leave empty to keep unchanged" : ""}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                        value={connForm.password}
                                        onChange={(e) => setConnForm({ ...connForm, password: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
