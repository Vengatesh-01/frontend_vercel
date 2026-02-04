import { useState, useRef, useEffect, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { FaHeart, FaComment, FaPaperPlane, FaMusic, FaVolumeUp, FaVolumeMute, FaEllipsisH, FaCheckCircle, FaYoutube, FaEye, FaPlay, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';
import ReelCommentSection from './ReelCommentSection';
import ShareModal from './ShareModal';
import AuthContext from '../context/AuthContext';

const ReelItem = ({ reel, isMuted, toggleMute, isActive, onEnded, isShared, onLikeUpdate }) => {
    const { user } = useContext(AuthContext);
    const iframeRef = useRef(null);
    const videoRef = useRef(null);
    const [isLiked, setIsLiked] = useState(reel.isLiked || false);

    // Stable random seed based on reel ID
    const hashCode = (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
    };

    // Generate stable random defaults for UI demo
    const [randomStats] = useState(() => {
        const seed = hashCode(reel._id || 'default');
        const rand = (min, max, s) => Math.floor(((s % 1000) / 1000) * (max - min) + min);

        return {
            likes: (isShared && reel.source === 'manual') ? 0 : rand(50, 800, seed),
            views: (isShared && reel.source === 'manual') ? 0 : rand(1000, 20000, seed * 2),
            comments: (isShared && reel.source === 'manual') ? 0 : rand(2, 40, seed * 3),
            shares: (isShared && reel.source === 'manual') ? 0 : rand(10, 150, seed * 4)
        };
    });

    // Initialize with default if real data is 0 or low
    const [likesCount, setLikesCount] = useState(() => {
        const realCount = reel.totalLikes || reel.likes?.length || 0;
        const isLikedInit = reel.isLiked || false;


        if (isShared && reel.source === 'manual') return realCount;

        return realCount > randomStats.likes
            ? realCount
            : (randomStats.likes + (isLikedInit ? 1 : 0));
    });

    const [isPlaying, setIsPlaying] = useState(true);
    const [isPaused, setIsPaused] = useState(false); // User initiated pause
    const [showPlayIcon, setShowPlayIcon] = useState(false);
    const [isFollowed, setIsFollowed] = useState(false);
    const [showFullCaption, setShowFullCaption] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorInfo, setErrorInfo] = useState('');
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);

    // Initialize with default if real data is 0 or low
    const [commentsCount, setCommentsCount] = useState(() => {
        const realCount = reel.commentsCount || reel.comments?.length || 0;
        return Math.max(realCount, randomStats.comments);
    });

    const [showShareModal, setShowShareModal] = useState(false);
    const [randomShareCount] = useState(() => {
        if (isShared && reel.source === 'manual') return 0;
        return Math.floor(Math.random() * (200 - 10 + 1)) + 10;
    });

    // Sync counts if reel prop changes during recycling - Always respect defaults if real count is empty
    useEffect(() => {
        // Only reset if the reel ID actually changed (new video loaded)
        // This prevents overwriting local 'isLiked' state if parent re-renders with same reel prop
        const realLikes = reel.totalLikes || reel.likes?.length || 0;
        const isLikedState = reel.isLiked || false;

        const newLikeCount = realLikes > randomStats.likes
            ? realLikes
            : (randomStats.likes + (isLikedState ? 1 : 0));

        setLikesCount(newLikeCount);

        const realComments = reel.commentsCount || reel.comments?.length || 0;
        setCommentsCount(Math.max(realComments, randomStats.comments));

        setIsLiked(reel.isLiked || false);
        setIsLoading(true);
    }, [reel._id]); // Depend only on ID change to preserve local interaction state during playback

    // Lock scroll on parent when modal is open
    useEffect(() => {
        const parentContainer = document.querySelector('.snap-y');
        if (showCommentsModal) {
            parentContainer?.classList.add('no-scroll-snap');
            document.body.classList.add('body-lock');
        } else {
            parentContainer?.classList.remove('no-scroll-snap');
            document.body.classList.remove('body-lock');
        }
        return () => {
            parentContainer?.classList.remove('no-scroll-snap');
            document.body.classList.remove('body-lock');
        };
    }, [showCommentsModal]);

    // Track previous pause state to detect specifically when we pause or resume
    const [lastAction, setLastAction] = useState(null); // 'play' or 'pause'
    const [showActionIcon, setShowActionIcon] = useState(false);

    const handleTogglePlay = (e) => {
        if (e) e.stopPropagation();

        // Check if the video is actually muted in the DOM (e.g. by browser autoplay policy)
        const isDomMuted = videoRef.current ? videoRef.current.muted : false;

        if (isPaused) {
            // When resuming from a user-initiated pause
            setIsPaused(false);
            if (isMuted) toggleMute();
            setLastAction('play');

            if (reel.source === 'youtube' && iframeRef.current) {
                iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
                iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
            } else if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.play().catch(() => { });
            }
        } else if (isMuted || isDomMuted) {
            // If playing but state says muted OR DOM says muted (browser block), then unmute
            if (isMuted) toggleMute();
            setLastAction('play');

            if (reel.source === 'youtube' && iframeRef.current) {
                iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
            } else if (videoRef.current) {
                videoRef.current.muted = false;
                // If it was silent due to autoplay policy, unmuting might require a play call too
                videoRef.current.play().catch(() => { });
            }
        } else {
            // If playing and unmuted, then pause
            setIsPaused(true);
            setLastAction('pause');
        }

        // Show feedback icon
        setShowActionIcon(true);
        setTimeout(() => setShowActionIcon(false), 500);
    };

    // Unified Playback & Mute Logic (YouTube & Native)
    useEffect(() => {
        const isActuallyActive = isActive && !isPaused;
        const shouldBeMuted = !isActive || isMuted;

        if (reel.source === 'youtube' && iframeRef.current) {
            // Send mute/unmute
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: shouldBeMuted ? 'mute' : 'unMute',
                args: []
            }), '*');

            // Send play/pause
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: isActuallyActive ? 'playVideo' : 'pauseVideo',
                args: []
            }), '*');

            // Force unmute again after a short delay for reliability on some browsers
            if (isActuallyActive && !shouldBeMuted) {
                setTimeout(() => {
                    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
                        event: 'command', func: 'unMute', args: []
                    }), '*');
                }, 100);
            }

            // Force High Quality when active
            if (isActive) {
                iframeRef.current.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'setPlaybackQuality',
                    args: ['hd1080']
                }), '*');
            }
        } else if (videoRef.current) {
            videoRef.current.muted = shouldBeMuted;
            if (isActuallyActive) {
                videoRef.current.play().catch(err => {
                    console.log('Autoplay blocked or playback error:', err);
                    // Autoplay blocked with sound? Mute and retry.
                    if (!videoRef.current.muted) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(e => {
                            console.error('Final playback attempt failed:', e);
                            setHasError(true);
                        });
                    }
                });
            } else {
                videoRef.current.pause();
            }
        }
        setIsPlaying(isActuallyActive);

        // Cleanup: Ensure silence and pause when unmounting or becoming inactive
        return () => {
            if (reel.source === 'youtube' && iframeRef.current) {
                try {
                    iframeRef.current.contentWindow.postMessage(JSON.stringify({
                        event: 'command',
                        func: 'pauseVideo',
                        args: []
                    }), '*');
                    iframeRef.current.contentWindow.postMessage(JSON.stringify({
                        event: 'command',
                        func: 'mute',
                        args: []
                    }), '*');
                } catch (e) { }
            } else if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.muted = true;
            }
        };
    }, [isMuted, reel.source, isActive, isPaused, reel.youtubeId]);

    // Track previous pause state to detect RESUME specifically
    const prevPausedRef = useRef(isPaused);

    // Briefly show icon ONLY when state changes to "playing" from "paused"
    useEffect(() => {
        const wasPaused = prevPausedRef.current;
        const isResuming = wasPaused && !isPaused;

        prevPausedRef.current = isPaused;
    }, [isPaused]);

    // Manage overlay visibility with a delay to cover YouTube's "More Videos" glitch on resume
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        let timeout;
        if (isPaused) {
            setShowOverlay(true);
        } else {
            // Keep overlay for 200ms after resuming to fully hide the YouTube popup while it clears
            timeout = setTimeout(() => {
                setShowOverlay(false);
            }, 200);
        }
        return () => clearTimeout(timeout);
    }, [isPaused]);

    // Reset pause state when becoming inactive
    useEffect(() => {
        if (!isActive) {
            setIsPaused(false);
            setShowOverlay(false);
            setShowActionIcon(false);
        }
    }, [isActive]);

    // Listen for YouTube player state changes to detect end of video
    useEffect(() => {
        if (!isActive || reel.source !== 'youtube') return;

        const handleYoutubeMessage = (event) => {
            if (event.origin !== "https://www.youtube.com") return;
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'infoDelivery' && data.info && data.info.playerState === 0) {
                    // playerState 0 means ended
                    if (onEnded) onEnded();
                }
            } catch (err) {
                // Not a JSON message or not from YT
            }
        };

        window.addEventListener('message', handleYoutubeMessage);
        return () => window.removeEventListener('message', handleYoutubeMessage);
    }, [isActive, reel.source, onEnded]);

    const formatCount = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const handleLike = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
        }
        const previousLiked = isLiked;
        const previousCount = likesCount;
        setIsLiked(!previousLiked);
        setLikesCount(prev => previousLiked ? prev - 1 : prev + 1);

        try {
            if (onLikeUpdate) {
                onLikeUpdate(reel._id, !previousLiked);
            }
            await axios.post(`${BACKEND_URL}/api/reels/like/${reel._id}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (error) {
            console.error('Like failed:', error);
            setIsLiked(previousLiked);
            setLikesCount(previousCount);
            if (onLikeUpdate) {
                onLikeUpdate(reel._id, previousLiked);
            }
        }
    };

    const handleFollow = async () => {
        setIsFollowed(!isFollowed);
        try {
            if (reel.creatorId) {
                await axios.put(`${BACKEND_URL}/api/users/follow/${reel.creatorId}`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
            }
        } catch (error) {
            console.error('Follow failed:', error);
        }
    };

    const fetchComments = async (forceIncludeId = null) => {
        if (comments.length === 0) setCommentsLoading(true);

        try {
            const { data } = await axios.get(`${BACKEND_URL}/api/reels/${reel._id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            const populatedComments = data.comments?.map(c => ({
                id: c._id.toString(),
                user: c.user?.username || 'User',
                avatar: c.user?.profilePic || `https://ui-avatars.com/api/?name=${c.user?.username || 'User'}`,
                text: c.text,
                likesCount: c.likes?.length || 0,
                isLiked: user ? c.likes?.some(id => id.toString() === user._id.toString()) : false,
                replies: c.replies?.map(r => ({
                    id: r._id.toString(),
                    user: r.user?.username || 'User',
                    avatar: r.user?.profilePic || `https://ui-avatars.com/api/?name=${r.user?.username || 'User'}`,
                    text: r.text,
                    likesCount: r.likes?.length || 0,
                    isLiked: user ? r.likes?.some(id => id.toString() === user._id.toString()) : false,
                    createdAt: r.createdAt
                })) || [],
                createdAt: c.createdAt,
                isReal: true
            })) || [];

            populatedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const getSeed = (id) => id.split('').reduce((acc, char, i) => acc + char.charCodeAt(0) * (i + 1), 0);
            const reelSeed = getSeed(reel._id);

            const fakeCommentTexts = [
                "Love this! 😍", "Amazing content! 🔥", "This is so good! 👏",
                "Can't stop watching! ❤️", "Truly inspiring! 🌟", "Best one yet! 🎉",
                "This made my day! 😊", "Absolutely brilliant! 💯", "Keep it up! 👍",
                "So talented! 🎨", "Need more of this! 🙌", "Incredible work! ⭐",
                "This is fire! 🔥🔥", "Obsessed! 💖", "Pure magic! ✨",
                "Too good! 😍😍", "Wow just wow! 🤩", "Perfection! 👌",
                "Love the vibe! 🌊", "This hits different! 💥"
            ];

            const fakeUsernames = ["alex_videos", "priya_official", "rahul_creator", "sarah_media", "kumar_edits", "maya_shorts", "dev_content"];

            const neededFakeCount = Math.max(0, (commentsCount || randomStats.comments) - populatedComments.length);
            const fakePlaceholders = Array.from({ length: Math.min(neededFakeCount, 60) }, (_, i) => {
                const textIdx = (reelSeed + i * 13) % fakeCommentTexts.length;
                const userIdx = (reelSeed * 7 + i * 17) % fakeUsernames.length;
                const likes = (reelSeed + i * 3) % 200;

                return {
                    id: `fake-${reel._id}-${i}`,
                    user: fakeUsernames[userIdx],
                    avatar: `https://ui-avatars.com/api/?name=${fakeUsernames[userIdx]}&background=random`,
                    text: fakeCommentTexts[textIdx],
                    likesCount: likes,
                    isLiked: false,
                    replies: [],
                    createdAt: new Date(Date.now() - (reelSeed % 3600000) - (i * 1800000) - 600000),
                    isReal: false
                };
            });

            let allComments = [...populatedComments, ...fakePlaceholders];

            if (forceIncludeId) {
                const targetId = forceIncludeId.id.toString();
                const foundIndex = allComments.findIndex(c => c.id.toString() === targetId);
                if (foundIndex === -1) {
                    allComments = [forceIncludeId, ...allComments];
                } else {
                    allComments[foundIndex] = { ...allComments[foundIndex], ...forceIncludeId };
                }
            }

            allComments.sort((a, b) => {
                if (a.isReal !== b.isReal) return b.isReal - a.isReal;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            setComments(allComments);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleLikeComment = async (commentId) => {
        if (!user) return;
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                const newIsLiked = !c.isLiked;
                return {
                    ...c,
                    isLiked: newIsLiked,
                    likesCount: newIsLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1)
                };
            }
            return c;
        }));
        try {
            await axios.post(
                `${BACKEND_URL}/api/reels/comment/like/${reel._id}/${commentId}`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
        } catch (error) {
            console.error('Failed to like comment:', error);
        }
    };

    const handleAddReply = async (text, commentId) => {
        if (!text.trim() || !user) return;

        const tempReply = {
            id: Date.now(),
            user: user?.username || 'You',
            avatar: user?.profilePic || `https://ui-avatars.com/api/?name=${user?.username || 'You'}`,
            text: text,
            likesCount: 0,
            isLiked: false,
            createdAt: new Date()
        };

        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    replies: [...(c.replies || []), tempReply]
                };
            }
            return c;
        }));

        try {
            await axios.post(
                `${BACKEND_URL}/api/reels/comment/reply/${reel._id}/${commentId}`,
                { text },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
            fetchComments();
        } catch (error) {
            console.error('Failed to add reply:', error);
        }
    };

    const handleLikeReply = async (commentId, replyId) => {
        if (!user) return;
        setComments(prev => prev.map(c => {
            if (c.id === commentId) {
                return {
                    ...c,
                    replies: (c.replies || []).map(r => {
                        if (r.id === replyId) {
                            const newIsLiked = !r.isLiked;
                            return {
                                ...r,
                                isLiked: newIsLiked,
                                likesCount: newIsLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1)
                            };
                        }
                        return r;
                    })
                };
            }
            return c;
        }));
        try {
            await axios.post(
                `${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/reels/comment/reply/like/${reel._id}/${commentId}/${replyId}`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
        } catch (error) {
            console.error('Failed to like reply:', error);
        }
    };

    const handleOpenComments = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
            if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
        }
        setShowCommentsModal(true);
        fetchComments();
    };

    const handleCommentSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!commentText.trim() || !user) return;

        try {
            const { data } = await axios.post(`${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/reels/${reel._id}/comment`,
                { text: commentText },
                { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );

            const newComment = {
                id: data.comment._id.toString(),
                user: user.username,
                avatar: user.profilePic || `https://ui-avatars.com/api/?name=${user.username}`,
                text: commentText,
                likesCount: 0,
                isLiked: false,
                replies: [],
                createdAt: new Date(),
                isReal: true
            };

            setComments(prev => [newComment, ...prev]);
            setCommentsCount(prev => prev + 1);
            setCommentText('');
            setTimeout(() => fetchComments(newComment), 1200);
        } catch (error) {
            console.error('Failed to post comment:', error);
        }
    };

    const youtubeSrc = useMemo(() => {
        return `https://www.youtube.com/embed/${reel.youtubeId}?autoplay=1&mute=1&enablejsapi=1&rel=0&playsinline=1&origin=${window.location.origin}&vq=hd1080&loop=1&playlist=${reel.youtubeId}`;
    }, [reel.youtubeId]);

    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden" onClick={handleTogglePlay}>
            <div className="relative h-full w-full max-w-[500px] bg-black shadow-2xl overflow-hidden rounded-none flex items-center justify-center">
                {/* Video Container */}
                <div className="w-full h-full relative z-0 overflow-hidden bg-black flex items-center justify-center">
                    {reel.source === 'youtube' ? (
                        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                            <img
                                src={reel.thumbnail}
                                alt=""
                                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isLoading || hasError ? 'opacity-100' : 'opacity-0'}`}
                            />
                            {!hasError && (
                                <iframe
                                    ref={iframeRef}
                                    key={reel.youtubeId}
                                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500 pointer-events-none ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                                    style={{
                                        width: '115%',
                                        height: '115%',
                                        transform: 'translate(-50%, -50%)',
                                        imageRendering: 'auto'
                                    }}
                                    src={`${youtubeSrc}&cc_load_policy=0&iv_load_policy=3&controls=0&disablekb=1&fs=0&modestbranding=1`}
                                    title={reel.title || reel.caption}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    onLoad={() => {
                                        setIsLoading(false);
                                        const forceHQ = () => {
                                            if (iframeRef.current?.contentWindow) {
                                                iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: ['hd1080'] }), '*');
                                                iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setPlaybackQuality', args: ['highres'] }), '*');
                                                if (!isMuted && isActive) {
                                                    iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
                                                }
                                            }
                                        };
                                        forceHQ();
                                        setTimeout(forceHQ, 500);
                                        setTimeout(forceHQ, 1500);
                                    }}
                                    onError={() => setHasError(true)}
                                    loading="eager"
                                ></iframe>
                            )}
                        </div>
                    ) : (
                        <video
                            ref={videoRef}
                            src={getAppUrl(reel.videoUrl)}
                            playsInline
                            muted={isMuted}
                            onEnded={onEnded}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                            style={{ willChange: 'transform', transform: 'translate3d(0,0,0)' }}
                            onLoadStart={() => { setIsLoading(true); setHasError(false); }}
                            onCanPlay={() => setIsLoading(false)}
                            onError={(e) => {
                                console.error('Video Load Error:', reel.videoUrl);
                                setHasError(true);
                                setIsLoading(false);
                            }}
                        />
                    )}
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-20">
                        <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Error State */}
                {hasError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 z-20 text-white/50">
                        <p className="text-sm">Video unavailable</p>
                    </div>
                )}

                {/* Pause Overlay - Hides YouTube 'More Videos' */}
                <div className={`absolute inset-0 z-[5] flex items-center justify-center pointer-events-none transition-all duration-500 ${showOverlay ? 'opacity-100 bg-black/80 backdrop-blur-md' : 'opacity-0 bg-transparent backdrop-blur-none invisible'}`}>
                    <div className={`w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl transition-transform duration-500 ${showOverlay ? 'scale-100' : 'scale-50'}`}>
                        <FaPlay className="text-white ml-2 opacity-90" size={32} />
                    </div>
                </div>

                {/* Feedback Icons Overlay */}
                {showActionIcon && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                        <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center animate-ping-once">
                            {lastAction === 'play' ? (
                                <FaPlay className="text-white ml-1" size={24} />
                            ) : (
                                <div className="flex gap-1">
                                    <div className="w-2 h-6 bg-white rounded-full"></div>
                                    <div className="w-2 h-6 bg-white rounded-full"></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Right Side Actions */}
                <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-20">
                    <div className="flex flex-col items-center gap-1 group cursor-pointer" onClick={handleLike}>
                        <div className={`p-2 transition-transform active:scale-90 ${isLiked ? 'text-red-500' : 'text-white'}`}>
                            <FaHeart size={28} className={isLiked ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'drop-shadow-lg'} />
                        </div>
                        <span className="text-white text-[10px] font-bold drop-shadow-md">
                            {formatCount(likesCount)}
                        </span>
                    </div>

                    {/* View Icon Restored with Default Count */}
                    <div className="flex flex-col items-center gap-1 cursor-pointer">
                        <div className="p-2 text-white transition-opacity hover:opacity-80">
                            <FaEye size={24} className="drop-shadow-lg" />
                        </div>
                        <span className="text-white text-[10px] font-bold drop-shadow-md">
                            {formatCount(Math.max(reel.views || 0, randomStats.views))}
                        </span>
                    </div>

                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={(e) => handleOpenComments(e)}>
                        <div className="p-2 text-white transition-opacity hover:opacity-80">
                            <FaComment size={26} className="drop-shadow-lg" />
                        </div>
                        <span className="text-white text-[10px] font-bold drop-shadow-md">
                            {formatCount(commentsCount)}
                        </span>
                    </div>

                    <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowShareModal(true); }}>
                        <div className="p-2 text-white transition-opacity hover:opacity-80">
                            <FaPaperPlane size={24} className="drop-shadow-lg" />
                        </div>
                        <span className="text-white text-[10px] font-bold drop-shadow-md">
                            {formatCount(randomShareCount)}
                        </span>
                    </div>
                </div>

                {/* Creator Info - Removed as requested for ultra-clean layout */}


                {/* Bottom Overlay - REELIO Branding */}
                <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none flex flex-col items-center pb-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent pt-20">
                    <div className="">
                        <span className="text-[10px] font-black tracking-[0.5em] text-white/30 uppercase drop-shadow-sm select-none">
                            REELIO
                        </span>
                    </div>
                </div>

                {/* Comments Section */}
                {showCommentsModal && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-transparent flex items-center justify-end pr-4 md:pr-10" onClick={() => setShowCommentsModal(false)}>
                        <div className="h-[85vh] animate-slide-in-right allow-scroll shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <ReelCommentSection
                                comments={comments}
                                onClose={() => setShowCommentsModal(false)}
                                onAddComment={handleCommentSubmit}
                                onAddReply={handleAddReply}
                                onLikeComment={handleLikeComment}
                                onLikeReply={handleLikeReply}
                                commentText={commentText}
                                setCommentText={setCommentText}
                                commentsLoading={commentsLoading}
                                commentsCount={commentsCount}
                                currentUserAvatar={getAppUrl(user?.profilePic)}
                                currentUsername={user?.username}
                                isLoggedIn={!!user}
                            />
                        </div>
                    </div>,
                    document.body
                )}

                {/* Share Modal */}
                <ShareModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    contentToShare={{ type: 'reel', data: reel }}
                />
            </div>
        </div>
    );
};

export default ReelItem;
