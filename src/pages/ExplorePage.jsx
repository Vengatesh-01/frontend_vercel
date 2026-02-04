import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';
import ReelItem from '../components/ReelItem';
import ExploreGridItem from '../components/ExploreGridItem';
import ShareModal from '../components/ShareModal';
import { FaPlay, FaClone, FaSearch, FaTimes, FaHeart, FaComment, FaEye, FaShare } from 'react-icons/fa';

const ExplorePage = () => {
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [activeCategory, setActiveCategory] = useState('Trending');
    const [activeLanguage, setActiveLanguage] = useState('All');
    const [hasMore, setHasMore] = useState(true);
    const [selectedReel, setSelectedReel] = useState(null);
    const [shareReel, setShareReel] = useState(null);
    const observer = useRef();

    const categories = ['Trending', 'Music', 'Comedy', 'Movies', 'Tech'];
    const languages = ['All', 'Tamil', 'English'];

    useEffect(() => {
        setReels([]);
        setPage(1);
        setHasMore(true);
        fetchReels(1, activeCategory, activeLanguage, true);
    }, [activeCategory, activeLanguage]);

    useEffect(() => {
        if (page > 1) {
            fetchReels(page, activeCategory, activeLanguage);
        }
    }, [page]);

    const fetchReels = async (pageNum, category, language, isRefresh = false) => {
        try {
            setLoading(true);
            const res = await axios.get(`${BACKEND_URL}/api/explore?page=${pageNum}&category=${category}&language=${language}`);

            if (res.data.length === 0) setHasMore(false);

            const filteredData = res.data.filter(reel => reel.source !== 'manual');
            setReels(prev => isRefresh ? filteredData : [...prev, ...filteredData]);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const lastReelRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Hover autoplay logic
    const handleMouseEnter = (e) => {
        const vid = e.currentTarget.querySelector('video');
        if (vid) vid.play().catch(() => { });
    };

    const handleMouseLeave = (e) => {
        const vid = e.currentTarget.querySelector('video');
        if (vid) {
            vid.pause();
            vid.currentTime = 0;
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] pb-20 pt-4 md:px-4">
            <div className="max-w-[935px] mx-auto">

                {/* Language Toggle */}
                <div className="flex gap-3 mb-4 px-4 md:px-0">
                    {languages.map(lang => (
                        <button
                            key={lang}
                            onClick={() => setActiveLanguage(lang)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeLanguage === lang
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {lang}
                        </button>
                    ))}
                </div>

                {/* Category Filters */}
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-6 px-4 md:px-0">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all border ${activeCategory === cat
                                ? 'bg-black text-white border-black shadow-lg'
                                : 'bg-white text-black border-gray-300 hover:bg-gray-100 hover:border-gray-400'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Explore Grid - Instagram Style with Mixed Sizes */}
                <div className="grid grid-cols-3 gap-0.5 md:gap-2">

                    {reels.map((reel, index) => {
                        // Create mixed grid pattern: Every 7th item (indices 6, 13, 20...) gets larger
                        const isLarge = (index + 1) % 7 === 0;

                        return (
                            <div
                                key={`${reel._id}-${index}`}
                                ref={index === reels.length - 1 ? lastReelRef : null}
                                className={isLarge ? 'col-span-2 row-span-2' : ''}
                            >
                                <ExploreGridItem
                                    reel={reel}
                                    index={index}
                                    isLarge={isLarge}
                                    onClick={() => setSelectedReel(reel)}
                                    onCommentClick={() => setSelectedReel(reel)}
                                    onShareClick={(r) => setShareReel(r)}
                                />
                            </div>
                        );
                    })}
                </div>

                {loading && <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div></div>}

                {!loading && reels.length === 0 && (
                    <div className="text-center py-20 text-gray-500">
                        <FaSearch className="text-4xl mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No content found</p>
                        <p className="text-sm mt-2">Try a different category or language filter</p>
                    </div>
                )}
            </div>

            {/* Full Screen Player Modal */}
            {selectedReel && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl" onClick={() => setSelectedReel(null)}>

                    <button className="absolute top-4 right-8 text-white/40 text-4xl z-[110] hover:text-white transition-all transform hover:scale-110 active:scale-95" onClick={() => setSelectedReel(null)}>
                        <FaTimes />
                    </button>

                    <div className="h-[94vh] aspect-[9/16] bg-black rounded-[2.5rem] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,1)] border border-white/10 relative scale-[1.02] md:scale-100" onClick={e => e.stopPropagation()}>
                        <ReelItem
                            reel={selectedReel}
                            isMuted={false}
                            toggleMute={() => { }}
                            isActive={true}
                        />
                    </div>
                </div>
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={!!shareReel}
                onClose={() => setShareReel(null)}
                contentToShare={{ type: 'reel', data: shareReel }}
            />
        </div>
    );
};

export default ExplorePage;
