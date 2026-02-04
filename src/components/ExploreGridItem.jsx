import { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { FaPlay, FaClone, FaHeart, FaComment, FaEye, FaShare, FaPaperPlane } from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';

// Updated: 2026-01-25 12:42 - Force reload for default counts
const ExploreGridItem = ({ reel, index, isLarge, onClick, onCommentClick, onShareClick }) => {
    const { user } = useContext(AuthContext);
    const videoRef = useRef(null);
    const [isLiked, setIsLiked] = useState(reel.isLiked || false);
    const [isHovered, setIsHovered] = useState(false);

    // Generate stable random defaults for UI demo if data is missing
    const [defaults] = useState(() => ({
        likes: Math.floor(Math.random() * (800 - 50) + 50),
        views: Math.floor(Math.random() * (20000 - 1000) + 1000),
        comments: Math.floor(Math.random() * (40 - 2) + 2),
        shares: Math.floor(Math.random() * (150 - 10) + 10)
    }));

    // Initialize with default if real data is 0 to prevent jumps on interaction
    const [likesCount, setLikesCount] = useState(() => {
        const realCount = reel.likes?.length || 0;
        const isLikedInit = reel.isLiked || false;
        return realCount > defaults.likes
            ? realCount
            : (defaults.likes + (isLikedInit ? 1 : 0));
    });

    // Sync state if reel prop updates (only on ID change to preserve local interaction)
    useEffect(() => {
        setIsLiked(reel.isLiked || false);
        const realCount = reel.likes?.length || 0;
        const isLikedState = reel.isLiked || false;

        const newLikeCount = realCount > defaults.likes
            ? realCount
            : (defaults.likes + (isLikedState ? 1 : 0));

        setLikesCount(newLikeCount);
    }, [reel._id]);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (videoRef.current) {
            videoRef.current.play().catch(() => { });
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    const handleLike = async (e) => {
        e.stopPropagation(); // Prevent opening modal
        if (!user) return; // Or trigger login

        const prevLiked = isLiked;
        const prevCount = likesCount;

        setIsLiked(!prevLiked);
        // If we were using default, start from there? 
        // No, if user interacts, we should probably stick to real logic or augment.
        // If count was 0 (displayed default), and user likes, it becomes 1 (real).
        // That might jump from 500 -> 1. 
        // A better approach for "Demo" feel: add 1 to the *displayed* count.
        // But `likesCount` tracks real backend count.
        // Let's just track real count change. 
        // If `likesCount` is 0, we display `defaults.likes`.
        // If user likes, `likesCount` becomes 1. 
        // Display logic: `likesCount || defaults.likes` -> 1 || 500 -> 1. That's a jump.
        // Adjustment: Init `likesCount` with `reel.likes?.length || defaults.likes` ? 
        // But that persists fake data to backend? No, local state only.
        // Okay, I will initialize local state with defaults if 0.

        // Actually, simpler: 
        // If it's 0, use default.
        // But the jump issue is real. 
        // Let's initialize `likesCount` to default if 0.

        setLikesCount(prev => prevLiked ? prev - 1 : prev + 1);

        try {
            await axios.post(`${BACKEND_URL}/api/reels/like/${reel._id}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            // Don't sync with backend to maintain visual consistency with defaults
        } catch (error) {
            console.error('Like failed:', error);
            setIsLiked(prevLiked);
            setLikesCount(prevCount);
        }
    };

    const formatCount = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toLocaleString();
    };

    // Calculate display values for views and comments (likes handled in state)
    // Always use the greater of real vs default to maintain "busy platform" feel
    const displayViews = Math.max(reel.views || 0, defaults.views);
    const displayComments = Math.max(reel.comments?.length || 0, defaults.comments);

    return (
        <div
            onClick={onClick}
            className={`relative group bg-gray-200 cursor-pointer overflow-hidden rounded-sm
                ${isLarge ? 'col-span-2 row-span-2 aspect-square' : 'aspect-[4/5]'}
                hover:brightness-95 transition-all duration-200`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <img
                src={reel.source === 'youtube' ? reel.thumbnail : (getAppUrl(reel.thumbnail) || `https://ui-avatars.com/api/?name=${reel.creatorName || 'Reel'}&background=random`)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isHovered && reel.source !== 'youtube' ? 'opacity-0' : 'opacity-100'}`}
                alt={reel.caption || 'Reel'}
                style={{ imageRendering: 'auto' }}
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://placehold.co/400x700/f3f4f6/9ca3af?text=Reel';
                }}
            />

            {/* Hover Video Preview - Only for non-youtube reels */}
            {reel.source !== 'youtube' && (
                <video
                    ref={videoRef}
                    src={getAppUrl(reel.videoUrl)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                    muted
                    loop
                    playsInline
                    style={{ imageRendering: 'high-quality' }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            )}

            {reel.source === 'youtube' && (
                <div className="absolute top-3 right-3 text-white drop-shadow-lg z-10">
                    <FaPlay size={16} />
                </div>
            )}

            {/* Overlay with Stats & Buttons - Visible only on Hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">

                {/* Centered Stats (Insta Style) */}
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center gap-1">
                        <FaHeart className="text-white text-2xl drop-shadow-lg" />
                        <span className="text-white text-sm font-bold">{formatCount(likesCount)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <FaComment className="text-white text-2xl drop-shadow-lg" />
                        <span className="text-white text-sm font-bold">{formatCount(displayComments)}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <FaEye className="text-white text-2xl drop-shadow-lg" />
                        <span className="text-white text-sm font-bold">{formatCount(Math.max(reel.views || 0, defaults.views))}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <FaPaperPlane className="text-white text-2xl drop-shadow-lg" />
                        <span className="text-white text-sm font-bold">{formatCount(defaults.shares)}</span>
                    </div>
                </div>

                {/* Bottom Gradient for text readability */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>

                {/* Creator Info (Mini) */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
                    <div className="w-5 h-5 rounded-full border border-white/50 overflow-hidden">
                        <img
                            src={getAppUrl(reel.creatorAvatar) || `https://ui-avatars.com/api/?name=${reel.creatorName}&background=random`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${reel.creatorName}&background=random`;
                            }}
                        />
                    </div>
                    <span className="text-white text-xs font-semibold drop-shadow-md truncate max-w-[100px]">{reel.creatorName}</span>
                </div>

                {/* Language Badge */}
                {reel.isTamil !== undefined && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-white/[.9] text-[10px] font-medium border border-white/10">
                        {reel.isTamil ? 'Tamil' : 'English'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExploreGridItem;
