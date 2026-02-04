import { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import getAppUrl from '../utils/urlUtils';
import {
    FaHome, FaUser, FaSignOutAlt, FaPlus, FaHeart,
    FaVideo, FaCamera, FaFilm, FaBroadcastTower,
    FaComment, FaSearch, FaShoppingBag, FaRegHeart, FaRegComment, FaRegPaperPlane, FaRegBookmark, FaCompass, FaBars, FaCog, FaShieldAlt, FaRobot, FaGamepad
} from 'react-icons/fa';

const Sidebar = ({ onCreatePost, onAddStory, onSearchToggle }) => {
    const { user, logout } = useContext(AuthContext);
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { icon: FaHome, label: 'Home', path: '/' },
        { icon: FaSearch, label: 'Search', onClick: onSearchToggle },
        { icon: FaCompass, label: 'Explore', path: '/explore' },
        { icon: FaRobot, label: 'AI Assistant', path: '/ai-assistant' },
        { icon: FaPlus, label: 'Create', onClick: onCreatePost, isBoxIcon: true },
        { icon: FaFilm, label: 'Reels', path: '/reels' },
        { icon: FaRegPaperPlane, label: 'Messages', path: '/messages' },
        { icon: FaGamepad, label: 'Gaming', path: '/gaming' },
        {
            icon: () => (
                <img
                    src={getAppUrl(user?.profilePic) || `https://ui-avatars.com/api/?name=${user?.username}`}
                    className={`w-6 h-6 rounded-full border ${isActive(`/profile/${user?.username}`) ? 'border-black' : 'border-transparent'}`}
                />
            ),
            label: 'Profile',
            path: `/profile/${user?.username}`
        },
        ...(user?.role === 'admin' ? [{ icon: FaShieldAlt, label: 'Admin', path: '/admin' }] : [])
    ];

    return (
        <div className="fixed left-0 top-0 h-full w-[72px] xl:w-[245px] bg-white border-r border-gray-200 hidden md:flex flex-col px-3 py-5 transition-all duration-300 z-[100]">

            {/* Logo */}
            <Link to="/" className="mb-10 px-3 flex items-center h-10">
                <span className="xl:hidden text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500">R</span>
                <span className="hidden xl:block text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 font-display tracking-tight">
                    REELIO
                </span>
            </Link>

            {/* Nav Items */}
            <div className="flex-1 space-y-2">
                {navItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isItemActive = item.path && isActive(item.path);

                    const content = (
                        <div
                            key={idx}
                            onClick={item.onClick}
                            className={`flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-all cursor-pointer group active:scale-95`}
                        >
                            <div className="relative">
                                {typeof item.icon === 'function' && item.icon.name === '' ? <item.icon /> : (
                                    <Icon className={`text-2xl ${isItemActive ? 'scale-110' : 'group-hover:scale-105'}`} />
                                )}
                                {item.badge && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full border-2 border-white">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`hidden xl:block text-base ${isItemActive ? 'font-bold' : 'font-normal'}`}>
                                {item.label}
                            </span>
                        </div>
                    );

                    return item.path ? <Link to={item.path} key={idx}>{content}</Link> : content;
                })}
            </div>

            {/* Bottom Menu */}
            <div className="relative">
                <button
                    onClick={() => setShowMore(!showMore)}
                    className="flex items-center gap-4 p-3 w-full rounded-lg hover:bg-gray-50 transition-all cursor-pointer group active:scale-95"
                >
                    <FaBars className="text-2xl group-hover:scale-105" />
                    <span className="hidden xl:block text-base">More</span>
                </button>

                {showMore && (
                    <div className="absolute bottom-16 left-0 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden py-2 animate-fade-in-up">
                        <Link to="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm">
                            <FaCog /> Settings
                        </Link>

                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
