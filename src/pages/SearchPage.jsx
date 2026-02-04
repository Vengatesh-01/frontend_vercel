import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';
import {
    FaSearch, FaHeart, FaComment, FaVideo, FaPlay, FaRegHeart, FaRegComment,
    FaRegPaperPlane, FaBookmark, FaRegBookmark, FaTimes, FaEllipsisH, FaRegSmile
} from 'react-icons/fa';

const SearchPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [exploreItems, setExploreItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedItem, setExpandedItem] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ posts: [], reels: [], users: [] });
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        // Debounce search API call
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                performSearch(searchQuery);
            } else {
                setIsSearching(false);
                setSearchResults({ posts: [], reels: [], users: [] });
                fetchExploreContent();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const performSearch = async (query) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const res = await axios.get(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`, config);

            const { reels = [], posts = [], users = [] } = res.data;

            // Format posts
            const formattedPosts = posts.map(post => ({
                type: 'post',
                id: post._id,
                _backendId: post._id,
                user: {
                    _id: post.user._id,
                    username: post.user.username || 'Unknown',
                    avatar: post.user.profilePic || `https://ui-avatars.com/api/?name=${post.user.username || 'U'}&background=random`
                },
                mediaUrl: getAppUrl(post.imageUrl),
                thumbnail: getAppUrl(post.imageUrl),
                caption: post.text || '',
                likesCount: post.likes ? post.likes.length : 0,
                commentsCount: post.comments ? post.comments.length : 0,
                comments: post.comments ? post.comments.map(c => ({
                    id: c._id,
                    user: c.user?.username || 'User',
                    avatar: getAppUrl(c.user?.profilePic) || `https://ui-avatars.com/api/?name=${c.user?.username || 'User'}`,
                    text: c.text,
                    isPinned: c.isPinned,
                    likes: c.likes || [],
                    replies: c.replies || []
                })) : [],
                isLiked: post.likes ? post.likes.includes(user?._id) : false,
                isSaved: user?.savedPosts ? user?.savedPosts?.includes(post._id) : false
            }));

            // Format reels
            const formattedReels = reels.map(reel => ({
                type: 'reel',
                id: reel._id,
                _backendId: reel._id,
                user: {
                    _id: reel.user?._id || reel.user,
                    username: reel.user?.username || reel.creatorName || 'Unknown',
                    avatar: reel.user?.profilePic || `https://ui-avatars.com/api/?name=${reel.user?.username || reel.creatorName || 'U'}&background=random`
                },
                mediaUrl: getAppUrl(reel.videoUrl),
                thumbnail: getAppUrl(reel.thumbnail || reel.videoUrl),
                caption: reel.caption || '',
                likesCount: reel.likes ? reel.likes.length : 0,
                commentsCount: reel.comments ? reel.comments.length : 0,
                comments: reel.comments ? reel.comments.map(c => ({
                    id: c._id,
                    user: c.user?.username || 'User',
                    avatar: getAppUrl(c.user?.profilePic) || `https://ui-avatars.com/api/?name=${c.user?.username || 'User'}`,
                    text: c.text,
                    likes: c.likes || [],
                    replies: []
                })) : [],
                isLiked: reel.likes ? reel.likes.includes(user?._id) : false,
                isSaved: false
            }));

            const combined = [...formattedPosts, ...formattedReels];
            setExploreItems(combined);
            setSearchResults({ posts: formattedPosts, reels: formattedReels, users });
            setLoading(false);
            setIsSearching(true);

        } catch (err) {
            console.error("Search error:", err);
            setError("Failed to search. Please try again.");
            setLoading(false);
        }
    };

    const fetchExploreContent = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            let postsData = [];
            let reelsData = [];

            // Independent fetches with specific error logging
            try {
                const postsRes = await axios.get(`${BACKEND_URL}/api/posts`, config);
                if (Array.isArray(postsRes.data)) postsData = postsRes.data;
            } catch (err) {
                console.warn("Explore: Failed to fetch posts", err.message);
            }

            try {
                const reelsRes = await axios.get(`${BACKEND_URL}/api/reels?random=true`, config);
                if (Array.isArray(reelsRes.data)) reelsData = reelsRes.data;
            } catch (err) {
                console.warn("Explore: Failed to fetch reels", err.message);
            }

            // Validate and Filter
            const validPosts = postsData.filter(p => p && p.user && p._id);
            const validReels = reelsData.filter(r => r && r.user && r._id);

            if (validPosts.length === 0 && validReels.length === 0) {
                // If both failed or are empty, we might have an issue, but we still render "No posts found"
                // If it was a 401, mostly likely the user sees empty.
            }

            const formattedPosts = validPosts.map(post => ({
                type: 'post',
                id: post._id,
                _backendId: post._id,
                user: {
                    _id: post.user._id,
                    username: post.user.username || 'Unknown',
                    avatar: post.user.profilePic || `https://ui-avatars.com/api/?name=${post.user.username || 'U'}&background=random`
                },
                mediaUrl: getAppUrl(post.imageUrl),
                thumbnail: getAppUrl(post.imageUrl),
                caption: post.text || '',
                likesCount: post.likes ? post.likes.length : 0,
                commentsCount: post.comments ? post.comments.length : 0,
                comments: post.comments ? post.comments.map(c => ({
                    id: c._id,
                    user: c.user?.username || 'User',
                    avatar: getAppUrl(c.user?.profilePic) || `https://ui-avatars.com/api/?name=${c.user?.username || 'User'}`,
                    text: c.text,
                    isPinned: c.isPinned,
                    likes: c.likes || [],
                    replies: c.replies || []
                })) : [],
                isLiked: post.likes ? post.likes.includes(user?._id) : false,
                isSaved: user?.savedPosts ? user?.savedPosts?.includes(post._id) : false
            }));

            const formattedReels = validReels.map(reel => ({
                type: 'reel',
                id: reel._id,
                _backendId: reel._id,
                user: {
                    _id: reel.user._id,
                    username: reel.user.username || 'Unknown',
                    avatar: reel.user.profilePic || `https://ui-avatars.com/api/?name=${reel.user.username || 'U'}&background=random`
                },
                mediaUrl: getAppUrl(reel.videoUrl),
                thumbnail: getAppUrl(reel.thumbnail || reel.videoUrl),
                caption: reel.caption || '',
                likesCount: reel.likes ? reel.likes.length : 0,
                commentsCount: reel.comments ? reel.comments.length : 0,
                comments: reel.comments ? reel.comments.map(c => ({
                    id: c._id,
                    user: c.user?.username || 'User',
                    avatar: getAppUrl(c.user?.profilePic) || `https://ui-avatars.com/api/?name=${c.user?.username || 'User'}`,
                    text: c.text,
                    likes: c.likes || [],
                    replies: []
                })) : [],
                isLiked: reel.likes ? reel.likes.includes(user?._id) : false,
                isSaved: false
            }));

            const combined = [...formattedPosts, ...formattedReels].sort(() => 0.5 - Math.random());
            setExploreItems(combined);
            setLoading(false);

        } catch (err) {
            console.error("Critical error in explore fetch:", err);
            setError("Failed to load content. Please try refreshing.");
            setLoading(false);
        }
    };

    const handleLike = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const endpoint = item.type === 'post'
                ? `${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/posts/${item._backendId}/like`
                : `${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/reels/${item._backendId}/like`;

            await axios.put(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });

            setExploreItems(prev => prev.map(i => {
                if (i.id === item.id) {
                    const isLiked = !i.isLiked;
                    return { ...i, isLiked, likesCount: isLiked ? i.likesCount + 1 : i.likesCount - 1 };
                }
                return i;
            }));

            if (expandedItem && expandedItem.id === item.id) {
                setExpandedItem(prev => ({
                    ...prev,
                    isLiked: !prev.isLiked,
                    likesCount: !prev.isLiked ? prev.likesCount + 1 : prev.likesCount - 1
                }));
            }
        } catch (err) { console.error(err); }
    };

    const handleSave = async (item) => {
        if (item.type === 'reel') return;
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.put(`${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/posts/${item._backendId}/save`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setExploreItems(prev => prev.map(i => i.id === item.id ? { ...i, isSaved: data.savedPosts.includes(item._backendId) } : i));
            if (expandedItem && expandedItem.id === item.id) {
                setExpandedItem(prev => ({ ...prev, isSaved: data.savedPosts.includes(item._backendId) }));
            }
        } catch (err) { console.error(err); }
    };

    const handleComment = async () => {
        if (!commentText.trim() || !expandedItem) return;
        try {
            const token = localStorage.getItem('token');
            const endpoint = expandedItem.type === 'post'
                ? `${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/posts/${expandedItem._backendId}/comment`
                : `${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/reels/${expandedItem._backendId}/comment`;

            const { data } = await axios.post(endpoint, { text: commentText }, { headers: { Authorization: `Bearer ${token}` } });

            const newComments = (expandedItem.type === 'post' ? data.comments : data.comments).map(c => ({
                id: c._id,
                user: c.user.username || user.username,
                avatar: getAppUrl(c.user.profilePic) || getAppUrl(user.profilePic),
                text: c.text,
                likes: [],
                replies: []
            }));

            const updatedItem = { ...expandedItem, comments: newComments };
            setExpandedItem(updatedItem);
            setExploreItems(prev => prev.map(i => i.id === expandedItem.id ? updatedItem : i));
            setCommentText('');
        } catch (err) { console.error(err); }
    };



    return (
        <div className="min-h-screen bg-[#fafafa] pt-8 px-4 pb-20">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Search Bar */}
                <div className="relative max-w-lg mx-auto">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-100 border-none rounded-lg py-2 pl-12 pr-6 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-all text-sm font-light"
                    />
                </div>

                {/* Explore Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium text-sm">Searching Reelio...</p>
                    </div>
                ) : (
                    <>
                        {isSearching && searchResults.users?.length > 0 && (
                            <div className="mb-0 overflow-x-auto no-scrollbar py-4">
                                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-1">Profiles</h2>
                                <div className="flex gap-4 pb-2">
                                    {searchResults.users.map(u => (
                                        <div
                                            key={u._id}
                                            onClick={() => navigate(`/profile/${u.username}`)}
                                            className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
                                        >
                                            <div className="p-0.5 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 transition-transform group-hover:scale-105">
                                                <div className="p-0.5 bg-white rounded-full">
                                                    <img
                                                        src={getAppUrl(u.profilePic) || `https://ui-avatars.com/api/?name=${u.username}&background=random`}
                                                        className="w-14 h-14 rounded-full object-cover"
                                                        alt={u.username}
                                                    />
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-semibold text-gray-900 truncate w-20 text-center">
                                                {u.username}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {exploreItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                                <FaSearch className="text-4xl mb-4 text-gray-300" />
                                <p className="text-sm">No results found for "{searchQuery}"</p>
                                <button onClick={() => { setSearchQuery(''); fetchExploreContent(); }} className="mt-4 text-[#0095f6] text-sm font-bold hover:underline">Clear search</button>
                            </div>
                        ) : (
                            <>
                                {isSearching && <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 mt-6 px-1">Posts & Reels</h2>}
                                <div className="grid grid-cols-3 gap-0.5 md:gap-7">
                                    {exploreItems.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => setExpandedItem(item)}
                                            className="aspect-square bg-gray-50 relative group cursor-pointer overflow-hidden rounded-sm"
                                        >
                                            {item.type === 'reel' || (item.mediaUrl && item.mediaUrl.match(/\.(mp4|mov|avi|webm)$/i)) ? (
                                                <video src={item.mediaUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={item.mediaUrl} className="w-full h-full object-cover" />
                                            )}

                                            {item.type === 'reel' && (
                                                <div className="absolute top-2 right-2 z-10">
                                                    <FaVideo className="text-white text-sm drop-shadow-md" />
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold">
                                                <div className="flex items-center gap-2">
                                                    <FaHeart size={18} className="fill-white" />
                                                    <span>{item.likesCount}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FaComment size={18} className="fill-white transform flip-x" />
                                                    <span>{item.commentsCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Expanded Item Modal */}
            {expandedItem && (
                <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setExpandedItem(null)}>
                    <div className={`bg-white w-full ${expandedItem.type === 'reel' ? 'max-w-[400px] md:max-w-4xl' : 'max-w-6xl'} h-[90vh] flex flex-col md:flex-row overflow-hidden rounded-r-lg shadow-2xl animate-scale-up`} onClick={e => e.stopPropagation()}>

                        <div className={`w-full md:flex ${expandedItem.type === 'reel' ? 'md:w-[50%]' : 'md:w-[60%]'} bg-black items-center justify-center relative`}>
                            {(expandedItem.type === 'reel' || expandedItem.mediaUrl.includes('.mp4')) ? (
                                <video src={expandedItem.mediaUrl} className="w-full h-full object-contain" controls autoPlay loop />
                            ) : (
                                <img src={expandedItem.mediaUrl} className="w-full h-full object-contain" />
                            )}
                        </div>

                        <div className={`w-full ${expandedItem.type === 'reel' ? 'md:w-[50%]' : 'md:w-[40%]'} flex flex-col bg-white h-full`}>
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={getAppUrl(expandedItem.user.avatar)} className="w-8 h-8 rounded-full border border-gray-100" />
                                    <span className="font-bold text-sm hover:underline cursor-pointer">{expandedItem.user.username}</span>
                                    {expandedItem.type === 'reel' && <span className="text-xs font-semibold text-gray-500 border border-gray-300 px-1 rounded">Reel</span>}
                                </div>
                                <FaEllipsisH className="cursor-pointer text-gray-900" />
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                                {expandedItem.caption && (
                                    <div className="flex gap-3 items-start">
                                        <img src={getAppUrl(expandedItem.user.avatar)} className="w-8 h-8 rounded-full border border-gray-100" />
                                        <div className="text-sm">
                                            <span className="font-bold mr-2">{expandedItem.user.username}</span>
                                            {expandedItem.caption}
                                        </div>
                                    </div>
                                )}

                                {expandedItem.comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 items-start group">
                                        <img src={getAppUrl(comment.avatar)} className="w-8 h-8 rounded-full border border-gray-100" />
                                        <div className="flex-1">
                                            <div className="text-sm">
                                                <span className="font-bold mr-2">{comment.user}</span>
                                                {comment.text}
                                            </div>
                                            <div className="flex gap-3 mt-1 text-xs text-gray-400 font-semibold">
                                                <span>Reply</span>
                                                {comment.likes?.length > 0 && <span>{comment.likes.length} likes</span>}
                                            </div>
                                        </div>
                                        <FaRegHeart size={12} className="text-gray-300 hover:text-gray-500 cursor-pointer mt-1" />
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-4 text-gray-900">
                                        <button onClick={() => handleLike(expandedItem)} className="hover:opacity-50 transition-opacity">
                                            {expandedItem.isLiked ? <FaHeart size={24} className="text-red-500" /> : <FaRegHeart size={24} />}
                                        </button>
                                        <FaRegComment size={24} className="hover:opacity-50 cursor-pointer" onClick={() => document.getElementById('comment-input').focus()} />
                                        <FaRegPaperPlane size={24} className="hover:opacity-50 cursor-pointer" />
                                    </div>
                                    <button onClick={() => handleSave(expandedItem)} className="hover:opacity-50 transition-opacity">
                                        {expandedItem.isSaved ? <FaBookmark size={24} className="text-black" /> : <FaRegBookmark size={24} />}
                                    </button>
                                </div>
                                <div className="font-bold text-sm mb-2">{expandedItem.likesCount.toLocaleString()} likes</div>

                                <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
                                    <FaRegSmile size={24} className="text-gray-900 cursor-pointer" />
                                    <input
                                        id="comment-input"
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={commentText}
                                        onChange={e => setCommentText(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleComment()}
                                        className="flex-1 outline-none text-sm"
                                    />
                                    <button
                                        onClick={handleComment}
                                        disabled={!commentText.trim()}
                                        className="text-[#0095f6] font-bold text-sm disabled:opacity-30"
                                    >
                                        Post
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setExpandedItem(null)} className="absolute top-4 right-4 text-white md:hidden z-[130]"><FaTimes size={24} /></button>
                </div>
            )}

            <style jsx>{`
                .animate-scale-up { animation: scaleUp 0.2s ease-out; }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default SearchPage;
