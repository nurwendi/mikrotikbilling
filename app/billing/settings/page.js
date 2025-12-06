'use client';

import { useState, useEffect } from 'react';
import { Save, ArrowLeft, Building, MapPin, Phone, FileText, Image, Calendar, Mail } from 'lucide-react';
import Link from 'next/link';

export default function BillingSettingsPage() {
    const [settings, setSettings] = useState({
        companyName: '',
        companyAddress: '',
        companyContact: '',
        invoiceFooter: '',
        logoUrl: '',
        autoDropDate: 10,
        email: {
            host: 'smtp.gmail.com',
            port: '587',
            user: '',
            password: '',
            secure: false
        }
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [logoFile, setLogoFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/billing/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // Upload logo first if there's a new file
            let logoUrl = settings.logoUrl;
            if (logoFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('logo', logoFile);

                const uploadRes = await fetch('/api/billing/upload-logo', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const { logoUrl: newLogoUrl } = await uploadRes.json();
                    logoUrl = newLogoUrl;
                } else {
                    setMessage({ type: 'error', text: 'Failed to upload logo' });
                    setLoading(false);
                    setUploading(false);
                    return;
                }
                setUploading(false);
            }

            const res = await fetch('/api/billing/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...settings, logoUrl }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                setLogoFile(null);
                // Refresh settings to get the new logo URL
                fetchSettings();
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Error saving settings' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/billing" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <ArrowLeft size={24} className="text-gray-600" />
                </Link>
                <h1 className="text-3xl font-bold text-gray-800">Invoice Settings</h1>
            </div>

            {message.text && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Building size={16} /> Company Name
                            </label>
                            <input
                                type="text"
                                value={settings.companyName}
                                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="My ISP"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Phone size={16} /> Contact Number
                            </label>
                            <input
                                type="text"
                                value={settings.companyContact}
                                onChange={(e) => setSettings({ ...settings, companyContact: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0812..."
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin size={16} /> Company Address
                            </label>
                            <textarea
                                value={settings.companyAddress}
                                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows="2"
                                placeholder="Jalan..."
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <FileText size={16} /> Invoice Footer Note
                            </label>
                            <textarea
                                value={settings.invoiceFooter}
                                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows="2"
                                placeholder="Thank you for your business..."
                            />
                            <p className="text-xs text-gray-500 mt-1">This text will appear at the bottom of every invoice.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar size={16} /> Auto-Drop Date
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={settings.autoDropDate || ''}
                                onChange={(e) => setSettings({ ...settings, autoDropDate: parseInt(e.target.value) || 10 })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="10"
                            />
                            <p className="text-xs text-gray-500 mt-1">Day of the month (1-31) when the system should automatically drop users with unpaid invoices</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Image size={16} /> Company Logo
                            </label>
                            <div className="space-y-3">
                                {(settings.logoUrl || logoFile) && (
                                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                        <p className="text-xs text-gray-500 mb-2">Current Logo:</p>
                                        <img
                                            src={logoFile ? URL.createObjectURL(logoFile) : settings.logoUrl}
                                            alt="Company Logo"
                                            className="max-h-24 object-contain"
                                        />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogoFile(e.target.files[0])}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <p className="text-xs text-gray-500">Upload your company logo (PNG, JPG, max 2MB)</p>
                            </div>
                        </div>

                        {/* Email Settings */}
                        <div className="md:col-span-2 pt-6 border-t">
                            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                                <Mail size={20} /> Email Configuration (SMTP)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="smtp.gmail.com"
                                        value={settings.email?.host || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, host: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="587"
                                        value={settings.email?.port || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, port: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Email/User</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder="your-email@gmail.com"
                                        value={settings.email?.user || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, user: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password / App Password</label>
                                    <input
                                        type="password"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                        placeholder={settings.email?.password ? "******" : "Enter App Password"}
                                        value={settings.email?.password || ''}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, password: e.target.value } })}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="secure"
                                        checked={settings.email?.secure || false}
                                        onChange={(e) => setSettings({ ...settings, email: { ...settings.email, secure: e.target.checked } })}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="secure" className="text-sm text-gray-700">Use Secure Connection (SSL/TLS - Usually for port 465)</label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}
