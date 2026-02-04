import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ReelItem from '../components/ReelItem';
import { BACKEND_URL } from '../utils/urlUtils';
import getAppUrl from '../utils/urlUtils';
import { io } from 'socket.io-client';

const ReelsPage = () => {
    const [searchParams] = useSearchParams();
    const sharedReelId = searchParams.get('id');
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('reelsMuted');
        // Default to false (unmuted) if not set, so we attempt audio by default
        return saved === 'true';
    });

    // Force unmute if arriving via a shared reel link (since it's a direct intent)
    useEffect(() => {
        if (sharedReelId) {
            setIsMuted(false);
            localStorage.setItem('reelsMuted', 'false');
        }
    }, [sharedReelId]);

    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const watchStartTime = useRef(Date.now());
    const currentReelId = useRef(null);
    const socket = useRef(null);

    useEffect(() => {
        localStorage.setItem('reelsMuted', isMuted);
    }, [isMuted]);

    const isFetching = useRef(false);

    const fetchReels = async (isInitial = false) => {
        if (isFetching.current || (!hasMore && !isInitial)) return;
        isFetching.current = true;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

            // If it's the first fetch and we have a shared ID, fetch that reel specifically first
            if (isInitial && sharedReelId) {
                try {
                    const res = await axios.get(`${BACKEND_URL}/api/reels/${sharedReelId}`, config);
                    if (res.data) {
                        const sharedReel = {
                            ...res.data,
                            videoUrl: res.data.youtubeId
                                ? `https://www.youtube.com/embed/${res.data.youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0`
                                : getAppUrl(res.data.videoUrl),
                            thumbnail: getAppUrl(res.data.thumbnail)
                        };
                        setReels([sharedReel]);
                        // Mark as viewed so it doesn't reappear in random pool
                        const localViewed = JSON.parse(localStorage.getItem('viewedReels') || '[]');
                        if (!localViewed.includes(sharedReelId)) {
                            localViewed.push(sharedReelId);
                            localStorage.setItem('viewedReels', JSON.stringify(localViewed));
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch shared reel:', err);
                }
            }

            let localViewed = [];
            try {
                const saved = localStorage.getItem('viewedReels');
                if (saved) localViewed = JSON.parse(saved);
            } catch (e) {
                console.error('Error parsing viewedReels, resetting:', e);
                localStorage.setItem('viewedReels', '[]');
            }

            const excludeParam = localViewed.length > 0 ? `&exclude=${localViewed.join(',')}` : '';
            const currentPage = isInitial ? 1 : page;

            const response = await axios.get(`${BACKEND_URL}/api/reels?page=${currentPage}&random=true${excludeParam}`, config);
            const data = response.data;

            if (data.length === 0) {
                if (isInitial) {
                    localStorage.removeItem('viewedReels');
                    setTimeout(() => fetchReels(true), 500);
                } else {
                    setHasMore(false);
                }
            } else {
                setReels(prev => {
                    const existingIds = new Set(prev.map(r => r._id));
                    const uniqueNewReels = data.filter(r => !existingIds.has(r._id)).map(r => ({
                        ...r,
                        videoUrl: r.youtubeId ? r.videoUrl : getAppUrl(r.videoUrl),
                        thumbnail: getAppUrl(r.thumbnail)
                    }));
                    return [...prev, ...uniqueNewReels];
                });
                setPage(isInitial ? 2 : prev => prev + 1);
            }
        } catch (error) {
            console.error('Error fetching reels:', error);
            if (error.response?.status === 404 && isInitial) {
                localStorage.removeItem('viewedReels');
                setTimeout(() => fetchReels(true), 3000);
            }
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    };

    const handleReelEnd = (index) => {
        console.log(`Reel ${index} ended, auto-scrolling...`);
        const nextIndex = index + 1;
        const nextReelElement = document.querySelector(`[data-index="${nextIndex}"]`);

        if (nextReelElement) {
            nextReelElement.scrollIntoView({ behavior: 'smooth' });
        } else if (!hasMore && loading === false) {
            // End of feed
            console.log("End of reels list reached.");
        }
    };

    useEffect(() => {
        fetchReels(true);
    }, [sharedReelId]);

    // Socket.IO for Real-time Sync
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        socket.current = io(`${BACKEND_URL}`);

        socket.current.on('connect', () => {
            console.log('ReelsPage Socket connected');
        });

        socket.current.on('reel-liked', ({ reelId, likes, totalLikes }) => {
            setReels(prev => prev.map(r =>
                r._id === reelId ? { ...r, likes, totalLikes, isLiked: likes.includes(JSON.parse(atob(token.split('.')[1])).id) } : r
            ));
        });

        socket.current.on('reel-commented', ({ reelId, comments }) => {
            setReels(prev => prev.map(r =>
                r._id === reelId ? { ...r, comments } : r
            ));
        });

        socket.current.on('reel-deleted', (reelId) => {
            setReels(prev => prev.filter(r => r._id !== reelId));
        });

        return () => {
            if (socket.current) socket.current.disconnect();
        };
    }, []);

    useEffect(() => {
        const options = {
            root: null, // Use viewport
            threshold: 0.6 // Trigger when 60% of the reel is visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = parseInt(entry.target.getAttribute('data-index'));
                    setActiveIndex(index);

                    // Trigger infinite scroll when near the end (now more aggressive for infinity)
                    if (index >= reels.length - 8 && reels.length > 0) {
                        fetchReels();
                    }
                }
            });
        }, {
            root: null,
            threshold: 0.1 // Activate much earlier to start buffering next video
        });

        const elements = document.querySelectorAll('.reel-item-container');
        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [reels]);

    // Track View and Sync with Backend
    useEffect(() => {
        if (reels[activeIndex]) {
            const reelId = reels[activeIndex]._id;

            // 1. Mark in Local Storage immediately (Safety net for guest/refresh)
            const localViewed = JSON.parse(localStorage.getItem('viewedReels') || '[]');
            if (!localViewed.includes(reelId)) {
                localViewed.push(reelId);
                // Keep only last 100 to avoid bloat
                if (localViewed.length > 100) localViewed.shift();
                localStorage.setItem('viewedReels', JSON.stringify(localViewed));
            }

            // 2. Mark in Backend (if logged in)
            const token = localStorage.getItem('token');
            if (token) {
                axios.post(`${import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com"}/api/reels/track-watch/${reelId}`, {
                    watchTime: 1.5, // Emulate a quick view
                    completed: false
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(err => { });
            }
        }
    }, [activeIndex, reels]);

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const handleLikeUpdate = (reelId, isLiked, totalLikes) => {
        setReels(prev => prev.map(r =>
            r._id === reelId ? { ...r, isLiked, totalLikes: totalLikes !== undefined ? totalLikes : (r.totalLikes || r.likes?.length || 0) + (isLiked ? 1 : -1) } : r
        ));
    };

    return (
        <div
            ref={containerRef}
            className="h-screen bg-black overflow-y-scroll snap-y snap-mandatory no-scrollbar"
        >
            {reels.map((reel, index) => {
                // Virtualization: Pre-render current, 3 previous, and 3 next reels
                // This reduces memory usage and prevents multiple videos from playing sound at once
                const isNearby = Math.abs(index - activeIndex) <= 3;

                return (
                    <div
                        key={reel._id}
                        className="reel-item-container snap-start h-screen w-full relative"
                        data-index={index}
                    >
                        {isNearby ? (
                            <ReelItem
                                reel={reel}
                                isMuted={isMuted}
                                toggleMute={toggleMute}
                                isActive={activeIndex === index}
                                isShared={reel._id === sharedReelId}
                                onLikeUpdate={handleLikeUpdate}
                                onEnded={() => handleReelEnd(index)}
                            />
                        ) : (
                            // Placeholder to maintain scroll height and show thumbnail if possible
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                <img
                                    src={reel.thumbnail}
                                    className="w-full h-full object-cover opacity-50"
                                    alt="loading..."
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/400x700/f3f4f6/9ca3af?text=Reel+Preview';
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/50 rounded-full animate-spin"></div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {loading && reels.length === 0 && (
                <div className="h-screen w-full flex items-center justify-center bg-black">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default ReelsPage;
