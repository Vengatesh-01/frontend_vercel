import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FaSearch, FaTimes, FaClock } from 'react-icons/fa';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';

const SearchPanel = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [recentSearches, setRecentSearches] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load recent searches from localStorage
        const saved = localStorage.getItem('recentSearches');
        if (saved) {
            setRecentSearches(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setSearchResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        // Debounced search
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async (query) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Only show user results in the panel
            setSearchResults(res.data.users || []);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveRecentSearch = (user) => {
        const newRecent = [
            { username: user.username, profilePic: user.profilePic, _id: user._id },
            ...recentSearches.filter(r => r.username !== user.username)
        ].slice(0, 10); // Keep only 10 recent

        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    };

    const clearRecentSearch = (username) => {
        const updated = recentSearches.filter(r => r.username !== username);
        setRecentSearches(updated);
        localStorage.setItem('recentSearches', JSON.stringify(updated));
    };

    const clearAllRecent = () => {
        setRecentSearches([]);
        localStorage.removeItem('recentSearches');
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-[90]"
                onClick={onClose}
            />

            {/* Search Panel */}
            <div className="fixed left-0 md:left-[72px] xl:left-[245px] top-0 h-full w-full md:w-[400px] bg-white border-r border-gray-200 z-[100] shadow-2xl animate-slide-in">


                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Search</h2>
                    <button onClick={onClose} className="md:hidden text-gray-500 hover:text-black">
                        <FaTimes size={20} />
                    </button>
                </div>
                <div className="px-6 pb-4">

                    {/* Search Input */}
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 border-none rounded-lg py-2 pl-10 pr-4 focus:outline-none text-sm"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="overflow-y-auto h-[calc(100vh-140px)]">

                    {searchQuery.trim() ? (
                        // Search Results
                        <div className="p-4">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
                                </div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <Link
                                        key={user._id}
                                        to={`/profile/${user.username}`}
                                        onClick={() => {
                                            saveRecentSearch(user);
                                            onClose();
                                        }}
                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <img
                                            src={getAppUrl(user.profilePic) || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                            className="w-11 h-11 rounded-full object-cover"
                                            alt={user.username}
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm">{user.username}</div>
                                            {user.name && <div className="text-xs text-gray-500">{user.name}</div>}
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No results found
                                </div>
                            )}
                        </div>
                    ) : (
                        // Recent Searches
                        <div>
                            <div className="flex items-center justify-between px-6 py-4">
                                <h3 className="font-bold text-base">Recent</h3>
                                {recentSearches.length > 0 && (
                                    <button
                                        onClick={clearAllRecent}
                                        className="text-blue-500 text-sm font-semibold hover:text-blue-600"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {recentSearches.length > 0 ? (
                                <div className="px-2">
                                    {recentSearches.map(user => (
                                        <div
                                            key={user.username}
                                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group"
                                        >
                                            <Link
                                                to={`/profile/${user.username}`}
                                                onClick={onClose}
                                                className="flex items-center gap-3 flex-1"
                                            >
                                                <img
                                                    src={getAppUrl(user.profilePic) || `https://ui-avatars.com/api/?name=${user.username}&background=random`}
                                                    className="w-11 h-11 rounded-full object-cover"
                                                    alt={user.username}
                                                />
                                                <div className="flex-1">
                                                    <div className="font-semibold text-sm">{user.username}</div>
                                                </div>
                                            </Link>
                                            <button
                                                onClick={() => clearRecentSearch(user.username)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-gray-500 text-sm">
                                    No recent searches.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .animate-slide-in {
                    animation: slideIn 0.2s ease-out;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </>
    );
};

export default SearchPanel;
