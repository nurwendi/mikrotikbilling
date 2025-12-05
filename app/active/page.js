'use client';

import { useState, useEffect } from 'react';
import { Activity, RefreshCw, ArrowUpDown, Search, ExternalLink, Power } from 'lucide-react';

export default function ActiveConnectionsPage() {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');

    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedConnections = () => {
        let filtered = connections;
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = connections.filter(conn =>
                (conn.name && conn.name.toLowerCase().includes(lowerTerm)) ||
                (conn.address && conn.address.toLowerCase().includes(lowerTerm)) ||
                (conn['caller-id'] && conn['caller-id'].toLowerCase().includes(lowerTerm))
            );
        }

        if (!sortConfig.key) return filtered;

        const sorted = [...filtered].sort((a, b) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/pppoe/active');
            if (!res.ok) throw new Error('Failed to fetch connections');
            const data = await res.json();
            setConnections(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (id, name) => {
        if (!confirm(`Are you sure you want to disconnect user ${name}?`)) return;

        try {
            const res = await fetch(`/api/pppoe/active/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Refresh list
                fetchConnections();
            } else {
                const data = await res.json();
                alert(`Failed to disconnect: ${data.error}`);
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            alert('Failed to disconnect user');
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchConnections();
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [autoRefresh]);

    const formatUptime = (uptime) => {
        if (!uptime) return '-';
        // Mikrotik returns uptime as a string (e.g., "1w2d", "00:10:00")
        // We can display it directly as it's usually readable
        return uptime;
    };

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
                <div className="flex items-center space-x-2">
                    <Activity size={28} className="text-blue-600" />
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Active Connections</h1>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:space-x-4">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <label className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Auto-refresh (5s)</span>
                        </label>
                        <button
                            onClick={fetchConnections}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            <RefreshCw size={16} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {loading && connections.length === 0 ? (
                <div className="text-center py-8">Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => sortData('name')}
                                >
                                    <div className="flex items-center gap-1">
                                        Username <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => sortData('address')}
                                >
                                    <div className="flex items-center gap-1">
                                        IP Address <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => sortData('uptime')}
                                >
                                    <div className="flex items-center gap-1">
                                        Uptime <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => sortData('caller-id')}
                                >
                                    <div className="flex items-center gap-1">
                                        Caller ID <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th
                                    className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => sortData('tx-byte')}
                                >
                                    <div className="flex items-center gap-1">
                                        Data Usage <ArrowUpDown size={14} />
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {connections.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        No active connections
                                    </td>
                                </tr>
                            ) : (
                                getSortedConnections().map((conn, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {conn.name || 'N/A'}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500">
                                            {conn.address || 'N/A'}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500">
                                            {formatUptime(conn.uptime)}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500">
                                            {conn['caller-id'] || '-'}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-green-600">↓ {formatBytes(conn['tx-byte'])}</span>
                                                <span className="text-blue-600">↑ {formatBytes(conn['rx-byte'])}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {conn.address && (
                                                <a
                                                    href={`http://${conn.address}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
                                                >
                                                    <ExternalLink size={14} className="mr-1" />
                                                    Manage
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleDisconnect(conn['.id'], conn.name)}
                                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                            >
                                                <Power size={14} className="mr-1" />
                                                Disconnect
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
                Total active connections: {connections.length}
            </div>
        </div>
    );
}
