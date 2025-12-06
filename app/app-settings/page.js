'use client';

import { useState, useEffect } from 'react';
import { Upload, Save, User, Key, Image as ImageIcon, Palette, Clock, Gauge, Globe, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AppSettingsPage() {
    const { language, setLanguage, t } = useLanguage();


    const router = useRouter();

    const [settings, setSettings] = useState({
        appName: 'Mikrotik Manager',
        logoUrl: '',
        adminUsername: '',
        adminPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [preferences, setPreferences] = useState({
        display: {
            dateFormat: 'DD/MM/YYYY',
            timeFormat: '24h',
            timezone: 'Asia/Jakarta',
            bandwidthUnit: 'auto',
            memoryUnit: 'auto',
            temperatureUnit: 'celsius'
        },
        dashboard: {
            refreshInterval: 5000
        },
        tables: {
            rowsPerPage: 25
        }
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchSettings();
        fetchPreferences();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/app-settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({
                    ...prev,
                    appName: data.appName || 'Mikrotik Manager',
                    logoUrl: data.logoUrl || ''
                }));
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const fetchPreferences = async () => {
        try {
            const res = await fetch('/api/app-settings/preferences');
            if (res.ok) {
                const data = await res.json();
                setPreferences(prev => ({
                    ...prev,
                    ...data,
                    display: { ...prev.display, ...(data.display || {}) },
                    dashboard: { ...prev.dashboard, ...(data.dashboard || {}) },
                    tables: { ...prev.tables, ...(data.tables || {}) }
                }));
            }
        } catch (error) {
            console.error('Failed to fetch preferences', error);
        }
    };

    const handleSaveAppearance = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/app-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appName: settings.appName,
                    logoUrl: settings.logoUrl
                }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Appearance settings saved successfully!' });
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);
        data.append('type', type);

        try {
            const res = await fetch('/api/settings/upload', {
                method: 'POST',
                body: data,
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully. Refresh to see changes.` });
                // If logo, update the preview
                if (type === 'logo') {
                    // Assuming the upload API saves it to a predictable path or returns the path
                    // For now, just reload to see changes as the previous code did
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                setMessage({ type: 'error', text: 'Failed to upload file' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error uploading file' });
        }
    };

    const handleSavePreferences = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/app-settings/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(preferences),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Preferences saved successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save preferences' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving preferences' });
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        if (settings.newPassword !== settings.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match!' });
            setLoading(false);
            return;
        }

        if (settings.newPassword.length < 4) {
            setMessage({ type: 'error', text: 'Password must be at least 4 characters!' });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/app-settings/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: settings.adminUsername,
                    newPassword: settings.newPassword
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setSettings(prev => ({
                    ...prev,
                    adminUsername: '',
                    newPassword: '',
                    confirmPassword: ''
                }));
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error changing password' });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <div className="w-full space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Application Settings</h1>

            {message.text && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Logout Section */}
            <div className="bg-red-50 rounded-lg shadow-sm p-6 border border-red-100 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LogOut className="text-red-600" size={24} />
                        <div>
                            <h2 className="text-xl font-semibold text-red-800">Sign Out</h2>
                            <p className="text-sm text-red-600">End your current session</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm font-medium"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Language Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Globe className="text-green-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-800">{t('appSettings.language')}</h2>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-gray-600 mb-3">{t('appSettings.selectLanguage')}</p>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                        <button
                            type="button"
                            onClick={() => setLanguage('id')}
                            className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${language === 'id'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <span className="text-2xl">🇮🇩</span>
                            <span className="font-medium">{t('appSettings.indonesian')}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`p-4 rounded-lg border-2 flex items-center gap-3 transition-all ${language === 'en'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <span className="text-2xl">🇺🇸</span>
                            <span className="font-medium">{t('appSettings.english')}</span>
                        </button>
                    </div>
                </div>
            </div>


            {/* Display Preferences */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Clock className="text-blue-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-800">Display Preferences</h2>
                </div>

                <form onSubmit={handleSavePreferences} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date Format
                            </label>
                            <select
                                value={preferences.display.dateFormat}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    display: { ...preferences.display, dateFormat: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            >
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Time Format
                            </label>
                            <select
                                value={preferences.display.timeFormat}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    display: { ...preferences.display, timeFormat: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            >
                                <option value="12h">12-hour</option>
                                <option value="24h">24-hour</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bandwidth Unit
                            </label>
                            <select
                                value={preferences.display.bandwidthUnit}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    display: { ...preferences.display, bandwidthUnit: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            >
                                <option value="auto">Auto</option>
                                <option value="bps">bps</option>
                                <option value="Kbps">Kbps</option>
                                <option value="Mbps">Mbps</option>
                                <option value="Gbps">Gbps</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Memory Unit
                            </label>
                            <select
                                value={preferences.display.memoryUnit}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    display: { ...preferences.display, memoryUnit: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            >
                                <option value="auto">Auto</option>
                                <option value="B">Bytes</option>
                                <option value="KB">KB</option>
                                <option value="MB">MB</option>
                                <option value="GB">GB</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Temperature Unit
                            </label>
                            <select
                                value={preferences.display.temperatureUnit}
                                onChange={(e) => setPreferences({
                                    ...preferences,
                                    display: { ...preferences.display, temperatureUnit: e.target.value }
                                })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            >
                                <option value="celsius">Celsius (°C)</option>
                                <option value="fahrenheit">Fahrenheit (°F)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Preferences'}
                    </button>
                </form>
            </div>

            {/* Dashboard Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Gauge className="text-blue-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-800">Dashboard Settings</h2>
                </div>

                <form onSubmit={handleSavePreferences} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Auto-Refresh Interval
                        </label>
                        <select
                            value={preferences.dashboard.refreshInterval}
                            onChange={(e) => setPreferences({
                                ...preferences,
                                dashboard: { ...preferences.dashboard, refreshInterval: parseInt(e.target.value) }
                            })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                        >
                            <option value="0">Disabled</option>
                            <option value="5000">5 seconds</option>
                            <option value="10000">10 seconds</option>
                            <option value="30000">30 seconds</option>
                            <option value="60000">1 minute</option>
                            <option value="300000">5 minutes</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Dashboard Settings'}
                    </button>
                </form>
            </div>

            {/* Appearance Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <ImageIcon className="text-blue-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-800">Appearance</h2>
                </div>

                <form onSubmit={handleSaveAppearance}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Application Name
                        </label>
                        <input
                            type="text"
                            value={settings.appName}
                            onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            placeholder="Mikrotik Manager"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Logo (PNG)
                            </label>
                            <input
                                type="file"
                                accept="image/png"
                                onChange={(e) => handleFileUpload(e, 'logo')}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Replaces the app logo. Recommended size: 512x512px.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Favicon (ICO)
                            </label>
                            <input
                                type="file"
                                accept=".ico"
                                onChange={(e) => handleFileUpload(e, 'favicon')}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">Replaces the browser tab icon.</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Or use Logo URL
                        </label>
                        <input
                            type="text"
                            value={settings.logoUrl}
                            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            placeholder="https://example.com/logo.png"
                        />
                    </div>

                    {settings.logoUrl && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Logo Preview
                            </label>
                            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                <img
                                    src={settings.logoUrl}
                                    alt="Logo preview"
                                    className="h-12 object-contain"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <p className="text-red-500 text-sm hidden">Failed to load image</p>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        <Save size={18} />
                        {loading ? 'Saving...' : 'Save Appearance'}
                    </button>
                </form>
            </div>

            {/* Admin User Settings */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Key className="text-blue-600" size={24} />
                    <h2 className="text-xl font-semibold text-gray-800">Change Admin Password</h2>
                </div>

                <form onSubmit={handleChangePassword}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Admin Username
                        </label>
                        <input
                            type="text"
                            value={settings.adminUsername}
                            onChange={(e) => setSettings({ ...settings, adminUsername: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            placeholder="admin"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                        </label>
                        <input
                            type="password"
                            value={settings.newPassword}
                            onChange={(e) => setSettings({ ...settings, newPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            placeholder="Enter new password"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={settings.confirmPassword}
                            onChange={(e) => setSettings({ ...settings, confirmPassword: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            placeholder="Confirm new password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                        <User size={18} />
                        {loading ? 'Changing...' : 'Change Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
