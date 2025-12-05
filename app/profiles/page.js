'use client';

import { useState, useEffect } from 'react';
import { ArrowUpDown, Edit, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ProfilesPage() {
    const [profiles, setProfiles] = useState([]);
    const [ipPools, setIpPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [usePoolForRemote, setUsePoolForRemote] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        localAddress: '',
        remoteAddress: '',
        rateLimit: '',
        price: ''
    });

    const sortData = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedProfiles = () => {
        if (!sortConfig.key) return profiles;

        const sorted = [...profiles].sort((a, b) => {
            const aVal = a[sortConfig.key] || '';
            const bVal = b[sortConfig.key] || '';

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    };

    useEffect(() => {
        fetchProfiles();
        fetchIpPools();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/pppoe/profiles');
            const data = await res.json();
            if (Array.isArray(data)) {
                setProfiles(data);
            }
        } catch (error) {
            console.error('Failed to fetch profiles', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchIpPools = async () => {
        try {
            const res = await fetch('/api/ip/pools');
            const data = await res.json();
            if (Array.isArray(data)) {
                setIpPools(data);
            }
        } catch (error) {
            console.error('Failed to fetch IP pools', error);
        }
    };

    const handleEdit = (profile) => {
        setSelectedProfile(profile);
        setFormData({
            name: profile.name,
            localAddress: profile['local-address'] || '',
            remoteAddress: profile['remote-address'] || '',
            rateLimit: profile['rate-limit'] || '',
            price: profile.price || ''
        });
        setEditMode(true);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Check if we're editing (has selectedProfile with ID) or creating new
            const isEditing = editMode && selectedProfile && selectedProfile['.id'];
            console.log('handleSubmit - editMode:', editMode, 'selectedProfile:', selectedProfile, 'isEditing:', isEditing);

            const endpoint = isEditing
                ? `/api/pppoe/profiles/${selectedProfile['.id']}`
                : '/api/pppoe/profiles';

            console.log('Endpoint:', endpoint, 'Method:', isEditing ? 'PUT' : 'POST');

            const res = await fetch(endpoint, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                setFormData({ name: '', localAddress: '', remoteAddress: '', rateLimit: '', price: '' });
                setEditMode(false);
                setSelectedProfile(null);
                setUsePoolForRemote(false);
                fetchProfiles();
                alert(isEditing ? 'Profile updated successfully' : 'Profile created successfully');
            } else {
                alert(`Failed to save profile: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to save profile', error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleDelete = async () => {
        if (!selectedProfile || !confirm(`Are you sure you want to delete profile "${selectedProfile.name}"?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/pppoe/profiles/${selectedProfile['.id']}`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (res.ok) {
                setShowModal(false);
                setEditMode(false);
                setSelectedProfile(null);
                fetchProfiles();
                alert('Profile deleted successfully');
            } else {
                alert(`Failed to delete profile: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to delete profile', error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditMode(false);
        setSelectedProfile(null);
        setUsePoolForRemote(false);
        setFormData({ name: '', localAddress: '', remoteAddress: '', rateLimit: '', price: '' });
    };

    return (
        <div>
            <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">PPPoE Profiles</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700"
                >
                    <Plus size={20} /> Add Profile
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => sortData('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Name <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remote Address</th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => sortData('rate-limit')}
                            >
                                <div className="flex items-center gap-1">
                                    Rate Limit <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                        ) : profiles.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-4 text-center text-gray-500">No profiles found</td></tr>
                        ) : (
                            getSortedProfiles().map((profile) => (
                                <tr key={profile['.id']} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{profile.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{profile['local-address']}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{profile['remote-address']}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{profile['rate-limit']}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                        {profile.price ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(profile.price) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleEdit(profile)}
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                        >
                                            <Edit size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white/90 backdrop-blur-md p-6 rounded-lg w-96 shadow-xl border border-white/20 max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-xl font-bold mb-4 text-gray-800">
                                {editMode ? 'Edit Profile' : 'Add New Profile'}
                            </h2>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={editMode}
                                        className="w-full border border-gray-300 rounded p-2 disabled:bg-gray-100/50 text-gray-900 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Local Address</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded p-2 text-gray-900 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.localAddress}
                                        onChange={(e) => setFormData({ ...formData, localAddress: e.target.value })}
                                        placeholder="e.g., 192.168.1.1"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Remote Address</label>
                                    <div className="flex items-center gap-2 mb-2">
                                        <label className="flex items-center text-sm text-gray-600">
                                            <input
                                                type="radio"
                                                checked={!usePoolForRemote}
                                                onChange={() => setUsePoolForRemote(false)}
                                                className="mr-1"
                                            />
                                            Manual
                                        </label>
                                        <label className="flex items-center text-sm text-gray-600">
                                            <input
                                                type="radio"
                                                checked={usePoolForRemote}
                                                onChange={() => setUsePoolForRemote(true)}
                                                className="mr-1"
                                            />
                                            From IP Pool
                                        </label>
                                    </div>
                                    {usePoolForRemote ? (
                                        <select
                                            className="w-full border border-gray-300 rounded p-2 text-gray-900 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.remoteAddress}
                                            onChange={(e) => setFormData({ ...formData, remoteAddress: e.target.value })}
                                        >
                                            <option value="">Select IP Pool</option>
                                            {ipPools.length === 0 ? (
                                                <option disabled>No IP pools available</option>
                                            ) : (
                                                ipPools.map((pool) => (
                                                    <option key={pool['.id']} value={pool.name}>
                                                        {pool.name} ({pool.ranges})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded p-2 text-gray-900 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={formData.remoteAddress}
                                            onChange={(e) => setFormData({ ...formData, remoteAddress: e.target.value })}
                                            placeholder="e.g., 192.168.1.2-192.168.1.254"
                                        />
                                    )}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Rate Limit</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-300 rounded p-2 text-gray-900 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.rateLimit}
                                        onChange={(e) => setFormData({ ...formData, rateLimit: e.target.value })}
                                        placeholder="e.g., 10M/10M"
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Price (IDR)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-gray-300 rounded p-2 text-gray-900 bg-white/50 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="e.g., 150000"
                                    />
                                </div>
                                <div className="flex justify-between gap-2">
                                    <div>
                                        {editMode && (
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="px-4 py-2 bg-red-600/90 hover:bg-red-700 text-white rounded transition-colors"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className="px-4 py-2 text-gray-600 hover:bg-gray-100/50 rounded transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-blue-600/90 hover:bg-blue-700 text-white rounded transition-colors"
                                        >
                                            {editMode ? 'Update' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
