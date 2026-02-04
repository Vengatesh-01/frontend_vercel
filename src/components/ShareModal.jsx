import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { FaTimes } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';

const ShareModal = ({ isOpen, onClose, contentToShare }) => {
    const { user } = useContext(AuthContext);
    const [recentConvs, setRecentConvs] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [followingIds, setFollowingIds] = useState(new Set());
    const [shareSearchQuery, setShareSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchRecentConversations();
            fetchSuggestions();
            setSelectedUsers(new Set());
            setShareSearchQuery('');
        }
    }, [isOpen, user]);

    const fetchRecentConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const { data } = await axios.get(`${BACKEND_URL}/api/messages/conversations`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentConvs(data);
        } catch (err) { console.error('Failed to fetch conversations:', err); }
    };

    const fetchSuggestions = async () => {
        try {
            const token = localStorage.getItem('token');
            // Parallel fetch: Profile (for following list) and All Users (for suggestions)
            const [profileRes, allUsersRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/users/profile/${user.username}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${BACKEND_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            // Set following IDs set for quick lookup
            const following = new Set((profileRes.data.following || []).map(u => u._id));
            setFollowingIds(following);

            // Merge and dedup suggestions: (Following list from profile) + (All users suggestions)
            const followingUsers = profileRes.data.following || [];
            const followersUsers = profileRes.data.followers || [];
            const allUsers = allUsersRes.data || [];

            // Combine all unique users
            const combined = [...followingUsers, ...followersUsers, ...allUsers];
            const uniqueUsers = Array.from(new Map(combined.map(item => [item._id, item])).values())
                .filter(u => String(u._id) !== String(user._id));

            setSuggestedUsers(uniqueUsers);
        } catch (err) { console.error('Failed to fetch data:', err); }
    };

    const handleFollow = async (e, targetId) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${BACKEND_URL}/api/users/follow/${targetId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistic update
            setFollowingIds(prev => {
                const next = new Set(prev);
                next.add(targetId);
                return next;
            });
            showNotification('Followed! You can now share.');
        } catch (err) {
            console.error('Follow failed:', err);
            showNotification('Failed to follow');
        }
    };

    const toggleUserSelection = (id) => {
        setSelectedUsers(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleShareToChat = async () => {
        if (selectedUsers.size === 0 || !contentToShare) return;
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            let payload = {};

            if (contentToShare.type === 'story') {
                const story = contentToShare.data;
                payload = {
                    text: '',
                    media: {
                        type: 'story',
                        url: story.url,
                        thumbnail: contentToShare.userAvatar || story.url,
                        refId: story._id || story.id
                    }
                };
            } else if (contentToShare.type === 'post') {
                const post = contentToShare.data;
                payload = {
                    text: '',
                    media: {
                        type: 'post',
                        url: post.imageUrl || post.videoUrl, // Support both image and video posts
                        thumbnail: post.user?.profilePic || post.user?.avatar || `https://ui-avatars.com/api/?name=${post.user?.username}`,
                        refId: post._id || post.id,
                        caption: post.text || post.caption || ''
                    }
                };
            } else if (contentToShare.type === 'reel') {
                const reel = contentToShare.data;
                payload = {
                    text: '',
                    media: {
                        type: 'reel',
                        url: reel.videoUrl,
                        thumbnail: reel.user?.avatar || `https://ui-avatars.com/api/?name=${reel.user?.username}`,
                        refId: reel._backendId || reel._id || reel.id,
                        caption: reel.caption || ''
                    }
                };
            }

            await Promise.all(Array.from(selectedUsers).map(targetId => {
                const isConv = recentConvs.some(c => c._id === targetId);
                return axios.post(`${BACKEND_URL}/api/messages`,
                    isConv ? { conversationId: targetId, ...payload } : { recipientId: targetId, ...payload },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }));

            showNotification(`Shared with ${selectedUsers.size} recipients! 🚀`);
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            console.error('Share error:', err);
            showNotification('Failed to share');
        } finally {
            setIsSubmitting(false);
        }
    };

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={onClose}>
            {notification && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[600] bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-2xl animate-fade-in-down">
                    {notification}
                </div>
            )}
            <div className="bg-white rounded-2xl w-full max-w-[420px] h-[580px] overflow-hidden shadow-2xl animate-fade-in flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-3.5 border-b border-gray-100 flex justify-between items-center relative">
                    <div className="w-10"></div>
                    <h2 className="font-bold text-[16px]">Share</h2>
                    <button onClick={onClose} className="p-1 hover:opacity-70 transition-opacity"><FaTimes size={20} /></button>
                </div>

                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
                    <span className="text-[15px] font-bold text-gray-900">To:</span>
                    <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                        {Array.from(selectedUsers).map(id => {
                            const conv = recentConvs.find(c => c._id === id);
                            let username = '';
                            if (conv) {
                                const other = conv.isGroup ? { username: conv.groupName } : conv.participants.find(p => p._id !== user._id);
                                username = other?.username;
                            } else {
                                const suggested = suggestedUsers.find(u => u._id === id);
                                username = suggested?.username;
                            }
                            return (
                                <div key={id} className="bg-[#e0f1ff] text-[#0095f6] px-3.5 py-1 rounded-full text-[12px] font-bold flex items-center gap-1.5 animate-fade-in">
                                    {username}
                                    <FaTimes className="cursor-pointer hover:opacity-70" size={10} onClick={() => toggleUserSelection(id)} />
                                </div>
                            );
                        })}
                        <input
                            type="text"
                            placeholder="Search..."
                            value={shareSearchQuery}
                            onChange={e => setShareSearchQuery(e.target.value)}
                            className="bg-transparent text-[15px] outline-none min-w-[120px] flex-1 py-1"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                    {recentConvs.length > 0 && <h3 className="px-4 py-2 text-[14px] font-bold">Recent</h3>}
                    {recentConvs
                        .filter(conv => {
                            const other = conv.isGroup ? { username: conv.groupName } : conv.participants.find(p => p._id !== user._id);
                            return other?.username?.toLowerCase().includes(shareSearchQuery.toLowerCase());
                        })
                        .map(conv => {
                            const other = conv.isGroup ? { username: conv.groupName, profilePic: conv.groupPic } : conv.participants.find(p => p._id !== user._id);
                            const isSelected = selectedUsers.has(conv._id);
                            return (
                                <div
                                    key={conv._id}
                                    className="flex items-center justify-between p-2 px-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                    onClick={() => toggleUserSelection(conv._id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={getAppUrl(other?.profilePic) || `https://ui-avatars.com/api/?name=${other?.username}`} className="w-11 h-11 rounded-full object-cover" />
                                        <div className="flex flex-col">
                                            <p className="text-[13px] font-bold">{other?.username}</p>
                                            <p className="text-[12px] text-gray-500">{conv.isGroup ? 'Group' : 'Suggested'}</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-[#0095f6] border-[#0095f6]' : 'border-gray-200'}`}>
                                        {isSelected && <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>}
                                    </div>
                                </div>
                            );
                        })}

                    {suggestedUsers.length > 0 && <h3 className="px-4 py-2 mt-2 text-[14px] font-bold">Suggested</h3>}
                    {suggestedUsers
                        .filter(u => {
                            const inRecent = recentConvs.some(c => !c.isGroup && c.participants.some(p => p._id === u._id));
                            return !inRecent && u.username.toLowerCase().includes(shareSearchQuery.toLowerCase());
                        })
                        .map(u => {
                            const isSelected = selectedUsers.has(u._id);
                            const isFollowing = followingIds.has(u._id);
                            return (
                                <div
                                    key={u._id}
                                    className="flex items-center justify-between p-2 px-4 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                    onClick={() => isFollowing ? toggleUserSelection(u._id) : null}
                                >
                                    <div className="flex items-center gap-3">
                                        <img src={getAppUrl(u.profilePic) || `https://ui-avatars.com/api/?name=${u.username}`} className="w-11 h-11 rounded-full object-cover" />
                                        <div className="flex flex-col">
                                            <p className="text-[13px] font-bold">{u.username}</p>
                                            <p className="text-[12px] text-gray-500">{u.username}</p>
                                        </div>
                                    </div>
                                    {isFollowing ? (
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-[#0095f6] border-[#0095f6]' : 'border-gray-200'}`}>
                                            {isSelected && <svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => handleFollow(e, u._id)}
                                            className="bg-[#0095f6] text-white px-4 py-1.5 rounded-lg text-[13px] font-bold hover:bg-[#1877f2] transition-colors"
                                        >
                                            Follow
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                </div>

                <div className="p-4 border-t border-gray-50">
                    <button
                        onClick={handleShareToChat}
                        disabled={selectedUsers.size === 0 || isSubmitting}
                        className={`w-full py-2.5 rounded-xl font-bold text-[14px] transition-all text-center ${selectedUsers.size > 0 ? 'bg-[#0095f6] text-white hover:bg-[#1877f2]' : 'bg-[#b2dffc] text-white cursor-not-allowed'}`}
                    >
                        {isSubmitting ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .animate-fade-in { animation: fadeIn 0.15s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in-down { animation: fadeInDown 0.3s ease-out; }
                @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default ShareModal;
