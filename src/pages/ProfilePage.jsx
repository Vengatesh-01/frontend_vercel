import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';
import { FaEdit, FaTh, FaPlay, FaUserFriends, FaCheck, FaHeart, FaComment, FaCamera, FaTimes, FaCog } from 'react-icons/fa';
import { io } from 'socket.io-client';
import { uploadToCloudinary } from '../utils/cloudinary';

const ProfilePage = () => {
    const { username } = useParams();
    const location = useLocation();
    const { user: currentUser, checkUserLoggedIn } = useContext(AuthContext);
    const [profileUser, setProfileUser] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [userReels, setUserReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowed, setIsFollowed] = useState(false);
    const [activeTab, setActiveTab] = useState('posts');
    const socket = useRef(null);
    const hiddenFileInputRef = useRef(null);

    // Edit Profile State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editBio, setEditBio] = useState('');
    const [editFullname, setEditFullname] = useState('');
    const [editProfilePic, setEditProfilePic] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        // Immediate Preview
        const objectUrl = URL.createObjectURL(file);
        setEditProfilePic(objectUrl);
        setUploadError(null);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const token = localStorage.getItem('token');
            const data = await uploadToCloudinary(file, token, (percent) => {
                setUploadProgress(percent);
            });
            // STORE RELATIVE PATH, NOT FULL URL
            // This ensures getAppUrl works correctly and DB saves clean path
            setEditProfilePic(data.filePath);
        } catch (err) {
            console.error('Error uploading file:', err);
            const detailedMsg = err.response?.data?.message || err.message || 'Unknown error';
            setUploadError(`Upload failed: ${detailedMsg}`);
            // Revert to original on failure
            setEditProfilePic(profileUser.profilePic);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const directFileInputRef = useRef(null);
    const [isUploadingDirectly, setIsUploadingDirectly] = useState(false);

    const handleDirectFileChange = async (e) => {
        const file = e.target.files[0];
        // alert(`File selected: ${file?.name} (${Math.round(file?.size / 1024)} KB)`);
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        // alert('Starting Direct Upload...');
        setIsUploadingDirectly(true);
        try {
            const token = localStorage.getItem('token');
            const data = await uploadToCloudinary(file, token);
            // alert('UPLOAD SUCCESS! Received path: ' + data.filePath);
            // const fullUrl = getAppUrl(data.filePath);
            // setEditProfilePic(fullUrl); // Not needed for direct upload as we fetch fresh data

            // alert('Updating Profile Record...');
            const API_BASE_PUT = BACKEND_URL;
            const updateResponse = await axios.put(`${API_BASE_PUT}/api/users/profile`, {
                profilePic: data.filePath
            }, { headers: { Authorization: `Bearer ${token}` } });

            setProfileUser(prev => ({ ...prev, profilePic: updateResponse.data.profilePic }));
            // alert('Profile sync complete!');

            // Refresh global auth
            await checkUserLoggedIn();

        } catch (err) {
            console.error('Error during direct upload:', err);
            const errorMsg = err.response?.data?.message || err.message;
            // alert('Upload failed: ' + errorMsg);
        } finally {
            setIsUploadingDirectly(false);
        }
    };

    useEffect(() => {
        if (username) fetchProfileData();
    }, [username, currentUser]);

    // Socket.IO for Real-time Sync
    useEffect(() => {
        if (!currentUser) return;

        if (!currentUser) return;

        const SOCKET_URL = BACKEND_URL;
        socket.current = io(SOCKET_URL);

        socket.current.on('connect', () => {
            console.log('ProfilePage Socket connected');
            socket.current.emit('join', currentUser._id);
        });

        socket.current.on('user-followed', ({ followingId, followerId, isFollowing }) => {
            // Update counts if this is the profile of the person who was followed/unfollowed
            // OR if this is the profile of the person who did the following
            if (profileUser && (profileUser._id === followingId || profileUser._id === followerId)) {
                // Fetch fresh data for simplicity and accuracy
                fetchProfileData();
            }
        });

        socket.current.on('new-post', (post) => {
            if (profileUser && post.user._id === profileUser._id) {
                setUserPosts(prev => [post, ...prev]);
            }
        });

        return () => {
            if (socket.current) socket.current.disconnect();
        };
    }, [profileUser?._id, currentUser?._id]);

    const fetchProfileData = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const API_BASE = BACKEND_URL;

            const profileRes = await axios.get(`${API_BASE}/api/users/profile/${username}`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000
            });
            setProfileUser(profileRes.data);
            setIsFollowed(profileRes.data.followers.some(f => String(f._id) === String(currentUser?._id)));

            setEditBio(profileRes.data.bio || '');
            setEditFullname(profileRes.data.fullname || '');
            setEditProfilePic(profileRes.data.profilePic || '');

            setEditProfilePic(profileRes.data.profilePic || '');

            const postsRes = await axios.get(`${API_BASE}/api/posts`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000
            });
            const filteredPosts = postsRes.data.filter(p => p.user.username === username);
            setUserPosts(filteredPosts);

            // Fetch user's reels
            const reelsRes = await axios.get(`${API_BASE}/api/reels?source=manual&limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000
            });
            const filteredReels = reelsRes.data.filter(r =>
                r.user && r.user._id && String(r.user._id) === String(profileRes.data._id)
            );
            setUserReels(filteredReels);

            setLoading(false);
        } catch (error) {
            console.error('Error fetching profile:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('edit') === 'true' && profileUser && currentUser?.username === username) {
            setShowEditModal(true);
        }
    }, [location.search, profileUser, currentUser, username]);

    const handleFollowToggle = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_BASE = BACKEND_URL;
            const response = await axios.put(`${API_BASE}/api/users/follow/${profileUser._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsFollowed(response.data.isFollowing);
            setProfileUser(prev => ({
                ...prev,
                followers: response.data.isFollowing
                    ? [...prev.followers, { _id: currentUser._id }]
                    : prev.followers.filter(f => String(f._id) !== String(currentUser._id))
            }));
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const handleUpdateProfile = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const API_BASE = BACKEND_URL;
            const response = await axios.put(`${API_BASE}/api/users/profile`,
                { bio: editBio, fullname: editFullname, profilePic: editProfilePic },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // Update local profile state
            setProfileUser(prev => ({ ...prev, bio: response.data.bio, fullname: response.data.fullname, profilePic: response.data.profilePic }));

            // CRITICAL: Refresh AuthContext to update profile picture across entire app
            await checkUserLoggedIn();

            setShowEditModal(false);
            setIsSaving(false);
        } catch (error) { console.error('Error updating profile:', error); setIsSaving(false); }
    };

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;

    if (!profileUser) return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center"><h2 className="text-xl font-bold">User not found</h2></div>;

    const isOwnProfile = currentUser?.username === username;

    return (
        <div className="min-h-screen bg-[#fafafa] pt-8 pb-20 text-gray-900">
            <div className="max-w-[935px] mx-auto px-5">
                {/* Profile Header */}
                <div className="flex flex-row items-start gap-10 md:gap-20 mb-12">
                    <div className="flex-shrink-0 relative group">
                        <label
                            className={`w-20 h-20 md:w-36 md:h-36 rounded-full p-[2px] bg-gray-200 ${isOwnProfile ? 'cursor-pointer' : ''} relative overflow-hidden flex items-center justify-center`}
                        >
                            {isOwnProfile && (
                                <input
                                    type="file"
                                    onChange={handleDirectFileChange}
                                    className="hidden"
                                    accept="image/*"
                                    disabled={isUploadingDirectly}
                                />
                            )}
                            <img
                                src={getAppUrl(profileUser.profilePic)}
                                alt={profileUser.username}
                                className={`w-full h-full rounded-full object-cover border-4 border-white ${isUploadingDirectly ? 'opacity-30' : ''}`}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${profileUser.username}&background=random`;
                                }}
                            />
                            {isUploadingDirectly && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </label>
                        {isOwnProfile && (
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                                <FaCamera className="text-white text-xl md:text-3xl" />
                            </div>
                        )}
                        {isUploadingDirectly && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-5 mb-5 mt-2">
                        <h2 className="text-xl font-normal">{profileUser.username}</h2>
                        <div className="flex gap-2">
                            {isOwnProfile ? (
                                <>
                                    <button onClick={() => setShowEditModal(true)} className="px-5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors">Edit Profile</button>
                                    <button className="p-2"><FaCog className="text-xl" /></button>
                                </>
                            ) : (
                                <>
                                    <button onClick={handleFollowToggle} className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isFollowed ? 'bg-gray-100 hover:bg-gray-200' : 'bg-[#0095f6] hover:bg-[#1877f2] text-white'}`}>{isFollowed ? 'Following' : 'Follow'}</button>
                                    <button className="px-5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold">Message</button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="hidden md:flex gap-10 mb-5">
                        <div className="text-base"><span className="font-semibold">{userPosts.length}</span> posts</div>
                        <div className="text-base"><span className="font-semibold">{profileUser.followers.length}</span> followers</div>
                        <div className="text-base"><span className="font-semibold">{profileUser.following.length}</span> following</div>
                    </div>

                    <div>
                        <span className="font-semibold text-sm">{profileUser.username}</span>
                        <p className="text-sm mt-1 whitespace-pre-wrap font-light">{profileUser.bio || "Creator"}</p>
                    </div>
                </div>
            </div>

            {/* Mobile Stats */}
            <div className="md:hidden flex justify-around border-t border-gray-200 py-3 mb-4">
                <div className="text-center"><span className="block font-semibold">{userPosts.length}</span><span className="text-gray-400 text-xs">posts</span></div>
                <div className="text-center"><span className="block font-semibold">{profileUser.followers.length}</span><span className="text-gray-400 text-xs">followers</span></div>
                <div className="text-center"><span className="block font-semibold">{profileUser.following.length}</span><span className="text-gray-400 text-xs">following</span></div>
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-200">
                <div className="flex justify-center gap-14 -mt-[1px]">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex items-center gap-2 py-4 border-t text-xs font-semibold tracking-widest uppercase transition-colors ${activeTab === 'posts' ? 'border-black' : 'border-transparent text-gray-400 hover:text-gray-900'
                            }`}
                    >
                        <FaTh /> Posts
                    </button>
                    <button
                        onClick={() => setActiveTab('reels')}
                        className={`flex items-center gap-2 py-4 border-t text-xs font-semibold tracking-widest uppercase transition-colors ${activeTab === 'reels' ? 'border-black' : 'border-transparent text-gray-400 hover:text-gray-900'
                            }`}
                    >
                        <FaPlay /> Reels
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            {activeTab === 'posts' && (
                userPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center text-3xl mb-4"><FaCamera /></div>
                        <h3 className="text-2xl font-black">No Posts Yet</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 md:gap-7">
                        {userPosts.map(post => (
                            <Link key={post._id} to="/" className="group relative aspect-square overflow-hidden bg-gray-100">
                                <img
                                    src={getAppUrl(post.imageUrl)}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/placeholder-post.jpg'; // Better fallback path or keep placehold.co
                                        if (!e.target.src.includes('placehold.co')) {
                                            e.target.src = 'https://placehold.co/600x600/f3f4f6/9ca3af?text=Unavailable';
                                        }
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white text-lg font-bold">
                                    <div className="flex items-center gap-2"><FaHeart /> {post.likes.length}</div>
                                    <div className="flex items-center gap-2"><FaComment /> {post.comments.length}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )
            )}

            {activeTab === 'reels' && (
                userReels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center text-3xl mb-4"><FaPlay /></div>
                        <h3 className="text-2xl font-black">No Reels Yet</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1 md:gap-7">
                        {userReels.map(reel => (
                            <Link key={reel._id} to={`/reels?id=${reel._id}`} className="group relative aspect-[9/16] overflow-hidden bg-gray-100 rounded-lg">
                                {reel.source === 'youtube' ? (
                                    <img
                                        src={reel.thumbnail}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/400x700/f3f4f6/9ca3af?text=Reel+Preview';
                                        }}
                                    />
                                ) : reel.thumbnail && (reel.thumbnail.endsWith('.mp4') || reel.thumbnail.endsWith('.mov')) ? (
                                    <video
                                        src={getAppUrl(reel.thumbnail)}
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={getAppUrl(reel.thumbnail, 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1')}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://placehold.co/400x700/f3f4f6/9ca3af?text=Reel+Preview';
                                        }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-lg font-bold text-center">
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1.5"><FaPlay className="text-sm" /> {reel.views || 0}</div>
                                        <div className="flex items-center gap-1.5"><FaHeart className="text-sm" /> {reel.likes?.length || 0}</div>
                                    </div>
                                </div>
                                {reel.source === 'youtube' && (
                                    <div className="absolute top-2 right-2 text-white/70">
                                        <FaPlay size={12} />
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )
            )}

            {showEditModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                            <button onClick={() => setShowEditModal(false)}><FaTimes /></button>
                            <h2 className="font-bold">Edit Profile</h2>
                            <button onClick={handleUpdateProfile} disabled={isSaving || isUploading} className={`font-bold ${isSaving || isUploading ? 'text-gray-300' : 'text-[#0095f6]'}`}>{isSaving ? 'Saving' : 'Done'}</button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-5">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <img
                                    src={editProfilePic?.startsWith('blob:') ? editProfilePic : getAppUrl(editProfilePic)}
                                    className="w-14 h-14 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => fileInputRef.current.click()}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${profileUser.username}&background=random`;
                                    }}
                                />
                                <div>
                                    <div className="font-bold">{profileUser.username}</div>
                                    <button
                                        className="text-[#0095f6] text-xs font-bold"
                                        onClick={() => fileInputRef.current.click()}
                                    >{isUploading ? `Uploading ${uploadProgress}%...` : 'Change profile photo'}</button>
                                    {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                                <input type="text" value={editFullname} onChange={(e) => setEditFullname(e.target.value)} placeholder="Enter your full name" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:border-indigo-500 outline-none text-sm transition-all" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bio</label>
                                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Write your bio..." rows={4} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:border-indigo-500 outline-none resize-none text-sm transition-all" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                .animate-fade-in { animation: fadeIn 0.2s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
        </div>
    );
};

export default ProfilePage;
