import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import getAppUrl from '../utils/urlUtils';
import {
    FaHome, FaSearch, FaFilm, FaRegPaperPlane, FaPlusSquare, FaRobot, FaGamepad, FaCompass
} from 'react-icons/fa';

const BottomNavbar = ({ onCreatePost, onSearchToggle }) => {
    const { user } = useContext(AuthContext);
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { icon: FaHome, path: '/' },
        { icon: FaSearch, onClick: onSearchToggle },
        { icon: FaCompass, path: '/explore' },
        { icon: FaRobot, path: '/ai-assistant' },
        { icon: FaPlusSquare, onClick: onCreatePost },
        { icon: FaFilm, path: '/reels' },
        { icon: FaGamepad, path: '/gaming' },
        { icon: FaRegPaperPlane, path: '/messages' },
        {
            icon: () => (
                <img
                    src={getAppUrl(user?.profilePic) || `https://ui-avatars.com/api/?name=${user?.username}`}
                    className={`w-6 h-6 rounded-full border ${isActive(`/profile/${user?.username}`) ? 'border-black' : 'border-transparent'}`}
                />
            ),
            path: `/profile/${user?.username}`
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-14 md:hidden z-[100]">
            <span className="absolute -top-4 right-2 text-[8px] text-gray-300">v1.0.5-profile-fix</span>
            {navItems.map((item, idx) => {
                const Icon = item.icon;
                const isItemActive = item.path && isActive(item.path);

                const content = (
                    <div
                        key={idx}
                        onClick={item.onClick}
                        className={`flex items-center justify-center w-12 h-12 rounded-lg active:scale-90 transition-transform`}
                    >
                        {typeof item.icon === 'function' && item.icon.name === '' ? <item.icon /> : (
                            <Icon className={`text-xl ${isItemActive ? 'text-black' : 'text-gray-500'}`} />
                        )}
                    </div>
                );

                return item.path ? <Link to={item.path} key={idx}>{content}</Link> : content;
            })}
        </div>
    );
};

export default BottomNavbar;
