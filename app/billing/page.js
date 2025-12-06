'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Calendar, Plus, Search, FileText, Settings, Printer, ArrowUpDown, UserX, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function BillingPage() {
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState({ totalRevenue: 0, todaysRevenue: 0, pendingCount: 0, totalTransactions: 0 });
    const [agentStats, setAgentStats] = useState(null); // New state for agent stats
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const [users, setUsers] = useState([]); // For user selection (PPPoE Users)
    const [systemUsers, setSystemUsers] = useState([]); // For resolving Agent/Technician names
    const [profiles, setProfiles] = useState([]); // For price lookup
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceSettings, setInvoiceSettings] = useState({
        companyName: 'Mikrotik Manager',
        companyAddress: '',
        companyContact: '',
        invoiceFooter: ''
    });
    const [printFormat, setPrintFormat] = useState('a4'); // 'a4' or 'thermal'
    const [customerDetails, setCustomerDetails] = useState(null);
    const [customersData, setCustomersData] = useState({});
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showMonthModal, setShowMonthModal] = useState(false);
    const [userRole, setUserRole] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        amount: '',
        method: 'cash',
        notes: '',
        status: 'completed'
    });
    const [baseAmount, setBaseAmount] = useState(0);
    const [isNextMonthIncluded, setIsNextMonthIncluded] = useState(false);



    useEffect(() => {
        fetchData();
        fetchUsers();
        fetchSystemUsers();
        fetchProfiles();
        fetchSettings();
        fetchCustomersData();
        fetchUserRole();
    }, [selectedMonth, selectedYear]); // Re-fetch when month/year changes

    const fetchData = async () => {
        setLoading(true);
        try {
            const [paymentsRes, statsRes, agentStatsRes] = await Promise.all([
                fetch('/api/billing/payments'),
                fetch('/api/billing/stats'),
                fetch(`/api/billing/stats/agent?month=${selectedMonth}&year=${selectedYear}`) // Fetch agent stats
            ]);

            if (paymentsRes.ok) setPayments(await paymentsRes.json());
            if (statsRes.ok) setStats(await statsRes.json());
            if (agentStatsRes.ok) {
                const agentData = await agentStatsRes.json();
                console.log('Agent Stats Response:', agentData);
                setAgentStats(agentData);
            } else {
                console.log('Agent Stats Error:', agentStatsRes.status);
            }
        } catch (error) {
            console.error('Failed to fetch billing data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/pppoe/users');
            if (res.ok) setUsers(await res.json());
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchSystemUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) setSystemUsers(await res.json());
        } catch (error) {
            console.error('Failed to fetch system users', error);
        }
    };

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/pppoe/profiles');
            if (res.ok) setProfiles(await res.json());
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/billing/settings');
            if (res.ok) setInvoiceSettings(await res.json());
        } catch (error) {
            console.error('Failed to fetch invoice settings', error);
        }
    };

    const fetchUserRole = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setUserRole(data.user.role);
            }
        } catch (error) {
            console.error('Failed to fetch user role', error);
        }
    };

    const handleGenerateInvoices = async () => {
        setShowMonthModal(true);
    };

    const handleGenerateForMonth = async (month, year) => {
        if (!confirm(`Generate invoices for ${new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/billing/invoices/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month, year })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                fetchData();
                setShowMonthModal(false);
            } else {
                alert('Failed to generate invoices: ' + data.error);
            }
        } catch (error) {
            console.error('Error generating invoices:', error);
            alert('Error generating invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleAutoDrop = async () => {
        if (!confirm('This will change profile to DROP for all users with unpaid invoices. Continue?')) return;

        setLoading(true);
        try {
            const res = await fetch('/api/billing/auto-drop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check-and-drop' })
            });
            const data = await res.json();
            if (res.ok) {
                alert(`${data.message}\n\nDropped users: ${data.droppedUsers.join(', ') || 'None'}`);
            } else {
                alert('Failed to auto-drop: ' + data.error);
            }
        } catch (error) {
            console.error('Error auto-drop:', error);
            alert('Error processing auto-drop');
        } finally {
            setLoading(false);
        }
    };

    const [lastRecordedPayment, setLastRecordedPayment] = useState(null); // For success modal state

    const handleSubmit = async (e) => {
        e.preventDefault();
        alert('DEBUG: Tombol Save ditekan. Mengirim data...'); // Debug alert
        try {
            console.log('Sending payment data:', formData);
            const res = await fetch('/api/billing/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (res.ok) {
                // Don't close modal, show success state
                setLastRecordedPayment(data.payment);
                setFormData({ username: '', amount: '', method: 'cash', notes: '', status: 'completed' });
                setBaseAmount(0);
                setIsNextMonthIncluded(false);
                fetchData();
            } else {
                alert('Failed to record payment: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to record payment', error);
            alert('Error recording payment: ' + error.message);
        }
    };



    const filteredPayments = payments.filter(p => {
        const customerName = customersData[p.username]?.name || '';
        const searchLower = searchTerm.toLowerCase();
        const pDate = new Date(p.date);

        // Filter by selected month/year
        const matchesMonth = pDate.getMonth() === selectedMonth && pDate.getFullYear() === selectedYear;

        // Filter by search term
        const matchesSearch = p.username.toLowerCase().includes(searchLower) ||
            customerName.toLowerCase().includes(searchLower) ||
            p.notes?.toLowerCase().includes(searchLower);

        return matchesMonth && matchesSearch;
    });

    const getAvailableMonths = () => {
        const months = new Set();

        // Always include current month
        const now = new Date();
        months.add(`${now.getFullYear()}-${now.getMonth()}`);

        // Add all months from payments
        payments.forEach(p => {
            const date = new Date(p.date);
            months.add(`${date.getFullYear()}-${date.getMonth()}`);
        });

        return Array.from(months).sort().reverse().map(m => {
            const [year, month] = m.split('-');
            return { year: parseInt(year), month: parseInt(month) };
        });
    };

    const getMonthStats = () => {
        const monthPayments = payments.filter(p => {
            const pDate = new Date(p.date);
            return pDate.getMonth() === selectedMonth && pDate.getFullYear() === selectedYear;
        });

        const totalRevenue = monthPayments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        const totalUnpaid = monthPayments
            .filter(p => p.status !== 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        return {
            totalRevenue,
            totalUnpaid,
            totalTransactions: monthPayments.length,
            pendingCount: monthPayments.filter(p => p.status !== 'completed').length
        };
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const getMonthName = (monthIndex) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return months[monthIndex];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const fetchCustomerDetails = async (username) => {
        try {
            const res = await fetch(`/api/customers/${username}`);
            const data = await res.json();
            setCustomerDetails(data);
        } catch (error) {
            console.error('Failed to fetch customer details', error);
            setCustomerDetails({ name: '', address: '', phone: '' });
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

    const getCustomerName = (username) => {
        return customersData[username]?.name || username;
    };

    const getAgentName = (username) => {
        const customer = customersData[username];
        if (!customer || !customer.agentId) return '-';
        const agent = systemUsers.find(u => u.id === customer.agentId);
        return agent ? agent.username : '-';
    };

    const getTechnicianName = (username) => {
        const customer = customersData[username];
        if (!customer || !customer.technicianId) return '-';
        const tech = systemUsers.find(u => u.id === customer.technicianId);
        return tech ? tech.username : '-';
    };

    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedPayments = () => {
        const filtered = filteredPayments;
        if (!sortConfig.key) return filtered;

        const sorted = [...filtered].sort((a, b) => {
            let aVal, bVal;

            switch (sortConfig.key) {
                case 'date':
                    aVal = new Date(a.date).getTime();
                    bVal = new Date(b.date).getTime();
                    break;
                case 'customer':
                    aVal = getCustomerName(a.username).toLowerCase();
                    bVal = getCustomerName(b.username).toLowerCase();
                    break;
                case 'amount':
                    aVal = parseFloat(a.amount);
                    bVal = parseFloat(b.amount);
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
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

    const handleSendWhatsApp = (payment) => {
        const customer = customersData[payment.username];
        if (!customer || !customer.phone) {
            alert('Nomor HP pelanggan belum diisi. Silakan lengkapi data pelanggan terlebih dahulu.');
            return;
        }

        const phone = customer.phone.replace(/\D/g, '');
        const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;

        const invoiceLink = `${window.location.origin}/invoice/${payment.id}`;
        const message = `Halo ${customer.name},%0A%0ATerima kasih telah melakukan pembayaran layanan internet.%0ABerikut detail pembayaran Anda:%0A%0ANo. Pelanggan: ${customer.customerNumber || payment.username}%0APeriode Tagihan: ${new Date(payment.date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}%0AJumlah Tagihan: ${formatCurrency(payment.amount)}%0A%0ALihat Invoice: ${invoiceLink}%0A%0ATerima kasih atas kepercayaan Anda.%0A${invoiceSettings.companyName}`;

        window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    };

    return (
        <div>
            <div className="space-y-6 print:hidden">
                <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Billing & Payments</h1>
                    <select
                        value={`${selectedYear}-${selectedMonth}`}
                        onChange={(e) => {
                            const [year, month] = e.target.value.split('-');
                            setSelectedYear(parseInt(year));
                            setSelectedMonth(parseInt(month));
                        }}
                        className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                    >
                        {getAvailableMonths().map(({ year, month }) => (
                            <option key={`${year}-${month}`} value={`${year}-${month}`}>
                                {new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </option>
                        ))}
                    </select>
                    <div className="flex flex-col gap-2 md:flex-row md:gap-2">
                        {userRole === 'admin' && (
                            <>
                                <Link href="/billing/settings">
                                    <button className="w-full md:w-auto bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors shadow-sm">
                                        <Settings size={20} /> Settings
                                    </button>
                                </Link>
                                <button
                                    onClick={handleGenerateInvoices}
                                    className="w-full md:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-sm"
                                >
                                    <FileText size={20} /> Generate Invoices
                                </button>

                                <button
                                    onClick={handleAutoDrop}
                                    className="w-full md:w-auto bg-red-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    <UserX size={20} /> Auto-Drop Unpaid
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setShowModal(true)}
                            className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={20} /> Record Payment
                        </button>
                    </div>
                </div>



                {/* Admin Agent Stats Section */}
                {agentStats && agentStats.role === 'admin' && (
                    <div className="space-y-6">
                        {/* Grand Totals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-blue-100 font-medium mb-1">Total Seluruhnya (Gross)</p>
                                <h3 className="text-3xl font-bold">{formatCurrency(agentStats.grandTotal.revenue)}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-orange-100 font-medium mb-1">Total Komisi Partner</p>
                                <h3 className="text-3xl font-bold">{formatCurrency(agentStats.grandTotal.commission)}</h3>
                            </div>
                            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                                <p className="text-green-100 font-medium mb-1">Total Hasil (Net)</p>
                                <h3 className="text-3xl font-bold">{formatCurrency(agentStats.grandTotal.netRevenue)}</h3>
                            </div>
                        </div>

                        {/* Partner Performance Table */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="font-bold text-gray-800">Performa Partner</h3>
                            </div>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Partner</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pelanggan Lunas</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Belum Bayar</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pendapatan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Komisi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {agentStats.agents.map((partner) => (
                                        <tr key={partner.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{partner.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{partner.rate}%</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-green-600 font-medium">{partner.paidCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-red-600 font-medium">{partner.unpaidCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-900">{formatCurrency(partner.totalRevenue)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">{formatCurrency(partner.commission)}</td>
                                        </tr>
                                    ))}
                                    {agentStats.agents.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Tidak ada partner</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Partner Link for Partners */}
                {agentStats && agentStats.role === 'partner' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-blue-800">Partner Dashboard Available</h3>
                            <p className="text-blue-600 text-sm">View your personal performance statistics.</p>
                        </div>
                        <Link href="/billing/partner">
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                Go to Partner Dashboard
                            </button>
                        </Link>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white rounded-lg p-6 shadow-md glass-card border-l-4 border-green-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-full text-green-600">
                                <DollarSign size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Revenue (This Month)</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(getMonthStats().totalRevenue)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-md glass-card border-l-4 border-blue-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Pending Invoices</p>
                                <p className="text-xl font-bold text-gray-900">{getMonthStats().pendingCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-md glass-card border-l-4 border-purple-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                                <FileText size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Transactions</p>
                                <p className="text-xl font-bold text-gray-900">{getMonthStats().totalTransactions}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 shadow-md glass-card border-l-4 border-red-500">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-100 rounded-full text-red-600">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Unpaid</p>
                                <p className="text-xl font-bold text-gray-900">{formatCurrency(getMonthStats().totalUnpaid)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Partner Earnings Section */}
                {userRole === 'admin' && (
                    <div className="bg-white rounded-lg shadow-md glass-card overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800">Partner Earnings - {getMonthName(selectedMonth)} {selectedYear}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unpaid</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(!agentStats || !agentStats.agents || agentStats.agents.length === 0) ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                                No partners with transactions this month
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {agentStats.agents.map((agent) => (
                                                <tr key={agent.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                                                                <div className="text-xs text-gray-500">{agent.role}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {agent.rate}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                            {agent.paidCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                                            {agent.unpaidCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatCurrency(agent.totalRevenue)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                                        {formatCurrency(agent.commission)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                                        {formatCurrency(agent.totalRevenue - agent.commission)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Total Row */}
                                            <tr className="bg-gray-100 font-semibold">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan="4">
                                                    Total
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatCurrency(agentStats.grandTotal?.revenue || 0)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                                    {formatCurrency(agentStats.grandTotal?.commission || 0)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                                    {formatCurrency(agentStats.grandTotal?.netRevenue || 0)}
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Payment List */}
                <div className="bg-white rounded-lg shadow-md glass-card overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search user or notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>

                                    <th
                                        onClick={() => sortData('date')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Date
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('customer')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Customer
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th
                                        onClick={() => sortData('amount')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Amount
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                    <th
                                        onClick={() => sortData('status')}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            Status
                                            <ArrowUpDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                                ) : getSortedPayments().length === 0 ? (
                                    <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">No payments found</td></tr>
                                ) : (
                                    getSortedPayments().map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50 transition-colors">

                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(payment.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <div>
                                                    <div className="font-semibold">{getCustomerName(payment.username)}</div>
                                                    {customersData[payment.username]?.name && (
                                                        <div className="text-xs text-gray-500">ID: {payment.username}</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {payment.method}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    payment.status === 'postponed' ? 'bg-orange-100 text-orange-800' :
                                                        payment.status === 'merged' ? 'bg-gray-100 text-gray-500' :
                                                            'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getAgentName(payment.username)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getTechnicianName(payment.username)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={async () => {
                                                        setSelectedInvoice(payment);

                                                        await fetchCustomerDetails(payment.username);
                                                        // Small delay to ensure state is updated
                                                        setTimeout(() => setShowInvoiceModal(true), 100);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    View Invoice
                                                </button>
                                                {payment.status === 'completed' && (
                                                    <button
                                                        onClick={() => handleSendWhatsApp(payment)}
                                                        className="text-green-600 hover:text-green-900 ml-3"
                                                        title="Kirim WhatsApp"
                                                    >
                                                        <MessageCircle size={18} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Add Payment Modal */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
                        >
                            <h2 className="text-xl font-bold mb-4 text-gray-800">
                                {lastRecordedPayment ? 'Payment Recorded!' : 'Record Payment'}
                            </h2>

                            {lastRecordedPayment ? (
                                <div className="space-y-6 text-center py-4">
                                    <div className="flex justify-center">
                                        <div className="bg-green-100 p-4 rounded-full">
                                            <DollarSign size={48} className="text-green-600" />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-lg font-semibold text-gray-800">Pembayaran Berhasil Disimpan</p>
                                        <p className="text-gray-500 mt-1">
                                            {formatCurrency(lastRecordedPayment.amount)} - {lastRecordedPayment.username}
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => handleSendWhatsApp(lastRecordedPayment)}
                                            className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 font-medium transition-colors"
                                        >
                                            <MessageCircle size={20} /> Kirim WhatsApp
                                        </button>
                                        <button
                                            onClick={() => {
                                                setLastRecordedPayment(null);
                                                setShowModal(false);
                                            }}
                                            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                        >
                                            Tutup
                                        </button>
                                        <button
                                            onClick={() => setLastRecordedPayment(null)}
                                            className="w-full px-4 py-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                        >
                                            Input Pembayaran Lain
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {users.length === 0 && (
                                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm mb-4">
                                            Warning: No users found. Please check Mikrotik connection or add users first.
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                                        <select
                                            value={formData.username}
                                            onChange={(e) => {
                                                const selectedUser = users.find(u => u.name === e.target.value);
                                                let amount = formData.amount;

                                                if (selectedUser && selectedUser.profile) {
                                                    const userProfile = profiles.find(p => p.name === selectedUser.profile);
                                                    // Parse price from comment (format: "price:150000")
                                                    if (userProfile && userProfile.comment && userProfile.comment.includes('price:')) {
                                                        const match = userProfile.comment.match(/price:(\d+)/);
                                                        if (match) {
                                                            amount = match[1];
                                                        }
                                                    } else if (userProfile && userProfile.price) {
                                                        // Fallback to direct price property if it exists
                                                        amount = userProfile.price;
                                                    }
                                                }

                                                setBaseAmount(amount);
                                                setIsNextMonthIncluded(false);
                                                setFormData({
                                                    ...formData,
                                                    username: e.target.value,
                                                    amount: amount,
                                                    notes: ''
                                                });
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                        >
                                            <option value="">Select User</option>
                                            {users.map(user => (
                                                <option key={user['.id']} value={user.name}>{user.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Advance Payment Checkbox */}
                                    {formData.username && baseAmount > 0 && (
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isNextMonthIncluded}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setIsNextMonthIncluded(checked);

                                                        const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                                                        const nextMonthDate = new Date();
                                                        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                                                        const nextMonth = nextMonthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

                                                        if (checked) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                amount: baseAmount * 2,
                                                                notes: `Pembayaran ${currentMonth} & ${nextMonth}`
                                                            }));
                                                        } else {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                amount: baseAmount,
                                                                notes: ''
                                                            }));
                                                        }
                                                    }}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-blue-800">Bayar Bulan Depan Juga (+{formatCurrency(baseAmount)})</span>
                                            </label>
                                            {isNextMonthIncluded && (
                                                <p className="text-xs text-blue-600 mt-1 ml-6">
                                                    Total menjadi {formatCurrency(baseAmount * 2)}. Invoice akan mencakup tagihan bulan ini dan bulan depan.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (IDR)</label>
                                        <input
                                            type="number"
                                            value={formData.amount}
                                            onChange={(e) => {
                                                setFormData({ ...formData, amount: e.target.value });
                                                // If user manually changes amount, we might want to uncheck the box or handle it differently
                                                // For now, let's just let them edit it
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                            placeholder="150000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                                        <select
                                            value={formData.method}
                                            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="transfer">Transfer</option>
                                            <option value="qris">QRIS</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                            rows="3"
                                            placeholder="Optional notes..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            Save Payment
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )
            }

            {/* Month Selection Modal for Invoice Generation */}
            {
                showMonthModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
                        >
                            <h2 className="text-xl font-bold mb-4 text-gray-800">Generate Invoices for Month</h2>
                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        const now = new Date();
                                        handleGenerateForMonth(now.getMonth(), now.getFullYear());
                                    }}
                                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
                                >
                                    <div className="font-semibold">Current Month</div>
                                    <div className="text-sm opacity-90">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                                </button>
                                <button
                                    onClick={() => {
                                        const next = new Date();
                                        next.setMonth(next.getMonth() + 1);
                                        handleGenerateForMonth(next.getMonth(), next.getFullYear());
                                    }}
                                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
                                >
                                    <div className="font-semibold">Next Month</div>
                                    <div className="text-sm opacity-90">{new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                                </button>
                                <button
                                    onClick={() => {
                                        const prev = new Date();
                                        prev.setMonth(prev.getMonth() - 1);
                                        handleGenerateForMonth(prev.getMonth(), prev.getFullYear());
                                    }}
                                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
                                >
                                    <div className="font-semibold">Previous Month</div>
                                    <div className="text-sm opacity-90">{new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                                </button>
                            </div>
                            <button
                                onClick={() => setShowMonthModal(false)}
                                className="w-full mt-4 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </div>
                )
            }
            {/* Invoice Modal */}
            {
                showInvoiceModal && selectedInvoice && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm print:p-0 print:bg-white print:static print:block">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`bg-white rounded-lg shadow-xl w-full max-w-2xl print:shadow-none print:w-full print:max-w-none print:rounded-none ${printFormat === 'thermal' ? 'max-w-[350px] mx-auto print:max-w-[80mm] print:mx-0' : 'p-8'}`}
                        >
                            {/* Print Controls */}
                            <div className="flex justify-between items-center mb-6 print:hidden p-6 pb-0">
                                <h2 className="text-xl font-bold text-gray-800">Invoice Preview</h2>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setPrintFormat('a4')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${printFormat === 'a4' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        A4
                                    </button>
                                    <button
                                        onClick={() => setPrintFormat('thermal')}
                                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${printFormat === 'thermal' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        Thermal (Mini)
                                    </button>
                                </div>
                            </div>

                            {/* Invoice Content */}
                            <div className={`print:p-0 ${printFormat === 'thermal' ? 'p-6 text-sm' : ''}`}>
                                {/* Header */}
                                <div className={`flex ${printFormat === 'thermal' ? 'flex-col text-center' : 'justify-between items-start'} mb-8 border-b border-gray-200 pb-6`}>
                                    <div className={`flex ${printFormat === 'thermal' ? 'flex-col justify-center' : 'items-center gap-4'}`}>
                                        <div>
                                            <h2 className={`${printFormat === 'thermal' ? 'text-xl' : 'text-3xl'} font-bold text-gray-900`}>TAGIHAN</h2>
                                            <p className="text-gray-500">#{selectedInvoice.id}</p>
                                        </div>
                                    </div>
                                    <div className={`${printFormat === 'thermal' ? 'mt-4 text-center' : 'text-right'}`}>
                                        {printFormat !== 'thermal' && invoiceSettings.logoUrl && (
                                            <div className="flex justify-end mb-3">
                                                <img src={invoiceSettings.logoUrl} alt="Company Logo" className="h-16 object-contain" />
                                            </div>
                                        )}
                                        <h3 className="font-bold text-xl text-gray-800">{invoiceSettings.companyName}</h3>
                                        <p className="text-sm text-gray-500 whitespace-pre-line">{invoiceSettings.companyAddress}</p>
                                        {invoiceSettings.companyContact && <p className="text-sm text-gray-500">{invoiceSettings.companyContact}</p>}
                                    </div>
                                </div>

                                {/* Details */}
                                <div className={`${printFormat === 'thermal' ? 'space-y-4' : 'grid grid-cols-2 gap-8'} mb-8`}>
                                    <div className={printFormat === 'thermal' ? 'text-center' : ''}>
                                        <p className="text-sm font-medium text-gray-500 mb-1">Tagihan Kepada:</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {customersData[selectedInvoice.username]?.name || selectedInvoice.username}
                                        </p>
                                        {customersData[selectedInvoice.username]?.address && (
                                            <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{customersData[selectedInvoice.username].address}</p>
                                        )}
                                        {customersData[selectedInvoice.username]?.phone && (
                                            <p className="text-sm text-gray-600 mt-1">{customersData[selectedInvoice.username].phone}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">ID: {selectedInvoice.username}</p>
                                    </div>
                                    <div className={printFormat === 'thermal' ? 'text-center' : 'text-right'}>
                                        <p className="text-sm font-medium text-gray-500 mb-1">Tanggal:</p>
                                        <p className="text-gray-900">{formatDate(selectedInvoice.date)}</p>
                                        <p className="text-sm font-medium text-gray-500 mt-2 mb-1">Status:</p>
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedInvoice.status === 'completed' ? 'bg-green-100 text-green-800 print:bg-transparent print:text-black print:border print:border-black' :
                                            selectedInvoice.status === 'postponed' ? 'bg-orange-100 text-orange-800 print:bg-transparent print:text-black print:border print:border-black' :
                                                selectedInvoice.status === 'merged' ? 'bg-gray-100 text-gray-500 print:bg-transparent print:text-black print:border print:border-black' :
                                                    'bg-red-100 text-red-800 print:bg-transparent print:text-black print:border print:border-black'
                                            }`}>
                                            {selectedInvoice.status === 'completed' ? 'LUNAS' :
                                                selectedInvoice.status === 'postponed' ? 'DITUNDA' :
                                                    selectedInvoice.status === 'merged' ? 'DIGABUNG' :
                                                        'BELUM BAYAR'}
                                        </span>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className={`${printFormat === 'thermal' ? 'border-t border-b border-dashed py-4' : 'bg-gray-50 rounded-lg p-6 print:bg-transparent print:border print:border-gray-200'} mb-8`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-600">Deskripsi</span>
                                        <span className="text-gray-600 font-medium">Jumlah</span>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-t border-gray-200">
                                        <span className="text-gray-900 font-medium">Pembayaran Layanan Internet</span>
                                        <span className="text-gray-900 font-bold">{formatCurrency(selectedInvoice.amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                        <span className="text-lg font-bold text-gray-900">Total</span>
                                        <span className="text-lg font-bold text-blue-600 print:text-black">{formatCurrency(selectedInvoice.amount)}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                {invoiceSettings.invoiceFooter && (
                                    <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t border-gray-100">
                                        <p>{invoiceSettings.invoiceFooter}</p>
                                    </div>
                                )}
                            </div>



                            {/* Actions */}
                            <div className="flex justify-end gap-3 print:hidden p-6 pt-0">
                                <button
                                    onClick={() => setShowInvoiceModal(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Tutup
                                </button>
                                <button
                                    onClick={() => window.print()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Printer size={18} /> Cetak Tagihan
                                </button>
                                {selectedInvoice.status !== 'completed' && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Tandai tagihan ini sebagai lunas?')) return;
                                                try {
                                                    const res = await fetch(`/api/billing/payments/${selectedInvoice.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            status: 'completed',
                                                            amount: selectedInvoice.amount,
                                                            notes: selectedInvoice.notes
                                                        }),
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        alert('Pembayaran berhasil dicatat');
                                                        setShowInvoiceModal(false);
                                                        fetchData();
                                                    } else {
                                                        alert('Gagal update pembayaran: ' + (data.error || 'Unknown error'));
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to update payment', error);
                                                    alert('Error: ' + error.message);
                                                }
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                        >
                                            <DollarSign size={18} /> Bayar Sekarang
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('Tunda tagihan ini ke bulan depan?')) return;
                                                try {
                                                    const res = await fetch(`/api/billing/payments/${selectedInvoice.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ status: 'postponed' }),
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        alert('Tagihan berhasil ditunda');
                                                        setShowInvoiceModal(false);
                                                        fetchData();
                                                    } else {
                                                        alert('Gagal menunda tagihan: ' + (data.error || 'Unknown error'));
                                                    }
                                                } catch (error) {
                                                    console.error('Failed to postpone payment', error);
                                                    alert('Error: ' + error.message);
                                                }
                                            }}
                                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                                        >
                                            <Calendar size={18} /> Tunda Bayar
                                        </button>
                                    </>
                                )}
                                {selectedInvoice.status === 'completed' && (
                                    <button
                                        onClick={() => handleSendWhatsApp(selectedInvoice)}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                                    >
                                        <MessageCircle size={18} /> Kirim WhatsApp
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div >
                )
            }
        </div >
    );
}
