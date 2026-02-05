import { useContext, useEffect, useState, useRef, useMemo } from 'react';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import ShareModal from '../components/ShareModal';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';
import {
    FaHeart, FaComment, FaShare, FaRegHeart, FaRegComment, FaRegPaperPlane, FaRegBookmark,
    FaEllipsisH, FaThumbtack, FaBookmark, FaVideo, FaPlus, FaSearch, FaTimes, FaCamera,
    FaChevronLeft, FaChevronRight, FaPaperPlane, FaRegSmile, FaVolumeMute, FaVolumeUp, FaPlay, FaPause
} from 'react-icons/fa';
import { io } from 'socket.io-client';
import { uploadToCloudinary } from '../utils/cloudinary';

const HomePage = ({ showCreatePost, setShowCreatePost, showUploadModal, setShowUploadModal }) => {
    const { user, logout, loading: authLoading } = useContext(AuthContext);
    const navigate = useNavigate();

    const [posts, setPosts] = useState([]);
    const [userReels, setUserReels] = useState([]);
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stories, setStories] = useState([]);
    const [storiesLoading, setStoriesLoading] = useState(true);
    const [notification, setNotification] = useState(null);
    const [activeStory, setActiveStory] = useState(null);
    const [videoProgress, setVideoProgress] = useState(0);
    const [userStory, setUserStory] = useState(null);
    const [postOptionsMenu, setPostOptionsMenu] = useState(null);
    const [commentTexts, setCommentTexts] = useState({});
    const [newPostCaption, setNewPostCaption] = useState('');
    const [newPostImage, setNewPostImage] = useState('');
    const [expandedPost, setExpandedPost] = useState(null);
    const [shareModalPost, setShareModalPost] = useState(null);
    const [recentConvs, setRecentConvs] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null); // { commentId, username }
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [visibleReplies, setVisibleReplies] = useState({}); // { commentId: boolean }
    const [hiddenComments, setHiddenComments] = useState(new Set());
    const [isStoryMuted, setIsStoryMuted] = useState(false);
    const [isStoryPaused, setIsStoryPaused] = useState(false);
    const [currentUserIndex, setCurrentUserIndex] = useState(0);
    const [likedStories, setLikedStories] = useState(new Set());
    const [showStoryMenu, setShowStoryMenu] = useState(false);
    const [storyDuration, setStoryDuration] = useState(5); // Default 5s
    const [isLoadingStory, setIsLoadingStory] = useState(false);
    const [storyError, setStoryError] = useState(false);
    const [reelMuted, setReelMuted] = useState({}); // Track mute state for each reel
    const [previewMediaType, setPreviewMediaType] = useState('image'); // 'image' or 'video'
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activeVideoId, setActiveVideoId] = useState(null); // Track which video is currently in viewport

    const progressInterval = useRef(null);
    const socket = useRef(null);
    const hiddenPostInputRef = useRef(null);
    const videoRefs = useRef(new Map()); // Store video element references
    const videoObserver = useRef(null); // Intersection Observer instance

    const allDisplayStories = useMemo(() => {
        return userStory ? [userStory, ...stories] : stories;
    }, [userStory, stories]);

    // Fetch Posts
    const fetchPosts = async () => {
        try {
            console.log('Fetching posts...');
            const token = localStorage.getItem('token');
            if (!token) return;
            const { data } = await axios.get(`${BACKEND_URL}/api/posts`, {
                headers: { Authorization: `Bearer ${token} ` },
                timeout: 30000
            });
            setPosts(data.map(post => ({
                id: post._id,
                type: 'post',
                user: {
                    _id: post.user._id,
                    username: post.user.username,
                    avatar: post.user.profilePic || `https://ui-avatars.com/api/?name=${post.user.username}&background=random`,
                    isCurrentUser: String(post.user._id) === String(user?._id)
                },
                image: post.imageUrl,
                caption: post.text,
                likesCount: post.likes.length,
                comments: post.comments.map(c => ({
                    id: c._id,
                    user: c.user.username || 'User',
                    avatar: c.user.profilePic || `https://ui-avatars.com/api/?name=${c.user.username}`,
                    text: c.text,
                    isPinned: c.isPinned,
                    createdAt: c.createdAt,
                    likes: c.likes || [],
                    replies: c.replies || []
                })).sort((a, b) => (b.isPinned === a.isPinned) ? 0 : b.isPinned ? 1 : -1),
                time: new Date(post.createdAt).toLocaleDateString(),
                isLiked: post.likes.includes(user?._id),
                isSaved: user?.savedPosts?.some(id => String(id) === String(post._id)),
                _backendId: post._id,
                _likes: post.likes,
                createdAt: post.createdAt
            })));
            setLoading(false);
        } catch (err) { console.error(err); setLoading(false); }
    };

    // Fetch User Uploaded Reels
    const fetchUserReels = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const { data } = await axios.get(`${BACKEND_URL}/api/reels?source=manual&limit=100`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 30000
            });
            // Only show user-uploaded reels (manual source), not YouTube reels
            const manualReels = data.filter(reel =>
                reel.source === 'manual' && reel.user && reel.user._id
            );
            setUserReels(manualReels.map(reel => ({
                id: reel._id,
                type: 'reel',
                user: {
                    _id: reel.user._id,
                    username: reel.user.username,
                    avatar: reel.user.profilePic || `https://ui-avatars.com/api/?name=${reel.user.username}&background=random`,
                    isCurrentUser: String(reel.user._id) === String(user?._id)
                },
                videoUrl: getAppUrl(reel.videoUrl),
                thumbnail: getAppUrl(reel.thumbnail),
                caption: reel.caption || '',
                likesCount: reel.likes?.length || 0,
                comments: (reel.comments || []).map(c => ({
                    id: c._id,
                    user: c.user?.username || 'User',
                    avatar: c.user?.profilePic || `https://ui-avatars.com/api/?name=${c.user?.username || 'User'}`,
                    text: c.text,
                    createdAt: c.createdAt
                })),
                time: new Date(reel.createdAt).toLocaleDateString(),
                isLiked: reel.likes?.includes(user?._id),
                _backendId: reel._id,
                _likes: reel.likes || [],
                createdAt: reel.createdAt
            })));
        } catch (err) { console.error('Error fetching reels:', err); }
    };

    // Fetch Suggested Users
    const fetchSuggestions = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${BACKEND_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 });
            setSuggestedUsers(data.filter(u => String(u._id) !== String(user?._id)).slice(0, 5));
        } catch (err) { console.error(err); }
    };

    // Fetch Recent Conversations for Sharing
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

    // Combine posts and reels into single feed
    useEffect(() => {
        if (posts.length > 0 || userReels.length > 0) {
            const combined = [...posts, ...userReels];
            // Sort by creation date, newest first
            combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setFeedItems(combined);
        }
    }, [posts, userReels]);

    // Socket.IO for Real-time Sync
    useEffect(() => {
        if (!user) return;

        socket.current = io(`${BACKEND_URL}`);

        socket.current.on('connect', () => {
            console.log('HomePage Socket connected');
            socket.current.emit('join', user._id);
        });

        // Listen for real-time updates
        socket.current.on('post-liked', ({ postId, likes, likesCount }) => {
            setPosts(prev => prev.map(p =>
                (p._backendId === postId || p.id === postId)
                    ? { ...p, _likes: likes, likesCount: likesCount, isLiked: likes.includes(user._id) }
                    : p
            ));
        });

        socket.current.on('post-commented', ({ postId, comments }) => {
            setPosts(prev => prev.map(p =>
                (p._backendId === postId || p.id === postId)
                    ? {
                        ...p, comments: comments.map(c => ({
                            id: c._id,
                            user: c.user.username || 'User',
                            avatar: c.user.profilePic || `https://ui-avatars.com/api/?name=${c.user.username}`,
                            text: c.text,
                            isPinned: c.isPinned,
                            createdAt: c.createdAt,
                            likes: c.likes || [],
                            replies: c.replies || []
                        }))
                    }
                    : p
            ));
        });

        socket.current.on('reel-liked', ({ reelId, likes, totalLikes }) => {
            setUserReels(prev => prev.map(r =>
                (r._backendId === reelId || r.id === reelId)
                    ? { ...r, _likes: likes, likesCount: totalLikes, isLiked: likes.includes(user._id) }
                    : r
            ));
        });

        socket.current.on('reel-commented', ({ reelId, comments }) => {
            setUserReels(prev => prev.map(r =>
                (r._backendId === reelId || r.id === reelId)
                    ? {
                        ...r, comments: comments.map(c => ({
                            id: c._id,
                            user: c.user?.username || 'User',
                            avatar: c.user?.profilePic || `https://ui-avatars.com/api/?name=${c.user?.username || 'User'}`,
                            text: c.text,
                            createdAt: c.createdAt
                        }))
                    }
                    : r
            ));
        });

        socket.current.on('new-post', (populatedPost) => {
            // Check if post is from current user or someone they follow
            // For simplicity, we trigger a refresh or add manually if we have follow logic here
            // fetchPosts() is safer but more expensive. Let's fetchPosts for now.
            fetchPosts();
        });

        socket.current.on('post-deleted', (postId) => {
            setPosts(prev => prev.filter(p => p._backendId !== postId && p.id !== postId));
        });

        socket.current.on('new-story', () => {
            fetchStories();
        });

        socket.current.on('story-viewed', () => {
            fetchStories();
        });

        return () => {
            if (socket.current) socket.current.disconnect();
        };
    }, [user?._id]);

    useEffect(() => {
        if (user) {
            fetchPosts();
            fetchUserReels();
            fetchSuggestions();
            fetchRecentConversations();
        } else if (!authLoading) {
            setLoading(false);
            navigate('/login');
        }
    }, [user, authLoading]);

    // Fetch Stories
    const fetchStories = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const { data } = await axios.get(`${BACKEND_URL}/api/stories`, { headers: { Authorization: `Bearer ${token}` }, timeout: 30000 });

            // Group stories by user
            const grouped = data.reduce((acc, story) => {
                if (!story.user) return acc;
                const userId = story.user._id;

                if (!acc[userId]) {
                    acc[userId] = {
                        user: {
                            _id: story.user._id,
                            username: story.user.username,
                            avatar: story.user.profilePic || `https://ui-avatars.com/api/?name=${story.user.username}&background=random`
                        },
                        stories: []
                    };
                }
                acc[userId].stories.push({
                    id: story._id,
                    url: story.videoUrl, // Keep raw URL, getAppUrl handles normalization in renderer
                    type: 'video',
                    isSeen: story.views.includes(user?._id),
                    createdAt: story.createdAt
                });
                return acc;
            }, {});

            const formatted = Object.keys(grouped).map(userId => ({
                id: userId,
                ...grouped[userId]
            }));

            // Filter out own story for the general bar, but keep it for userStory
            setStories(formatted.filter(s => String(s.id) !== String(user?._id)));

            const myGroup = grouped[user?._id];
            if (myGroup) {
                setUserStory({
                    id: user?._id,
                    ...myGroup
                });
            } else {
                setUserStory(null);
            }

            setStoriesLoading(false);
        } catch (err) { console.error('Error fetching stories:', err); setStoriesLoading(false); }
    };

    useEffect(() => { if (user) fetchStories(); }, [user]);

    // Smart Video Playback: Intersection Observer for Feed Videos
    useEffect(() => {
        // Create observer to track which video is in viewport
        videoObserver.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const videoId = entry.target.dataset.videoId;

                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        // Video is 50%+ visible, make it active
                        setActiveVideoId(videoId);

                        // Play the video
                        const video = entry.target;
                        video.play().catch(err => console.log('Autoplay prevented:', err));
                    } else if (!entry.isIntersecting || entry.intersectionRatio < 0.5) {
                        // Video is less than 50% visible or out of view
                        const video = entry.target;
                        video.pause();

                        // If this was the active video, clear active state
                        setActiveVideoId(prev => prev === videoId ? null : prev);
                    }
                });
            },
            {
                threshold: [0, 0.5, 1.0], // Trigger at 0%, 50%, and 100% visibility
                rootMargin: '0px'
            }
        );

        // Observe all existing videos
        videoRefs.current.forEach((video, id) => {
            if (video) {
                videoObserver.current.observe(video);
            }
        });

        // Cleanup
        return () => {
            if (videoObserver.current) {
                videoObserver.current.disconnect();
            }
        };
    }, [feedItems]); // Re-run when feed items change

    // Story Progress Logic
    // Initialize story state when index changes
    useEffect(() => {
        if (activeStory) {
            setVideoProgress(0);
            setStoryDuration(5); // Reset to default (image)
            setIsStoryPaused(false);
        }
    }, [activeStory, currentStoryIndex]); // Reset on story change

    // Story Progress Logic
    useEffect(() => {
        if (activeStory && activeStory.stories?.length > 0) {
            const currentStory = activeStory.stories[currentStoryIndex];

            // ... (View marking logic remains same, abstracted if confusing) ...
            if (currentStory && !currentStory.isSeen) {
                const token = localStorage.getItem('token');
                axios.put(`${BACKEND_URL}/api/stories/${currentStory.id}/view`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(console.error);
                currentStory.isSeen = true;
            }

            progressInterval.current = setInterval(() => {
                if (isStoryPaused || showStoryMenu) return;
                setVideoProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(progressInterval.current);
                        if (activeStory.stories && currentStoryIndex < activeStory.stories.length - 1) {
                            setCurrentStoryIndex(prevIdx => prevIdx + 1);
                        } else {
                            // Try to go to next user's story
                            const allDisplayStories = userStory ? [userStory, ...stories] : stories;
                            if (currentUserIndex < allDisplayStories.length - 1) {
                                const nextUser = allDisplayStories[currentUserIndex + 1];
                                setCurrentUserIndex(currentUserIndex + 1);
                                setCurrentStoryIndex(0);
                                setActiveStory(nextUser);
                            } else {
                                setActiveStory(null);
                                setCurrentStoryIndex(0);
                            }
                        }
                        return 100;
                    }
                    // Dynamic duration: 100% / (duration * 10 ticks/sec)
                    return prev + (10 / storyDuration);
                });
            }, 100);
        } else {
            clearInterval(progressInterval.current);
        }
        return () => clearInterval(progressInterval.current);
    }, [activeStory, currentStoryIndex, isStoryPaused, showStoryMenu, storyDuration, stories, userStory, currentUserIndex]);

    const handleFileSelect = async (e, type) => {
        const file = e.target.files?.[0];
        if (!file) {
            console.log('No file detected. Picker might have been cancelled.');
            return;
        }

        // 1. Immediate Preview Support
        const isVideo = file.type.startsWith('video');
        setPreviewMediaType(isVideo ? 'video' : 'image');
        const localPreviewUrl = URL.createObjectURL(file);

        if (type === 'post') {
            setNewPostImage(localPreviewUrl);
        }

        setIsSubmitting(true);
        setIsUploading(true);
        setUploadProgress(0);

        try {
            const token = localStorage.getItem('token');
            const data = await uploadToCloudinary(file, token, (percent) => {
                setUploadProgress(percent);
            });

            if (!data || !data.filePath) {
                throw new Error('Server returned an empty file path');
            }

            if (type === 'post') {
                const finalUrl = getAppUrl(data.filePath);
                // Only replace if finalUrl is valid, otherwise keep the local preview
                if (finalUrl) {
                    setNewPostImage(finalUrl);
                }
            } else if (type === 'story') {
                try {
                    await axios.post(`${BACKEND_URL}/api/stories`, {
                        videoUrl: data.filePath
                    }, { headers: { Authorization: `Bearer ${token}` } });

                    setShowUploadModal(false);
                    fetchStories();
                    showNotification('Story shared! 🎥');
                } catch (storyErr) {
                    console.error('Story creation failed:', storyErr);
                    const msg = storyErr.response?.data?.message || storyErr.message;
                    showNotification('Failed to create story: ' + msg);
                }
            }
        } catch (error) {
            console.error('Upload failed:', error);
            const errorMsg = error.response?.data?.message || error.message;
            showNotification('Upload failed: ' + errorMsg);
            // Optionally clear preview on fatal upload error
            // if (type === 'post') setNewPostImage(''); 
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();

        if (!newPostImage || !newPostImage.trim()) {
            showNotification('Please select a photo or video first.');
            return;
        }

        if (isUploading) {
            showNotification('Please wait for the upload to complete.');
            return;
        }
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');

            // Detect if the uploaded file is a video (for reel creation)
            const isVideo = previewMediaType === 'video';

            if (isVideo) {
                // Create as Reel
                await axios.post(`${BACKEND_URL}/api/reels`, {
                    videoUrl: newPostImage,
                    caption: newPostCaption,
                    thumbnail: newPostImage // Use video URL as thumbnail placeholder
                }, { headers: { Authorization: `Bearer ${token}` } });

                setShowCreatePost(false);
                setNewPostCaption('');
                setNewPostImage('');
                fetchUserReels(); // Refresh reels to show the new upload
                showNotification('Reel shared! 🎬');
            } else {
                // Create as Post (existing functionality - unchanged)
                await axios.post(`${BACKEND_URL}/api/posts`, {
                    text: newPostCaption,
                    imageUrl: newPostImage
                }, { headers: { Authorization: `Bearer ${token}` } });

                setShowCreatePost(false);
                setNewPostCaption('');
                setNewPostImage('');
                fetchPosts();
                showNotification('Post shared! ✨');
            }
        } catch (err) {
            console.error(err);
            showNotification('Failed to share. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleLike = async (itemId) => {
        try {
            const token = localStorage.getItem('token');
            const item = feedItems.find(i => i.id === itemId);

            if (item.type === 'post') {
                const post = posts.find(p => p.id === itemId);
                await axios.put(`${BACKEND_URL}/api/posts/${post._backendId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
                setPosts(posts.map(p => {
                    if (p.id === itemId) {
                        const isLiked = p._likes.includes(user._id);
                        const newLikes = isLiked ? p._likes.filter(id => id !== user._id) : [...p._likes, user._id];
                        return { ...p, isLiked: !isLiked, likesCount: newLikes.length, _likes: newLikes };
                    }
                    return p;
                }));
            } else if (item.type === 'reel') {
                const reel = userReels.find(r => r.id === itemId);
                await axios.post(`${BACKEND_URL}/api/reels/like/${reel._backendId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
                setUserReels(userReels.map(r => {
                    if (r.id === itemId) {
                        const isLiked = r._likes.includes(user._id);
                        const newLikes = isLiked ? r._likes.filter(id => id !== user._id) : [...r._likes, user._id];
                        return { ...r, isLiked: !isLiked, likesCount: newLikes.length, _likes: newLikes };
                    }
                    return r;
                }));
            }
        } catch (err) { console.error(err); }
    };

    const handleSavePost = async (postId) => {
        try {
            const token = localStorage.getItem('token');
            const post = posts.find(p => p.id === postId);
            const { data } = await axios.put(`${BACKEND_URL}/api/posts/${post._backendId}/save`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setPosts(prev => prev.map(p => p.id === postId ? { ...p, isSaved: data.savedPosts.includes(post._backendId) } : p));
            showNotification(data.savedPosts.includes(post._backendId) ? 'Saved' : 'Removed from Saved');
        } catch (err) { console.error(err); }
    };

    const handleDeletePost = async (postId) => {
        const item = feedItems.find(i => i.id === postId);
        const isReel = item?.type === 'reel' || item?.type === 'normal';
        const itemTypeLabel = isReel ? 'reel' : 'post';

        if (!window.confirm(`Are you sure you want to delete this ${itemTypeLabel}?`)) return;

        try {
            const token = localStorage.getItem('token');
            const backendId = item?._backendId || item?.id || postId;
            const endpoint = isReel ? `${BACKEND_URL}/api/reels/${backendId}` : `${BACKEND_URL}/api/posts/${backendId}`;

            console.log(`Attempting to delete ${itemTypeLabel}:`, { backendId, endpoint });

            await axios.delete(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local state
            if (isReel) {
                setUserReels(prevItems => prevItems.filter(r => r.id !== backendId && r._backendId !== backendId));
            } else {
                setPosts(prevPosts => prevPosts.filter(p => (p._backendId || p.id) !== backendId));
            }

            if (expandedPost && (expandedPost._backendId === backendId || expandedPost.id === backendId)) {
                setExpandedPost(null);
            }

            setPostOptionsMenu(null);
            showNotification(`${itemTypeLabel.charAt(0).toUpperCase() + itemTypeLabel.slice(1)} deleted successfully.`);
        } catch (err) {
            console.error(`Failed to delete ${itemTypeLabel}:`, err);
            const errorMessage = err.response?.data?.message || err.message || 'Please try again.';
            showNotification(`Failed to delete ${itemTypeLabel}: ${errorMessage}`);
        }
    };

    const handleDeleteStory = async (storyId) => {
        if (!window.confirm('Are you sure you want to delete this story?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${BACKEND_URL}/api/stories/${storyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showNotification('Story deleted successfully.');
            setShowStoryMenu(false);
            setIsStoryPaused(false);

            // Refresh stories
            fetchStories();

            // Handle UI state
            if (activeStory && activeStory.stories.length > 1) {
                // Return to first story or close
                setCurrentStoryIndex(0);
            } else {
                setActiveStory(null);
            }
        } catch (err) {
            console.error('Failed to delete story:', err);
            showNotification('Failed to delete story.');
        }
    };

    const handleAddComment = async (itemId) => {
        const text = commentTexts[itemId] || '';
        if (!text.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const item = feedItems.find(i => i.id === itemId);

            if (item && item.type === 'post') {
                const post = posts.find(p => p.id === itemId);
                const { data } = await axios.post(`${BACKEND_URL}/api/posts/${post._backendId}/comment`, { text }, { headers: { Authorization: `Bearer ${token}` } });

                // Re-fetch posts or update local state with populated data
                const updatedPost = {
                    ...post,
                    comments: data.comments.map(c => ({
                        id: c._id,
                        user: c.user.username || user.username,
                        avatar: c.user.profilePic || `https://ui-avatars.com/api/?name=${c.user.username || user.username}`,
                        text: c.text,
                        likes: c.likes || [],
                        replies: c.replies || [],
                        isPinned: c.isPinned,
                        time: 'Just now',
                        _backendId: c._id
                    })).sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                };
                setPosts(prev => prev.map(p => p.id === itemId ? updatedPost : p));
                if (expandedPost && expandedPost.id === itemId) setExpandedPost(updatedPost);
            } else if (item && item.type === 'reel') {
                const reel = userReels.find(r => r.id === itemId);
                await axios.post(`${BACKEND_URL}/api/reels/${reel._backendId}/comment`, { text }, { headers: { Authorization: `Bearer ${token}` } });
                showNotification('Comment added! ✨');
            }

            setCommentTexts({ ...commentTexts, [itemId]: '' });
        } catch (err) { console.error(err); }
    };

    const handleLikeComment = async (postId, commentId) => {
        try {
            const token = localStorage.getItem('token');
            const post = posts.find(p => p.id === postId);
            const { data } = await axios.put(`${BACKEND_URL}/api/posts/${post._backendId}/comment/${commentId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });

            // Map backend data to local structure
            const updatedPost = {
                ...post,
                comments: data.comments.map(c => ({
                    id: c._id,
                    user: c.user.username,
                    avatar: c.user.profilePic,
                    text: c.text,
                    likes: c.likes,
                    replies: c.replies,
                    isPinned: c.isPinned,
                    time: 'Just now',
                    _backendId: c._id
                }))
            };
            setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
            if (expandedPost && expandedPost.id === postId) setExpandedPost(updatedPost);
        } catch (err) { console.error(err); }
    };

    const handleReplyToComment = async (postId, commentId, text) => {
        if (!text.trim()) return;
        try {
            const token = localStorage.getItem('token');
            const post = posts.find(p => p.id === postId);
            const { data } = await axios.post(`${BACKEND_URL}/api/posts/${post._backendId}/comment/${commentId}/reply`, { text }, { headers: { Authorization: `Bearer ${token}` } });

            const updatedPost = {
                ...post,
                comments: data.comments.map(c => ({
                    id: c._id,
                    user: c.user.username,
                    avatar: c.user.profilePic,
                    text: c.text,
                    likes: c.likes,
                    replies: c.replies,
                    isPinned: c.isPinned,
                    time: 'Just now',
                    _backendId: c._id
                }))
            };
            setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
            if (expandedPost && expandedPost.id === postId) setExpandedPost(updatedPost);
            showNotification('Reply added! 💬');
        } catch (err) { console.error(err); }
    };

    const handleEmojiClick = (postId, emoji) => {
        setCommentTexts(prev => ({
            ...prev,
            [postId]: (prev[postId] || '') + emoji
        }));
    };

    const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };


    if (authLoading || (loading && user)) return <div className="min-h-screen bg-white flex items-center justify-center w-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;

    if (!user && !authLoading) return null;

    return (
        <div className="min-h-screen bg-[#fafafa] pb-12 flex justify-center">
            {notification && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-2xl animate-fade-in-down">{notification}</div>}

            <div className="w-full max-w-[820px] pt-8 flex gap-8">

                {/* Main Content Column (Feed + Stories) */}
                <div className="flex-1 max-w-[470px]">
                    {/* Stories Bar */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex gap-4 overflow-x-auto no-scrollbar">
                        <div className="flex flex-col items-center gap-1 min-w-[66px] cursor-pointer group" onClick={() => {
                            if (userStory) {
                                setCurrentUserIndex(0);
                                setCurrentStoryIndex(0);
                                setActiveStory(userStory);
                            } else {
                                setShowUploadModal(true);
                            }
                        }}>
                            <div className={`p-[2.5px] rounded-full ${userStory ? (userStory.stories.every(s => s.isSeen) ? 'border border-gray-200' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600') : 'border border-gray-200'} relative transition-transform hover:scale-105 active:scale-95`}>
                                <img
                                    src={getAppUrl(user?.profilePic) || `https://ui-avatars.com/api/?name=${user?.username}`}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-white"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://ui-avatars.com/api/?name=${user?.username}&background=random`;
                                    }}
                                />
                                <div
                                    className="absolute bottom-0 right-0 bg-[#0095f6] rounded-full p-0.5 border-2 border-white hover:bg-[#1877f2] transition-colors z-20"
                                    onClick={(e) => {
                                        if (userStory) {
                                            e.stopPropagation();
                                            setShowUploadModal(true);
                                        }
                                    }}
                                >
                                    <FaPlus className="text-[8px] text-white" />
                                </div>
                            </div>
                            <span className="text-[10px] text-gray-500 truncate w-14 text-center">Your Story</span>
                        </div>
                        {stories.map((s, idx) => (
                            <div key={s.id} className="flex flex-col items-center gap-1 min-w-[66px] cursor-pointer" onClick={() => {
                                setCurrentUserIndex(userStory ? idx + 1 : idx);
                                setCurrentStoryIndex(0);
                                console.log('Opening story:', s);
                                setActiveStory(s);
                            }}>
                                <div className={`p-[2.5px] rounded-full ${s.isSeen ? 'border border-gray-200' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'} transition-transform hover:scale-105 active:scale-95`}>
                                    <img
                                        src={getAppUrl(s.user.avatar)}
                                        className="w-14 h-14 rounded-full object-cover border-2 border-white"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://ui-avatars.com/api/?name=${s.user.username}&background=random`;
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] text-gray-500 truncate w-14 text-center tracking-tight">{s.user.username}</span>
                            </div>
                        ))}
                    </div>

                    {/* Feed */}
                    <div className="space-y-6">
                        {feedItems.map(item => (
                            <div key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden transition-all duration-300">
                                <div className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 p-[1.5px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex-shrink-0">
                                            <img
                                                src={getAppUrl(item.user.avatar)}
                                                className="w-full h-full rounded-full object-cover border-2 border-white"
                                                alt={item.user.username}
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = `https://ui-avatars.com/api/?name=${item.user.username}&background=random`;
                                                }}
                                            />
                                        </div>
                                        <Link to={`/profile/${item.user.username}`} className="font-semibold text-[13px] text-gray-900 hover:opacity-50 transition-opacity">{item.user.username}</Link>
                                    </div>
                                    <button onClick={() => setPostOptionsMenu(item.id)} className="text-gray-900 p-2 hover:bg-gray-50 rounded-full transition-colors"><FaEllipsisH size={14} /></button>
                                </div>
                                {item.type === 'post' ? (
                                    <div className="aspect-square bg-white flex items-center justify-center overflow-hidden border-y border-gray-50">
                                        <img
                                            src={getAppUrl(item.image)}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = 'https://placehold.co/600x600/f3f4f6/9ca3af?text=Image+Unavailable';
                                            }}
                                            onDoubleClick={() => !item.isLiked && handleLike(item.id)}
                                        />
                                    </div>
                                ) : (
                                    <div className="aspect-square bg-black flex items-center justify-center overflow-hidden border-y border-gray-50 relative">
                                        {item.videoUrl && (item.videoUrl.includes('youtube.com') || item.videoUrl.includes('youtu.be')) ? (
                                            <iframe
                                                src={item.videoUrl.replace('watch?v=', 'embed/').split('&')[0] + '?autoplay=0&mute=1&playsinline=1&controls=0&modestbranding=1'}
                                                className="w-full h-full"
                                                title="YouTube video player"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            ></iframe>
                                        ) : (
                                            <>
                                                <img
                                                    src={getAppUrl(item.thumbnail)}
                                                    className="w-full h-full object-cover opacity-50"
                                                    alt="loading..."
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                                <video
                                                    ref={(el) => {
                                                        if (el) {
                                                            // Register video with observer
                                                            el.dataset.videoId = item.id;
                                                            videoRefs.current.set(item.id, el);
                                                            if (videoObserver.current) {
                                                                videoObserver.current.observe(el);
                                                            }
                                                        } else {
                                                            // Clean up when unmounted
                                                            videoRefs.current.delete(item.id);
                                                        }
                                                    }}
                                                    src={getAppUrl(item.videoUrl)}
                                                    className="w-full h-full object-contain absolute top-0 left-0"
                                                    loop
                                                    muted={activeVideoId !== item.id || reelMuted[item.id] !== false}
                                                    playsInline
                                                    onError={(e) => {
                                                        console.error('Video error:', item.videoUrl);
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                                {/* Mute/Unmute Button */}
                                                <button
                                                    onClick={() => setReelMuted(prev => ({ ...prev, [item.id]: prev[item.id] === false ? true : false }))}
                                                    className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors z-10"
                                                >
                                                    {reelMuted[item.id] !== false ? (
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleLike(item.id)} className={`transition-transform active:scale-125 ${item.isLiked ? 'text-red-500 animate-jump' : 'text-gray-900 hover:opacity-50'}`}>{item.isLiked ? <FaHeart size={24} /> : <FaRegHeart size={24} />}</button>
                                            <button onClick={() => document.getElementById(`comment-input-${item.id}`)?.focus()} className="text-gray-900 hover:opacity-50 transition-opacity"><FaRegComment size={24} /></button>
                                            <button onClick={() => setShareModalPost(item)} className="text-gray-900 hover:opacity-50 transition-opacity"><FaRegPaperPlane size={24} /></button>
                                        </div>
                                        {item.type === 'post' && <button onClick={() => handleSavePost(item.id)} className="text-gray-900 hover:opacity-50 transition-opacity">{item.isSaved ? <FaBookmark size={24} /> : <FaRegBookmark size={24} />}</button>}
                                    </div>
                                    <p className="text-[13px] font-bold mb-1">{item.likesCount.toLocaleString()} {item.likesCount === 1 ? 'like' : 'likes'}</p>
                                    <div className="text-[13px] leading-snug">
                                        <span className="font-bold mr-2 hover:opacity-50 cursor-pointer">{item.user.username}</span>{item.caption}
                                    </div>

                                    {/* Compact Feed Comments Preview - Only for Posts */}
                                    {item.type === 'post' && item.comments.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {item.comments.length > 2 && (
                                                <button onClick={() => setExpandedPost(item)} className="text-gray-500 text-[13px] hover:underline block">
                                                    View all {item.comments.length} comments
                                                </button>
                                            )}
                                            {item.comments.slice(-2).map(c => (
                                                <div key={c.id} className="text-[13px] leading-snug">
                                                    <span className="font-bold mr-2 hover:opacity-50 cursor-pointer">{c.user}</span>
                                                    {c.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center gap-3">
                                        <img
                                            src={getAppUrl(user?.profilePic) || `https://ui-avatars.com/api/?name=${user?.username}`}
                                            className="w-8 h-8 rounded-full border border-gray-100 flex-shrink-0"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = `https://ui-avatars.com/api/?name=${user?.username}&background=random`;
                                            }}
                                        />
                                        <div className="flex-1 flex items-center gap-2 border border-gray-200 p-2 rounded-3xl bg-white transition-all focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-200">
                                            <input
                                                id={`comment-input-${item.id}`}
                                                type="text"
                                                placeholder="Add a comment..."
                                                value={commentTexts[item.id] || ''}
                                                onChange={e => setCommentTexts({ ...commentTexts, [item.id]: e.target.value })}
                                                onKeyPress={e => e.key === 'Enter' && handleAddComment(item.id)}
                                                className="flex-1 text-[13px] bg-transparent outline-none px-2"
                                            />
                                            <button
                                                onClick={() => handleAddComment(item.id)}
                                                disabled={!(commentTexts[item.id] || '').trim()}
                                                className="text-[#0095f6] text-[13px] font-bold disabled:opacity-30 pr-3 hover:text-[#1877f2] transition-colors"
                                            >
                                                Post
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Suggestions Column */}
                <div className="hidden lg:block w-[320px] pt-4">
                    {/* My Profile Brief */}
                    <div className="flex items-center justify-between mb-6 px-1">
                        <div className="flex items-center gap-4">
                            <img
                                src={getAppUrl(user?.profilePic) || `https://ui-avatars.com/api/?name=${user?.username}`}
                                className="w-12 h-12 rounded-full object-cover border border-gray-100"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${user?.username}&background=random`;
                                }}
                            />
                            <div className="text-[13px]">
                                <p className="font-bold text-gray-900">{user?.username}</p>
                                <p className="text-gray-500 font-light">{user?.username || 'Creator'}</p>
                            </div>
                        </div>
                        <button onClick={logout} className="text-[#0095f6] text-[12px] font-bold hover:text-gray-900 transition-colors">Switch</button>
                    </div>



                    {/* Suggestions Content */}
                    <div className="px-1">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gray-500 font-bold text-[13px]">Suggested for you</h3>
                            <button className="text-gray-900 text-[12px] font-bold hover:opacity-50">See All</button>
                        </div>
                        <div className="space-y-4">
                            {suggestedUsers.map(u => (
                                <div key={u._id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={getAppUrl(u.profilePic) || `https://ui-avatars.com/api/?name=${u.username}`}
                                            className="w-8 h-8 rounded-full border border-gray-100"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = `https://ui-avatars.com/api/?name=${u.username}&background=random`;
                                            }}
                                        />
                                        <div className="text-[12px]">
                                            <p className="font-bold text-gray-900 leading-tight">{u.username}</p>
                                            <p className="text-gray-500 font-light leading-tight">Followed by some_user</p>
                                        </div>
                                    </div>
                                    <button className="text-[#0095f6] text-[12px] font-bold hover:text-gray-900 transition-colors">Follow</button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

            {/* Modals remain the same but styled better */}

            {showCreatePost && (
                <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowCreatePost(false)}>
                    <div className="bg-white md:rounded-xl w-full max-w-[800px] h-[100dvh] md:h-auto lg:h-[500px] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
                            <button onClick={() => setShowCreatePost(false)} className="text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded-full"><FaTimes size={18} /></button>
                            <h2 className="font-bold text-sm">Create new post</h2>
                            <button
                                onClick={handleCreatePost}
                                disabled={isUploading || isSubmitting || !newPostImage.trim()}
                                className={`font-bold text-sm transition-colors ${(!isUploading && !isSubmitting && newPostImage.trim()) ? 'text-[#0095f6] hover:text-[#1877f2]' : 'text-gray-300'}`}
                            >
                                {isUploading ? `Uploading ${uploadProgress}%` : isSubmitting ? 'Sharing...' : 'Share'}
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col md:flex-row min-h-0">
                            {/* Left: Preview Area */}
                            <div className="w-full md:w-[60%] lg:w-[65%] bg-zinc-50 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-gray-100 min-h-[300px] md:min-h-0">
                                {newPostImage ? (
                                    <div className="relative w-full h-full flex items-center justify-center group overflow-hidden rounded-lg">
                                        {(previewMediaType === 'video' || newPostImage.match(/\.(mp4|mov|avi|webm)$/i) || newPostImage.includes('video/upload')) ? (
                                            <video
                                                src={newPostImage}
                                                className="max-w-full max-h-full object-contain"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                onError={(e) => {
                                                    console.error('Preview Vid Error:', newPostImage);
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <img
                                                src={newPostImage}
                                                className="max-w-full max-h-full object-contain"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://placehold.co/600x600/f3f4f6/9ca3af?text=Preview+Error';
                                                }}
                                            />
                                        )}
                                        <button onClick={() => { setNewPostImage(''); setPreviewMediaType('image'); }} className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-opacity"><FaTimes size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6 text-center animate-fade-in w-full max-w-xs">
                                        <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-2">
                                            <svg aria-label="Media" color="#262626" fill="#262626" height="77" role="img" viewBox="0 0 97.6 77.3" width="96"><path d="M16.3 24h.3c.3 0 .6.1.8.4l.1.1 5.1 8.5c1.6 2.7 1.1 6.1-1.1 8.2l-4 3.7c-.5.4-.4 1.2.1 1.5l17.2 11.4c.5.3.8 1.1.7 1.6l-1.3 5.4c-.4 1.7-2.1 2.6-3.7 2.1l-10-3.1c-.5-.2-1.1.1-1.3.6l-2.1 5.3c-.6 1.6-2.5 2.1-3.8 1.1l-6-4.6c-.7-.5-1-.1-1.4.3l-2.8 2.8c-1.3 1.3-3.4 1.3-4.7 0l-.3-.3c-1.3-1.3-1.3-3.4 0-4.7l2.8-2.8c.4-.4.8-.7.3-1.4l-4.6-6c-1-1.3-.5-3.2 1.1-3.8l5.3-2.1c.5-.2.8-.8.6-1.3l-3.1-10c-.5-1.6.4-3.3 2.1-3.7l5.4-1.3c.6-.1 1.4.2 1.6.7l11.4 17.2c.3.5 1.1.6 1.5.1l3.7-4c2.1-2.2 5.5-2.7 8.2-1.1l8.5 5.1c.3.2.4.5.4.8v.3c0 2.1-1.7 3.8-3.8 3.8H16.3c-2.1 0-3.8-1.7-3.8-3.8V23.5c0-2.1 1.7-3.8 3.8-3.8z" fillRule="evenodd"></path><path d="M72.2 46.5c-4.7 0-8.5-3.8-8.5-8.5s3.8-8.5 8.5-8.5 8.5 3.8 8.5 8.5-3.8 8.5-8.5 8.5zm0-15c-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5-2.9-6.5-6.5-6.5z" fillRule="evenodd"></path><path d="M12.2 0l42.4 20c1.7.8 2.4 2.8 1.6 4.5l-4.5 9.5c-.8 1.7-2.8 2.4-4.5 1.6L4.7 15.6C3 14.8 2.3 12.8 3.1 11.1l4.5-9.5C8.4-.1 10.5-.8 12.2 0z" fillRule="evenodd"></path><path d="M85.4 0L43 20c-1.7.8-2.4 2.8-1.6 4.5l4.5 9.5c.8 1.7 2.8 2.4 4.5 1.6l42.4-20c1.7-.8 2.4-2.8 1.6-4.5l-4.5-9.5C89.1-.1 87.1-.8 85.4 0z" fillRule="evenodd"></path></svg>
                                        </div>
                                        <div className="space-y-4 w-full">
                                            <p className="text-xl text-zinc-900 font-light hidden md:block">Drag photos and videos here</p>
                                            <p className="text-lg text-zinc-900 font-medium md:hidden">Upload from your device</p>
                                            <div className="w-full px-4">
                                                <label
                                                    className={`${isSubmitting ? 'bg-gray-400' : 'bg-[#0095f6] hover:bg-[#1877f2]'} text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer`}
                                                >
                                                    <input
                                                        type="file"
                                                        accept="image/*,video/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            // alert('Input onChange fired!');
                                                            handleFileSelect(e, 'post');
                                                        }}
                                                        disabled={isSubmitting}
                                                    />
                                                    {isSubmitting ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Uploading...
                                                        </>
                                                    ) : 'Select from device'}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Info Area */}
                            <div className="w-full md:w-[40%] lg:w-[35%] flex flex-col bg-white">
                                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                                    <img
                                        src={getAppUrl(user?.profilePic)}
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random`;
                                        }}
                                    />
                                    <span className="font-semibold text-sm">{user?.username}</span>
                                </div>
                                <div className="p-4 flex-1">
                                    <textarea
                                        placeholder="Write a caption..."
                                        className="w-full h-32 md:h-48 text-sm outline-none resize-none no-scrollbar"
                                        value={newPostCaption}
                                        onChange={e => setNewPostCaption(e.target.value)}
                                    />
                                </div>
                                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-gray-400">
                                    <FaRegSmile size={20} className="cursor-pointer hover:text-gray-600 transition-colors" />
                                    <span className="text-xs">{newPostCaption.length}/2200</span>
                                </div>
                                <div className="p-4 border-t border-gray-100 md:hidden bg-white sticky bottom-0 z-10 safe-area-bottom">
                                    <button
                                        onClick={handleCreatePost}
                                        disabled={isUploading || isSubmitting || !newPostImage.trim()}
                                        className={`w-full py-3 rounded-xl font-bold text-base transition-colors ${(!isUploading && !isSubmitting && newPostImage.trim()) ? 'bg-[#0095f6] text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 text-gray-400'}`}
                                    >
                                        {isUploading ? `Uploading ${uploadProgress}%` : isSubmitting ? 'Sharing...' : 'Share'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Story Viewer Overlay */}
            {activeStory && (
                <div className="fixed inset-0 z-[200] bg-[#1a1a1a] flex items-center justify-center animate-fade-in overflow-hidden" onClick={() => { setActiveStory(null); setCurrentStoryIndex(0); }}>
                    <div className="relative w-full h-full flex items-center justify-center">
                        {(() => {
                            // Slice to only render relevant 3 stories for performance (prev, current, next)
                            const visibleIdxStart = Math.max(0, currentUserIndex - 1);
                            const visibleStories = allDisplayStories.slice(visibleIdxStart, currentUserIndex + 2);

                            return (
                                <div className="relative w-full h-full max-w-[100vw] overflow-hidden flex items-center justify-center" style={{ perspective: '2000px' }}>
                                    {visibleStories.map((userStories) => {
                                        const actualIdx = allDisplayStories.indexOf(userStories);
                                        const offset = actualIdx - currentUserIndex;

                                        const isActive = offset === 0;

                                        return (
                                            <div
                                                key={userStories.id}
                                                className={`absolute transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] shrink-0 ${isActive ? 'z-50 opacity-100' : 'z-40 opacity-0 md:opacity-100'}`}
                                                style={{
                                                    height: '98vh',
                                                    width: 'calc(98vh * 9 / 16)',
                                                    maxWidth: '100vw',
                                                    transform: `translateX(${offset * 110}%) rotateY(${offset * -35}deg) scale(${isActive ? 1 : 0.85}) translateZ(0)`,
                                                    transformOrigin: offset < 0 ? 'right center' : 'left center',
                                                    filter: isActive ? 'none' : 'blur(2px) brightness(0.7)',
                                                    transitionProperty: 'transform, opacity, filter',
                                                    willChange: 'transform, opacity, filter',
                                                    backfaceVisibility: 'hidden'
                                                }}
                                                onClick={(e) => {
                                                    if (!isActive) {
                                                        e.stopPropagation();
                                                        setCurrentUserIndex(actualIdx);
                                                        setCurrentStoryIndex(0);
                                                        setActiveStory(userStories);
                                                    }
                                                }}
                                            >
                                                <div className="relative w-full h-full bg-black shadow-2xl rounded-[10px] overflow-hidden" onClick={e => e.stopPropagation()}>
                                                    {isActive ? (
                                                        <>
                                                            {/* Progress Indicators */}
                                                            <div className="absolute top-4 left-3 right-3 flex gap-1 z-30">
                                                                {userStories.stories?.map((s, sIdx) => (
                                                                    <div key={s.id} className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-white transition-all duration-100 ease-linear"
                                                                            style={{
                                                                                width: sIdx < currentStoryIndex ? '100%' : sIdx === currentStoryIndex ? `${videoProgress}%` : '0%'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Top Header Info */}
                                                            <div className="absolute top-8 left-4 right-4 flex justify-between items-center z-30">
                                                                <div className="flex items-center gap-2">
                                                                    <img src={getAppUrl(userStories.user?.avatar)} className="w-8 h-8 rounded-full border border-white/20" />
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-white text-[13px] font-bold drop-shadow-lg">{userStories.user?.username}</span>
                                                                            <span className="text-white/60 text-[13px] font-medium">
                                                                                {(() => {
                                                                                    const story = userStories.stories[currentStoryIndex];
                                                                                    if (!story) return '';
                                                                                    const diff = Math.floor((new Date() - new Date(story.createdAt)) / (1000 * 60 * 60));
                                                                                    return diff === 0 ? 'Just now' : `${diff} h`;
                                                                                })()}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-white/80 text-[10px] font-medium">Original Audio</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Controls */}
                                                                <div className="flex items-center gap-4">
                                                                    <button onClick={(e) => { e.stopPropagation(); setIsStoryMuted(!isStoryMuted); }} className="text-white/90 hover:opacity-70 transition-opacity">
                                                                        {isStoryMuted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setIsStoryPaused(!isStoryPaused); }} className="text-white/90 hover:opacity-70 transition-opacity">
                                                                        {isStoryPaused ? <FaPlay size={14} /> : <FaPause size={14} />}
                                                                    </button>
                                                                    <button onClick={(e) => { e.stopPropagation(); setShowStoryMenu(true); setIsStoryPaused(true); }} className="text-white/90 hover:opacity-70 transition-opacity">
                                                                        <FaEllipsisH size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Invisible Navigation Zones */}
                                                            <div className="absolute inset-0 z-10 flex">
                                                                <div
                                                                    className="w-[30%] h-full cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (currentStoryIndex > 0) {
                                                                            setCurrentStoryIndex(prev => prev - 1);
                                                                        } else if (currentUserIndex > 0) {
                                                                            const prevUser = allDisplayStories[currentUserIndex - 1];
                                                                            setCurrentUserIndex(currentUserIndex - 1);
                                                                            setCurrentStoryIndex(prevUser.stories.length - 1);
                                                                            setActiveStory(prevUser);
                                                                        }
                                                                    }}
                                                                />
                                                                <div
                                                                    className="w-[70%] h-full cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (userStories.stories && currentStoryIndex < userStories.stories.length - 1) {
                                                                            setCurrentStoryIndex(prev => prev + 1);
                                                                        } else {
                                                                            if (currentUserIndex < allDisplayStories.length - 1) {
                                                                                const nextUser = allDisplayStories[currentUserIndex + 1];
                                                                                setCurrentUserIndex(currentUserIndex + 1);
                                                                                setCurrentStoryIndex(0);
                                                                                setActiveStory(nextUser);
                                                                            } else {
                                                                                setActiveStory(null);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Story Body */}
                                                            <div className="w-full h-full flex items-center justify-center relative bg-[#121212]">
                                                                {isLoadingStory && (
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-[41]">
                                                                        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                                    </div>
                                                                )}
                                                                {storyError && (
                                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212] z-[41] text-center p-6">
                                                                        <FaVideo className="text-white/20 mb-3" size={48} />
                                                                        <p className="text-white/50 font-medium text-sm">Video unavailable</p>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setStoryError(false);
                                                                                setIsLoadingStory(true);
                                                                                const video = e.currentTarget.closest('.relative').querySelector('video');
                                                                                if (video) video.load();
                                                                            }}
                                                                            className="mt-4 text-white text-xs font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-colors"
                                                                        >
                                                                            Retry
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <video
                                                                    key={userStories.stories[currentStoryIndex]?.id}
                                                                    src={getAppUrl(userStories.stories[currentStoryIndex]?.url)}
                                                                    autoPlay
                                                                    playsInline
                                                                    muted={isStoryMuted}
                                                                    onLoadedMetadata={(e) => setStoryDuration(e.target.duration || 5)}
                                                                    onLoadStart={() => { setIsLoadingStory(true); setStoryError(false); }}
                                                                    onCanPlay={() => setIsLoadingStory(false)}
                                                                    onError={(e) => {
                                                                        console.error('Story video error:', e);
                                                                        setIsLoadingStory(false);
                                                                        setStoryError(true);
                                                                    }}
                                                                    ref={el => {
                                                                        if (el) {
                                                                            (isStoryPaused || showStoryMenu) ? el.pause() : el.play();
                                                                        }
                                                                    }}
                                                                    className="w-full h-full object-cover"
                                                                    onPlay={() => setIsStoryPaused(false)}
                                                                    onPause={() => setIsStoryPaused(true)}
                                                                    onEnded={() => {
                                                                        if (currentStoryIndex < userStories.stories.length - 1) {
                                                                            setCurrentStoryIndex(prev => prev + 1);
                                                                        } else if (currentUserIndex < allDisplayStories.length - 1) {
                                                                            const nextUser = allDisplayStories[currentUserIndex + 1];
                                                                            setCurrentUserIndex(currentUserIndex + 1);
                                                                            setCurrentStoryIndex(0);
                                                                            setActiveStory(nextUser);
                                                                        } else {
                                                                            setActiveStory(null);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Footer */}
                                                            <div className="absolute bottom-6 left-4 right-4 z-40 flex items-center gap-4">
                                                                <input
                                                                    type="text"
                                                                    placeholder={`Reply to ${userStories.user?.username}...`}
                                                                    className="flex-1 bg-transparent border border-white/40 rounded-full py-2.5 px-5 text-white placeholder:text-white/70 text-[13px] outline-none focus:border-white transition-all backdrop-blur-md"
                                                                    onKeyDown={async (e) => {
                                                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                                                            e.stopPropagation();
                                                                            const text = e.target.value;
                                                                            e.target.value = '';
                                                                            try {
                                                                                if (!userStories.user?._id) return;
                                                                                const token = localStorage.getItem('token');
                                                                                await axios.post(`${BACKEND_URL}/api/messages`,
                                                                                    { recipientId: userStories.user._id, text: `Replying to your story: ${text}` },
                                                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                                                );
                                                                                showNotification('Reply sent');
                                                                            } catch (err) { console.error(err); }
                                                                        }
                                                                    }}
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                                <button
                                                                    className={`hover:scale-110 transition-transform ${likedStories.has(userStories.stories[currentStoryIndex]?.id) ? 'text-red-500' : 'text-white'}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const storyId = userStories.stories[currentStoryIndex]?.id;
                                                                        setLikedStories(prev => {
                                                                            const next = new Set(prev);
                                                                            if (next.has(storyId)) next.delete(storyId);
                                                                            else next.add(storyId);
                                                                            return next;
                                                                        });
                                                                        showNotification(likedStories.has(storyId) ? 'Removed from liked' : 'Story liked! ❤️');
                                                                    }}
                                                                >
                                                                    {likedStories.has(userStories.stories[currentStoryIndex]?.id) ? <FaHeart size={24} /> : <FaRegHeart size={24} />}
                                                                </button>
                                                                <button
                                                                    className="text-white hover:scale-110 transition-transform"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        // Set a dummy shareModalPost to trigger modal, logic handles activeStory
                                                                        setShareModalPost({ id: 'story-share', type: 'story' });
                                                                    }}
                                                                >
                                                                    <FaRegPaperPlane size={24} />
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#121212] p-4 text-center">
                                                            <img src={getAppUrl(userStories.user?.avatar)} className="w-16 h-16 rounded-full border-2 border-white/20 mb-3" />
                                                            <span className="text-white font-bold text-sm">{userStories.user?.username}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Navigation Arrows - Desktop Only */}
                                    {currentUserIndex > 0 && (
                                        <button
                                            className="hidden md:flex absolute left-4 z-[210] text-white/70 hover:text-white w-10 h-10 items-center justify-center bg-black/20 rounded-full transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const prevUser = allDisplayStories[currentUserIndex - 1];
                                                setCurrentUserIndex(currentUserIndex - 1);
                                                setCurrentStoryIndex(0);
                                                setActiveStory(prevUser);
                                            }}
                                        >
                                            <FaChevronLeft size={24} />
                                        </button>
                                    )}

                                    {currentUserIndex < allDisplayStories.length - 1 && (
                                        <button
                                            className="hidden md:flex absolute right-4 z-[210] text-white/70 hover:text-white w-10 h-10 items-center justify-center bg-black/20 rounded-full transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const nextUser = allDisplayStories[currentUserIndex + 1];
                                                setCurrentUserIndex(currentUserIndex + 1);
                                                setCurrentStoryIndex(0);
                                                setActiveStory(nextUser);
                                            }}
                                        >
                                            <FaChevronRight size={24} />
                                        </button>
                                    )}

                                    {/* Global Story Menu Modal */}
                                    {showStoryMenu && activeStory && (
                                        <div
                                            className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-md"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowStoryMenu(false);
                                                setIsStoryPaused(false);
                                            }}
                                        >
                                            <div
                                                className="w-full max-w-[400px] m-4 bg-[#262626] rounded-2xl overflow-hidden animate-slide-up border border-white/10 shadow-2xl"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                {(activeStory.id === user?._id || activeStory.user?._id === user?._id || activeStory.user?.username === user?.username) ? (
                                                    <button
                                                        className="w-full py-4 text-center text-red-500 text-[16px] font-bold border-b border-white/10 active:bg-white/10 transition-colors"
                                                        onClick={() => {
                                                            const currentStoryId = activeStory.stories[currentStoryIndex]?.id;
                                                            if (currentStoryId) handleDeleteStory(currentStoryId);
                                                        }}
                                                    >
                                                        Delete Story
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="w-full py-4 text-center text-white text-[16px] font-semibold border-b border-white/10 active:bg-white/10 transition-colors"
                                                        onClick={() => { setShowStoryMenu(false); setIsStoryPaused(false); }}
                                                    >
                                                        Report
                                                    </button>
                                                )}
                                                <button
                                                    className="w-full py-4 text-center text-white text-[16px] font-semibold border-b border-white/10 active:bg-white/10 transition-colors"
                                                    onClick={() => {
                                                        const url = activeStory.stories[currentStoryIndex]?.url;
                                                        if (url) navigator.clipboard.writeText(url);
                                                        setShowStoryMenu(false);
                                                        setIsStoryPaused(false);
                                                        showNotification('Link copied');
                                                    }}
                                                >
                                                    Copy Link
                                                </button>
                                                <button
                                                    className="w-full py-4 text-center text-white text-[16px] font-semibold border-b border-white/10 active:bg-white/10 transition-colors"
                                                    onClick={() => {
                                                        setShowStoryMenu(false);
                                                        setShareModalPost({ id: 'story-share', type: 'story' });
                                                    }}
                                                >
                                                    Share to...
                                                </button>
                                                <button
                                                    className="w-full py-4 text-center text-white text-[16px] font-bold active:bg-white/10 transition-colors"
                                                    onClick={() => { setShowStoryMenu(false); setIsStoryPaused(false); }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Redesigned Upload Story Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowUploadModal(false)}>
                    <div className="bg-white rounded-xl w-full max-w-[450px] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
                            <button onClick={() => setShowUploadModal(false)} className="text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded-full"><FaTimes size={18} /></button>
                            <h2 className="font-bold text-sm">Add to Story</h2>
                            <div className="w-10"></div> {/* Spacer */}
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 rounded-full p-0.5 mx-auto mb-4">
                                    <div className="w-full h-full bg-white rounded-full p-1">
                                        <img src={user?.profilePic || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-full h-full rounded-full" />
                                    </div>
                                </div>
                                <h3 className="font-bold text-gray-900">Share with your followers</h3>
                                <p className="text-[13px] text-gray-500 font-light">Your stories will be visible for 24 hours.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*,video/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => handleFileSelect(e, 'story')}
                                    />
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                        <FaVideo size={24} className="text-gray-400" />
                                    </div>
                                    <div className="text-center w-full px-4">
                                        <p className="font-bold text-sm text-gray-900">Select from device</p>
                                        <p className="text-xs text-gray-500 mt-1">MP4 or MOV</p>
                                        <div className="mt-4 bg-[#0095f6] hover:bg-[#1877f2] text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors pointer-events-none">
                                            Open media
                                        </div>
                                    </div>
                                </div>
                                {isUploading ? (
                                    <p className="text-center text-xs font-bold text-[#0095f6]">Uploading {uploadProgress}%...</p>
                                ) : isSubmitting && (
                                    <p className="text-center text-xs font-bold text-[#0095f6] animate-pulse">Sharing your story...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {postOptionsMenu && (
                <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4" onClick={() => setPostOptionsMenu(null)}>
                    <div className="bg-white rounded-xl w-[260px] md:w-[400px] overflow-hidden shadow-2xl animate-fade-in text-[14px]" onClick={e => e.stopPropagation()}>
                        {(() => {
                            const item = feedItems.find(i => i.id === postOptionsMenu);
                            const isReel = item?.type === 'reel' || item?.type === 'normal';
                            const isOwner = item?.user?.isCurrentUser || String(item?.user?._id) === String(user?._id);

                            return isOwner ? (
                                <button className="w-full py-3.5 text-red-500 font-bold border-b border-gray-100 hover:bg-gray-50 transition-colors" onClick={() => handleDeletePost(postOptionsMenu)}>
                                    Delete {isReel ? 'Reel' : 'Post'}
                                </button>
                            ) : null;
                        })()}
                        <button className="w-full py-3.5 text-gray-900 border-b border-gray-100 hover:bg-gray-50 transition-colors">Add to favorites</button>
                        <button className="w-full py-3.5 text-gray-900 border-b border-gray-100 hover:bg-gray-50 transition-colors">Go to post</button>
                        <button className="w-full py-3.5 text-gray-900 border-b border-gray-100 hover:bg-gray-50 transition-colors">About this account</button>
                        <button className="w-full py-3.5 text-gray-900 hover:bg-gray-50 transition-colors" onClick={() => setPostOptionsMenu(null)}>Cancel</button>
                    </div>
                </div>
            )}

            {expandedPost && (
                <div className="fixed inset-0 z-[120] bg-black/80 flex items-end md:items-center justify-center backdrop-blur-sm animate-fade-in" onClick={() => { setExpandedPost(null); setReplyingTo(null); }}>
                    <div className="bg-white w-full md:max-w-5xl h-[75vh] md:h-[90vh] flex flex-col md:flex-row shadow-2xl overflow-hidden relative rounded-t-[20px] md:rounded-lg animate-slide-up md:animate-none" onClick={e => e.stopPropagation()}>
                        {/* Mobile Drag Handle */}
                        <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={() => { setExpandedPost(null); setReplyingTo(null); }}>
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
                        </div>
                        <button onClick={() => { setExpandedPost(null); setReplyingTo(null); }} className="absolute top-4 right-4 md:-right-12 md:top-0 text-gray-500 md:text-white text-2xl md:text-3xl z-[150] transition-transform hover:rotate-90 md:block hidden"><FaTimes /></button>
                        <div className="flex flex-col md:flex-row h-full">
                            {/* Left: Image Pane */}
                            <div className="w-full md:w-[60%] bg-black flex items-center justify-center select-none border-r border-gray-100">
                                <img src={getAppUrl(expandedPost.image)} className="max-w-full max-h-full object-contain" />
                            </div>

                            {/* Right: Comments Pane */}
                            <div className="w-full md:w-[40%] flex flex-col bg-white">
                                {/* Header */}
                                <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                    <div className="flex items-center gap-3">
                                        <img src={getAppUrl(expandedPost.user.avatar)} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                                        <span className="font-bold text-[13px] text-gray-900">{expandedPost.user.username}</span>
                                    </div>
                                    <button
                                        onClick={() => setPostOptionsMenu(expandedPost.id)}
                                        className="text-gray-400 hover:text-black transition-colors"
                                    >
                                        <FaEllipsisH size={14} />
                                    </button>
                                </div>

                                {/* Comments List */}
                                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
                                    {/* Author Caption */}
                                    <div className="flex gap-3 items-start">
                                        <img src={getAppUrl(expandedPost.user.avatar)} className="w-8 h-8 rounded-full border border-gray-100" />
                                        <div className="text-[13px] leading-relaxed">
                                            <span className="font-bold mr-2">{expandedPost.user.username}</span>
                                            {expandedPost.caption}
                                        </div>
                                    </div>

                                    {/* Comments & Replies */}
                                    {/* Comments & Replies */}
                                    <div className="space-y-4 pt-1 pb-20">
                                        {expandedPost.comments.filter(c => !hiddenComments.has(c.id)).map(c => {
                                            const isAuthorLiked = c.likes?.some(lId => String(lId) === String(expandedPost.user._id));
                                            return (
                                                <div key={c.id} className="space-y-2">
                                                    {/* Main Comment */}
                                                    <div className="flex gap-2 items-start group">
                                                        <img src={getAppUrl(c.avatar) || `https://ui-avatars.com/api/?name=${c.user}`} className="w-8 h-8 rounded-full border border-gray-50 flex-shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="text-[12.5px] leading-[1.4] text-gray-900">
                                                                <span className="font-bold mr-2 hover:opacity-50 cursor-pointer">{c.user}</span>
                                                                {c.text}
                                                            </div>
                                                            <div className="flex gap-3 mt-1 text-[11px] text-gray-400 font-medium items-center">
                                                                <span>{new Date(c.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                                {isAuthorLiked && <span className="text-[11px] flex items-center gap-1"><FaHeart size={8} className="text-red-500" /> by author</span>}
                                                                {c.likes?.length > 0 && <span>{c.likes.length} like</span>}
                                                                <span className="cursor-pointer hover:text-black transition-colors" onClick={() => setReplyingTo({ commentId: c.id, username: c.user })}>Reply</span>
                                                                <span className="cursor-pointer hover:text-black transition-colors" onClick={() => setHiddenComments(prev => new Set([...prev, c.id]))}>Hide</span>
                                                                {c.isPinned && <span className="text-gray-900 flex items-center gap-1 font-bold"><FaThumbtack size={8} /> Pinned</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <button onClick={() => handleLikeComment(expandedPost.id, c.id)} className={`transition-transform active:scale-125 ${c.likes?.includes(user?._id) ? 'text-red-500' : 'text-gray-300 hover:text-gray-400'}`}>
                                                                {c.likes?.includes(user?._id) ? <FaHeart size={11} /> : <FaRegHeart size={11} />}
                                                            </button>
                                                            {c.likes?.length > 0 && <span className="text-[9px] text-gray-400">{c.likes.length}</span>}
                                                        </div>
                                                    </div>

                                                    {/* Nested Replies with Toggle */}
                                                    {c.replies?.length > 0 && (
                                                        <div className="ml-10">
                                                            {!visibleReplies[c.id] ? (
                                                                <button
                                                                    onClick={() => setVisibleReplies({ ...visibleReplies, [c.id]: true })}
                                                                    className="flex items-center gap-4 text-[11px] text-gray-500 font-bold hover:text-black transition-colors py-1"
                                                                >
                                                                    <div className="w-6 border-t border-gray-300"></div>
                                                                    View {c.replies.length} more {c.replies.length === 1 ? 'reply' : 'replies'}
                                                                </button>
                                                            ) : (
                                                                <div className="space-y-3 pt-1">
                                                                    {c.replies.map(r => (
                                                                        <div key={r._id} className="flex gap-2 items-start group">
                                                                            <img src={r.user.profilePic || `https://ui-avatars.com/api/?name=${r.user.username}`} className="w-6 h-6 rounded-full border border-gray-50 flex-shrink-0" />
                                                                            <div className="flex-1">
                                                                                <div className="text-[12.5px] leading-[1.4] text-gray-900">
                                                                                    <span className="font-bold mr-2 hover:opacity-50 cursor-pointer">{r.user.username}</span>
                                                                                    {r.text}
                                                                                </div>
                                                                                <div className="flex gap-3 mt-1 text-[11px] text-gray-400 font-medium items-center">
                                                                                    <span>{new Date(r.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                                                    {r.likes?.length > 0 && <span>{r.likes.length} like</span>}
                                                                                    <span className="cursor-pointer hover:text-black transition-colors" onClick={() => setReplyingTo({ commentId: c.id, username: r.user.username })}>Reply</span>
                                                                                    <span className="cursor-pointer hover:text-black transition-colors" onClick={() => setHiddenComments(prev => new Set([...prev, r._id]))}>Hide</span>
                                                                                </div>
                                                                            </div>
                                                                            <button className="mt-1 transition-transform active:scale-125 text-gray-300 hover:text-gray-400">
                                                                                <FaRegHeart size={9} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <button
                                                                        onClick={() => setVisibleReplies({ ...visibleReplies, [c.id]: false })}
                                                                        className="flex items-center gap-4 text-[11px] text-gray-500 font-bold hover:text-black transition-colors py-1"
                                                                    >
                                                                        <div className="w-6 border-t border-gray-300"></div>
                                                                        Hide replies
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Footer: Interaction & Input */}
                                <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0 z-20">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => handleLike(expandedPost.id)} className={`transition-transform active:scale-125 ${expandedPost.isLiked ? 'text-red-500' : 'text-gray-900 hover:opacity-50'}`}>{expandedPost.isLiked ? <FaHeart size={24} /> : <FaRegHeart size={24} />}</button>
                                            <FaRegComment size={24} className="text-gray-900 cursor-pointer hover:opacity-50" />
                                            <FaRegPaperPlane size={24} className="text-gray-900 cursor-pointer hover:opacity-50" />
                                        </div>
                                        <button onClick={() => handleSavePost(expandedPost.id)} className="text-gray-900 hover:opacity-50 transition-opacity">{expandedPost.isSaved ? <FaBookmark size={24} /> : <FaRegBookmark size={24} />}</button>
                                    </div>
                                    <p className="text-[13px] font-bold mb-3">{expandedPost.likesCount.toLocaleString()} likes</p>

                                    {/* Emoji Quick Reactions Bar */}
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        {['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleEmojiClick(expandedPost.id, emoji)}
                                                className="text-[20px] transition-transform hover:scale-125 active:scale-90"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>

                                    {replyingTo && (
                                        <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-t-lg mb-0 border-x border-t border-gray-100 animate-slide-up">
                                            <span className="text-[11px] text-gray-500">Replying to <span className="font-bold">@{replyingTo.username}</span></span>
                                            <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-black"><FaTimes size={10} /></button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3">
                                        <img src={user?.profilePic || `https://ui-avatars.com/api/?name=${user?.username}`} className="w-9 h-9 rounded-full object-cover border border-gray-100 flex-shrink-0" />
                                        <div className={`flex-1 flex items-center gap-2 border border-gray-200 p-2.5 ${replyingTo ? 'rounded-b-2xl' : 'rounded-3xl'} bg-white transition-all focus-within:ring-1 focus-within:ring-gray-300`}>
                                            <input
                                                type="text"
                                                placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Add a comment..."}
                                                value={commentTexts[expandedPost.id] || ''}
                                                onChange={e => setCommentTexts({ ...commentTexts, [expandedPost.id]: e.target.value })}
                                                onKeyPress={e => e.key === 'Enter' && (replyingTo ? handleReplyToComment(expandedPost.id, replyingTo.commentId, commentTexts[expandedPost.id]) : handleAddComment(expandedPost.id))}
                                                className="flex-1 text-[13px] bg-transparent outline-none py-0.5 px-2"
                                            />
                                            <div className="flex items-center gap-3 pr-2">
                                                <button className="text-gray-400 hover:text-black transition-colors">
                                                    <svg aria-label="Emoji" color="#8e8e8e" fill="#8e8e8e" height="20" role="img" viewBox="0 0 24 24" width="20"><path d="M15.83 10.997a1.167 1.167 0 101.167 1.167 1.167 1.167 0 00-1.167-1.167zm-7.66 0a1.167 1.167 0 101.166 1.167 1.167 1.167 0 00-1.166-1.167zm3.83 8.334a4.706 4.706 0 01-4.01-2.217.75.75 0 011.256-.82 3.203 3.203 0 005.51 0 .75.75 0 011.254.82 4.705 4.705 0 01-4.01 2.217zM12 23a11 11 0 1111-11 11.013 11.013 0 01-11 11zm0-20a9 9 0 109 9 9.01 9.01 0 00-9-9z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => replyingTo ? handleReplyToComment(expandedPost.id, replyingTo.commentId, commentTexts[expandedPost.id]) : handleAddComment(expandedPost.id)}
                                                    disabled={!(commentTexts[expandedPost.id] || '').trim()}
                                                    className="text-[#0095f6] text-[13px] font-bold disabled:opacity-30 flex-shrink-0"
                                                >
                                                    Post
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reusable Share Modal */}
            <ShareModal
                isOpen={!!shareModalPost}
                onClose={() => setShareModalPost(null)}
                contentToShare={
                    shareModalPost?.type === 'story'
                        ? { type: 'story', data: activeStory.stories[currentStoryIndex], userAvatar: activeStory.user?.avatar }
                        : shareModalPost?.type === 'reel'
                            ? { type: 'reel', data: shareModalPost }
                            : shareModalPost
                                ? { type: 'post', data: shareModalPost }
                                : null
                }
            />

            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .animate-jump { animation: jump 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes jump { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.4); } }
                .animate-fade-in { animation: fadeIn 0.15s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
            <style jsx>{`
                .animate-gradient-x {
                    background-size: 200% auto;
                    animation: gradient-x 3s linear infinite;
                }
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </div>
    );
};

export default HomePage;
