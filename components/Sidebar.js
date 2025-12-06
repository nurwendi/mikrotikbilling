'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Settings, Server, Activity, LogOut, Menu, X, ChevronDown, ChevronRight, Network, CreditCard, WifiOff, Database, Code } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isPppoeExpanded, setIsPppoeExpanded] = useState(true);
    const { t } = useLanguage();

    const [userRole, setUserRole] = useState(null);
    const [appSettings, setAppSettings] = useState({ appName: 'Mikrotik Manager', logoUrl: '' });

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch user');
            })
            .then(data => setUserRole(data.user.role))
            .catch(() => setUserRole(null));

        // Fetch app settings
        fetch('/api/app-settings')
            .then(res => {
                if (res.ok) return res.json();
                throw new Error('Failed to fetch app settings');
            })
            .then(data => setAppSettings(data))
            .catch(() => setAppSettings({ appName: 'Mikrotik Manager', logoUrl: '' }));
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const toggleSidebar = () => {
        setIsOpen(!isOpen);
    };

    const closeSidebar = () => {
        setIsOpen(false);
    };

    const togglePppoe = () => {
        setIsPppoeExpanded(!isPppoeExpanded);
    };



    // Define top nav items
    const topNavItems = [
        { href: '/', icon: Home, label: t('sidebar.dashboard'), roles: ['admin', 'partner', 'viewer'] },
        { href: '/billing', icon: CreditCard, label: t('sidebar.billing'), roles: ['admin', 'partner'] },
    ].filter(item => !item.roles || (userRole && item.roles.includes(userRole)));

    // Define bottom nav items
    const bottomNavItems = [
        { href: '/system-users', icon: Users, label: t('sidebar.systemUsers'), roles: ['admin'] },
        { href: '/settings', icon: Server, label: t('sidebar.connection'), roles: ['admin'] },
        { href: '/backup', icon: Database, label: t('sidebar.backup'), roles: ['admin'] },
    ].filter(item => !item.roles || (userRole && item.roles.includes(userRole)));

    const pppoeItems = [
        { href: '/users', icon: Users, label: t('sidebar.users') },
        { href: '/active', icon: Activity, label: t('sidebar.activeConnections') },
        { href: '/offline', icon: WifiOff, label: 'Offline Users' },
        { href: '/profiles', icon: Settings, label: t('sidebar.profiles'), roles: ['admin'] },
    ].filter(item => !item.roles || (userRole && item.roles.includes(userRole)));



    return (
        <>
            {/* Hamburger Menu Button - Mobile Only - Bottom Center */}
            {!isOpen && (
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 hover:scale-110 print:hidden"
                >
                    <Menu size={28} />
                </button>
            )}

            {/* Sidebar - Full Screen on Mobile with Bottom-Up Animation */}
            <div className={`
                fixed h-screen bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-4 z-40 overflow-y-auto
                w-full lg:w-64
                left-0 lg:top-0
                lg:border-r lg:border-gray-200 lg:dark:border-gray-700
                ${isOpen ? 'top-0' : 'top-full'}
                lg:top-0 lg:translate-y-0
                glass-mode:bg-white/80 glass-mode:dark:bg-gray-900/80 glass-mode:backdrop-blur-md glass-mode:border-r glass-mode:border-gray-200/50 glass-mode:dark:border-white/10
                print:hidden
            `}
                style={{ transition: 'top 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="flex flex-col min-h-full lg:items-start items-center">
                    {/* Logo Section */}
                    <div className="mb-8 mt-2 lg:text-left text-center w-full lg:w-auto">
                        {appSettings.logoUrl ? (
                            /* Logo exists - only show logo, hide app name on desktop */
                            <img
                                src={appSettings.logoUrl}
                                alt="Logo"
                                className="h-16 lg:h-12 object-contain lg:mx-0 mx-auto"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'block';
                                }}
                            />
                        ) : (
                            /* No logo - show app name */
                            <h2 className="text-2xl font-bold text-blue-600 dark:text-white">
                                {appSettings.appName}
                            </h2>
                        )}
                    </div>

                    <nav className="flex-1 w-full lg:w-auto">
                        {/* Top Nav Items (Dashboard, Billing) */}
                        {topNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeSidebar}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${pathname === item.href
                                    ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        ))}

                        {/* PPPoE Parent Section */}
                        <div className="mb-2">
                            <button
                                onClick={togglePppoe}
                                className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-white transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Network size={20} />
                                    <span>PPPoE</span>
                                </div>
                                {isPppoeExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>

                            {/* PPPoE Children */}
                            {isPppoeExpanded && (
                                <div className="ml-8 mt-1">
                                    {pppoeItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={closeSidebar}
                                            className={`flex items-center gap-3 px-4 py-2 rounded-lg mb-1 transition-colors ${pathname === item.href
                                                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-white'
                                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-white'
                                                }`}
                                        >
                                            <item.icon size={18} />
                                            <span className="text-sm">{item.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>



                        {/* Bottom Nav Items (System Users, Connection, Backup) */}
                        {bottomNavItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={closeSidebar}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${pathname === item.href
                                    ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    {userRole === 'admin' && (
                        <Link
                            href="/app-settings"
                            onClick={closeSidebar}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${pathname === '/app-settings'
                                ? 'bg-blue-50 text-blue-600 dark:bg-gray-700 dark:text-white'
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-white'
                                }`}
                        >
                            <Settings size={20} />
                            <span>App Settings</span>
                        </Link>
                    )}

                    <button
                        onClick={() => {
                            handleLogout();
                            closeSidebar();
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>

                    {/* Mobile Close Button - Bottom */}
                    <div className="lg:hidden flex justify-center mt-6 mb-4 w-full">
                        <button
                            onClick={closeSidebar}
                            className="p-4 text-white bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                        >
                            <X size={28} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
