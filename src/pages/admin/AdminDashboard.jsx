import { useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../../utils/urlUtils';
import { FaCheck, FaTimes, FaFlag, FaTrash, FaYoutube, FaChartLine } from 'react-icons/fa';

const AdminDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('reels'); // 'reels' or 'analytics'

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [analyticsRes, reelsRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${BACKEND_URL}/api/admin/reels`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAnalytics(analyticsRes.data.summary);
            setReels(reelsRes.data);
        } catch (error) {
            console.error('Error fetching admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    const handleUpdateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${BACKEND_URL}/api/admin/reels/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReels(reels.map(r => r._id === id ? { ...r, status } : r));
        } catch (error) {
            alert('Update failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this reel?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${BACKEND_URL}/api/admin/reels/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReels(reels.filter(r => r._id !== id));
        } catch (error) {
            alert('Delete failed');
        }
    };

    if (loading) return <div className="p-8 text-white">Loading Admin Panel...</div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-20">
            <header className="mb-8 flex justify-between items-center border-b border-zinc-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                        Admin Control Panel
                    </h1>
                    <p className="text-zinc-500 text-sm">Tamil Cinema Reels Management</p>
                </div>
                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button
                        onClick={() => setActiveTab('reels')}
                        className={`px-4 py-2 rounded-md transition-all ${activeTab === 'reels' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Reels
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-md transition-all ${activeTab === 'analytics' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Analytics
                    </button>
                </div>
            </header>

            {activeTab === 'analytics' && analytics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-in fade-in duration-500">
                    {[
                        { label: 'Total Reels', value: analytics.totalReels, icon: <FaMusic className="text-purple-500" /> },
                        { label: 'YouTube Syncs', value: analytics.youtubeReels, icon: <FaYoutube className="text-red-500" /> },
                        { label: 'Total Views', value: analytics.totalViews, icon: <FaChartLine className="text-green-500" /> },
                        { label: 'Flagged', value: analytics.flaggedReels, icon: <FaFlag className="text-orange-500" /> },
                    ].map((card, i) => (
                        <div key={i} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-zinc-400 text-sm font-medium">{card.label}</span>
                                {card.icon}
                            </div>
                            <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'reels' && (
                <div className="overflow-x-auto bg-zinc-900 rounded-xl border border-zinc-800">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-500 text-sm">
                                <th className="p-4 font-medium">Reel</th>
                                <th className="p-4 font-medium">Creator</th>
                                <th className="p-4 font-medium">Source</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {reels.map(reel => (
                                <tr key={reel._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-16 rounded bg-black overflow-hidden relative">
                                                <img src={reel.thumbnail} className="w-full h-full object-cover opacity-60" alt="" />
                                            </div>
                                            <div className="max-w-[200px]">
                                                <p className="text-xs font-semibold line-clamp-1">{reel.caption}</p>
                                                <p className="text-[10px] text-zinc-500">{new Date(reel.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm font-medium">{reel.creatorName}</td>
                                    <td className="p-4 text-xs font-mono text-zinc-500">
                                        <span className={`px-2 py-0.5 rounded ${reel.source === 'youtube' ? 'bg-red-900/20 text-red-500' : 'bg-blue-900/20 text-blue-500'}`}>
                                            {reel.source}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${reel.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                            reel.status === 'flagged' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-500/10 text-zinc-500'
                                            }`}>
                                            {reel.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {reel.status !== 'approved' && (
                                                <button onClick={() => handleUpdateStatus(reel._id, 'approved')} className="p-2 bg-green-500/10 text-green-500 rounded hover:bg-green-500 hover:text-white transition-all" title="Approve">
                                                    <FaCheck size={12} />
                                                </button>
                                            )}
                                            {reel.status !== 'flagged' && (
                                                <button onClick={() => handleUpdateStatus(reel._id, 'flagged')} className="p-2 bg-orange-500/10 text-orange-500 rounded hover:bg-orange-500 hover:text-white transition-all" title="Flag">
                                                    <FaFlag size={12} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(reel._id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all" title="Delete">
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
