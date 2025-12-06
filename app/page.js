'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Users, Wifi, WifiOff, Cpu, HardDrive, Thermometer, Activity, ArrowUp, ArrowDown, RefreshCw, DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import PartnerBillingPage from './billing/partner/page';

export default function DashboardPage() {
    const { t } = useLanguage();

    const [stats, setStats] = useState({
        pppoeActive: 0,
        pppoeOffline: 0,
        cpuLoad: 0,
        memoryUsed: 0,
        memoryTotal: 0,
        temperature: 0,
        interfaces: [],
        billing: {
            totalRevenue: 0,
            thisMonthRevenue: 0,
            todaysRevenue: 0,
            totalUnpaid: 0,
            pendingCount: 0
        },
        agentStats: null // New field for agent stats
    });
    const [trafficData, setTrafficData] = useState([]);
    const [realtimeTraffic, setRealtimeTraffic] = useState({
        downloadRate: 0,
        uploadRate: 0,
        downloadBytes: 0,
        uploadBytes: 0
    });
    const [speedHistory, setSpeedHistory] = useState([]);
    const [temperatureHistory, setTemperatureHistory] = useState([]);
    const [cpuHistory, setCpuHistory] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [refreshInterval, setRefreshInterval] = useState(5000);

    useEffect(() => {
        // Fetch user role
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setUserRole(data.user.role))
            .catch(err => console.error('Failed to fetch user role', err));

        // Fetch preferences to get refresh interval
        fetch('/api/app-settings/preferences')
            .then(res => res.json())
            .then(data => {
                if (data.dashboard?.refreshInterval) {
                    setRefreshInterval(data.dashboard.refreshInterval);
                }
            })
            .catch(err => console.error('Failed to fetch preferences', err));
    }, []);

    useEffect(() => {
        fetchStats();
        if (refreshInterval > 0) {
            const interval = setInterval(fetchStats, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refreshInterval]);

    const fetchStats = async () => {
        try {
            const [dashboardRes, billingRes, agentStatsRes, trafficRes, realtimeRes, tempRes, cpuRes] = await Promise.all([
                fetch('/api/dashboard/stats'),
                fetch('/api/billing/stats'),
                fetch(`/api/billing/stats/agent?month=${new Date().getMonth()}&year=${new Date().getFullYear()}`),
                fetch('/api/traffic'),
                fetch('/api/traffic/realtime'),
                fetch('/api/dashboard/temperature'),
                fetch('/api/dashboard/cpu')
            ]);

            const newStats = { ...stats };

            if (trafficRes.ok) {
                const data = await trafficRes.json();
                // Calculate speed from cumulative bytes difference
                // Data is sorted by timestamp, so we calculate (current - previous) / time_diff
                const processedData = [];
                for (let i = 1; i < data.length; i++) {
                    const prev = data[i - 1];
                    const curr = data[i];
                    const timeDiffSeconds = (curr.timestamp - prev.timestamp) / 1000;

                    if (timeDiffSeconds > 0) {
                        // rx on WAN = download, tx on WAN = upload
                        const downloadBytesPerSec = (curr.rx - prev.rx) / timeDiffSeconds;
                        const uploadBytesPerSec = (curr.tx - prev.tx) / timeDiffSeconds;

                        // Convert to Mbps (bytes to bits, then to Mbps)
                        const downloadMbps = Math.max(0, (downloadBytesPerSec * 8) / 1000000);
                        const uploadMbps = Math.max(0, (uploadBytesPerSec * 8) / 1000000);

                        processedData.push({
                            timestamp: curr.timestamp,
                            date: new Date(curr.timestamp).toLocaleString(),
                            download: parseFloat(downloadMbps.toFixed(2)),
                            upload: parseFloat(uploadMbps.toFixed(2))
                        });
                    }
                }
                setTrafficData(processedData);
            }

            if (dashboardRes.ok) {
                const data = await dashboardRes.json();
                newStats.pppoeActive = data.pppoeActive;
                newStats.pppoeOffline = data.pppoeOffline;
                newStats.cpuLoad = data.cpuLoad;
                newStats.memoryUsed = data.memoryUsed;
                newStats.memoryTotal = data.memoryTotal;
                newStats.temperature = data.temperature;
                newStats.interfaces = data.interfaces;
            }

            if (billingRes.ok) {
                const data = await billingRes.json();
                newStats.billing = data;
            }

            if (agentStatsRes.ok) {
                const data = await agentStatsRes.json();
                if (data.role === 'partner') {
                    newStats.agentStats = data.stats;
                }
            }

            if (realtimeRes.ok) {
                const data = await realtimeRes.json();
                const newRealtimeData = {
                    downloadRate: data.downloadRate || 0,
                    uploadRate: data.uploadRate || 0,
                    downloadBytes: data.downloadBytes || 0,
                    uploadBytes: data.uploadBytes || 0
                };
                setRealtimeTraffic(newRealtimeData);

                // Add to speed history for graph (keep last 60 data points)
                setSpeedHistory(prev => {
                    const newHistory = [...prev, {
                        time: new Date().toLocaleTimeString(),
                        download: Math.round((newRealtimeData.downloadRate / 1000000) * 100) / 100, // Convert to Mbps
                        upload: Math.round((newRealtimeData.uploadRate / 1000000) * 100) / 100
                    }];
                    // Keep only last 60 data points
                    return newHistory.slice(-60);
                });
            }

            // Handle temperature history
            if (tempRes.ok) {
                const data = await tempRes.json();
                if (data.history && data.history.length > 0) {
                    setTemperatureHistory(data.history);
                }
            }

            // Handle CPU history
            if (cpuRes.ok) {
                const data = await cpuRes.json();
                if (data.history && data.history.length > 0) {
                    setCpuHistory(data.history);
                }
            }

            setStats(newStats);
            setLastUpdate(new Date());

        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setLoading(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const formatBitsPerSecond = (bps) => {
        if (!bps || bps === 0) return '0 bps';
        const k = 1000;
        const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
        const i = Math.floor(Math.log(bps) / Math.log(k));
        return parseFloat((bps / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const StatCard = ({ icon: Icon, title, value, subtitle, color = 'blue', alert = false }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white rounded-lg shadow-md p-6 glass-card transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${alert ? 'border-2 border-red-500' : ''}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-${color}-100`}>
                    <Icon className={`text-${color}-600`} size={24} />
                </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
            <p className="text-2xl font-bold text-gray-900 truncate" title={value}>{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </motion.div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-600">{t('common.loading')}</div>
            </div>
        );
    }

    // Show Partner Dashboard for non-admin roles
    if (userRole === 'partner' || userRole === 'agent' || userRole === 'technician') {
        return <PartnerBillingPage />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.title')}</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                        Last update: {lastUpdate.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={fetchStats}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw size={18} />
                        {t('common.refresh')}
                    </button>
                </div>
            </div>

            {/* Financial Overview */}
            {userRole !== 'partner' && (
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <DollarSign className="text-green-600" /> Financial Overview
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            icon={DollarSign}
                            title="Revenue This Month"
                            value={formatCurrency(stats.billing.thisMonthRevenue)}
                            subtitle={`Revenue for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`}
                            color="green"
                        />
                        <StatCard
                            icon={Activity}
                            title="Today's Revenue"
                            value={formatCurrency(stats.billing.todaysRevenue)}
                            subtitle="Income received today"
                            color="blue"
                        />
                        <StatCard
                            icon={CreditCard}
                            title="Unpaid Invoices"
                            value={formatCurrency(stats.billing.totalUnpaid)}
                            subtitle={`${stats.billing.pendingCount} pending invoices`}
                            color="orange"
                        />
                    </div>
                </div>
            )}



            {/* PPPoE Stats */}
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Users className="text-blue-600" /> PPPoE Users
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Link href="/active" className="block">
                        <StatCard
                            icon={Wifi}
                            title="PPPoE Active"
                            value={stats.pppoeActive}
                            subtitle="Users currently online"
                            color="green"
                        />
                    </Link>
                    <Link href="/offline" className="block">
                        <StatCard
                            icon={WifiOff}
                            title="PPPoE Offline"
                            value={stats.pppoeOffline}
                            subtitle="Users currently offline"
                            color="red"
                        />
                    </Link>
                </div>
            </div>

            {/* Real-time Internet Traffic */}
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Activity className="text-purple-600" /> Real-time Internet Traffic
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-green-100 text-sm">Download Speed</span>
                            <ArrowDown size={20} />
                        </div>
                        <p className="text-3xl font-bold">{formatBitsPerSecond(realtimeTraffic.downloadRate)}</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-100 text-sm">Upload Speed</span>
                            <ArrowUp size={20} />
                        </div>
                        <p className="text-3xl font-bold">{formatBitsPerSecond(realtimeTraffic.uploadRate)}</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-md p-6 text-white"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-emerald-100 text-sm">Total Download</span>
                            <ArrowDown size={20} />
                        </div>
                        <p className="text-3xl font-bold">{formatBytes(realtimeTraffic.downloadBytes)}</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-md p-6 text-white"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-indigo-100 text-sm">Total Upload</span>
                            <ArrowUp size={20} />
                        </div>
                        <p className="text-3xl font-bold">{formatBytes(realtimeTraffic.uploadBytes)}</p>
                    </motion.div>
                </div>
            </div>

            {/* System Stats */}
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Cpu className="text-gray-600" /> {t('dashboard.systemHealth')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        icon={Cpu}
                        title="CPU Usage"
                        value={`${stats.cpuLoad}%`}
                        subtitle="Current load"
                        color="blue"
                    />
                    <StatCard
                        icon={HardDrive}
                        title="Memory Usage"
                        value={`${Math.round((stats.memoryUsed / stats.memoryTotal) * 100)}%`}
                        subtitle={`${formatBytes(stats.memoryUsed)} / ${formatBytes(stats.memoryTotal)}`}
                        color="purple"
                    />
                    <StatCard
                        icon={Thermometer}
                        title="CPU Temperature"
                        value={stats.temperature ? `${stats.temperature}°C` : 'N/A'}
                        subtitle="System temperature"
                        color="orange"
                    />
                </div>
            </div>

            {/* Temperature Graph */}
            {temperatureHistory.length > 1 && (
                <div className="bg-white rounded-lg shadow-md p-6 glass-card">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <Thermometer className="text-orange-500" /> Temperature Monitor (Last 3 Days)
                    </h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={temperatureHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10 }}
                                    minTickGap={60}
                                />
                                <YAxis
                                    domain={['dataMin - 5', 'dataMax + 5']}
                                    tickFormatter={(val) => `${val}°C`}
                                    tick={{ fontSize: 12 }}
                                />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip
                                    formatter={(value) => [`${value}°C`, 'Temperature']}
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload[0] && payload[0].payload.date) {
                                            return payload[0].payload.date;
                                        }
                                        return label;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="temperature"
                                    name="Temperature"
                                    stroke="#F97316"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorTemp)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-gray-500 mt-4 text-center">
                        {temperatureHistory.length} data points collected
                    </p>
                </div>
            )}

            {/* CPU Usage Graph */}
            {cpuHistory.length > 1 && (
                <div className="bg-white rounded-lg shadow-md p-6 glass-card">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <Cpu className="text-blue-500" /> CPU Usage Monitor (Last 3 Days)
                    </h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={cpuHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10 }}
                                    minTickGap={60}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tickFormatter={(val) => `${val}%`}
                                    tick={{ fontSize: 12 }}
                                />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip
                                    formatter={(value) => [`${value}%`, 'CPU Load']}
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload[0] && payload[0].payload.date) {
                                            return payload[0].payload.date;
                                        }
                                        return label;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="cpuLoad"
                                    name="CPU Load"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorCpu)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-gray-500 mt-4 text-center">
                        {cpuHistory.length} data points collected
                    </p>
                </div>
            )}

            {/* 7-Day Traffic Speed Graph */}
            {trafficData.length > 1 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <Activity className="text-blue-600" /> Internet Traffic Speed (Last 7 Days)
                    </h2>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trafficData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorDownload7d" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorUpload7d" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => {
                                        const date = new Date(str);
                                        return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
                                    }}
                                    tick={{ fontSize: 11 }}
                                    minTickGap={60}
                                />
                                <YAxis
                                    tickFormatter={(val) => `${val} Mbps`}
                                    tick={{ fontSize: 12 }}
                                />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip
                                    formatter={(value, name) => [`${value} Mbps`, name === 'download' ? 'Download' : 'Upload']}
                                    labelFormatter={(label) => new Date(label).toLocaleString()}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="download"
                                    name="Download"
                                    stroke="#10B981"
                                    fillOpacity={1}
                                    fill="url(#colorDownload7d)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="upload"
                                    name="Upload"
                                    stroke="#3B82F6"
                                    fillOpacity={1}
                                    fill="url(#colorUpload7d)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
