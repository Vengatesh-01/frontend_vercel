import { BrowserRouter as Router, Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { isMobileApp } from './utils/platform';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import BottomNavbar from './components/BottomNavbar';
import SearchPanel from './components/SearchPanel';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';

import ProfilePage from './pages/ProfilePage';
import SearchPage from './pages/SearchPage';
import ExplorePage from './pages/ExplorePage';
import ReelsPage from './pages/ReelsPage';
import ShopPage from './pages/ShopPage';
import MessagesPage from './pages/MessagesPage';
import TestMessagesPage from './pages/TestMessagesPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AIAssistantPage from './pages/AIAssistantPage';
import GamingPage from './pages/GamingPage';
import SettingsPage from './pages/SettingsPage';

// Layout component wraps pages that need the Sidebar
const MainLayout = ({ showCreatePost, setShowCreatePost, showUploadModal, setShowUploadModal }) => {
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isReelsPage = location.pathname === '/reels';

  // Swipe Navigation Logic
  const [touchStart, setTouchStart] = useState({ x: null, y: null });
  const [touchEnd, setTouchEnd] = useState({ x: null, y: null });

  const minSwipeDistance = 50;
  const maxVerticalDistance = 30; // Max allowed vertical movement for a horizontal swipe

  const onTouchStart = (e) => {
    setTouchEnd({ x: null, y: null });
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart.x || !touchEnd.x) return;

    const xDistance = touchStart.x - touchEnd.x;
    const yDistance = Math.abs(touchStart.y - touchEnd.y);
    const isMobile = isMobileApp();

    if (!isMobile) return; // Only trigger swipe navigation on mobile devices

    const isHorizontalSwipe = yDistance < maxVerticalDistance && Math.abs(xDistance) > minSwipeDistance;
    const isLeftSwipe = xDistance > minSwipeDistance;
    const isRightSwipe = xDistance < -minSwipeDistance;

    if (isHorizontalSwipe) {
      if (isLeftSwipe && location.pathname === '/') {
        navigate('/messages');
      } else if (isRightSwipe && location.pathname === '/messages') {
        navigate('/');
      }
    }
  };

  return (
    <div
      className="flex bg-[#fafafa] min-h-screen"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Sidebar
        onCreatePost={() => setShowCreatePost(true)}
        onAddStory={() => setShowUploadModal(true)}
        onSearchToggle={() => setShowSearchPanel(!showSearchPanel)}
      />
      <SearchPanel
        isOpen={showSearchPanel}
        onClose={() => setShowSearchPanel(false)}
      />
      <main className={`flex-1 transition-all duration-300 ${isReelsPage ? 'mb-0' : 'mb-14 md:mb-0'} md:ml-[72px] xl:ml-[245px]`}>
        <Outlet />
      </main>
      {!isReelsPage && (
        <BottomNavbar
          onCreatePost={() => setShowCreatePost(true)}
          onSearchToggle={() => setShowSearchPanel(!showSearchPanel)}
        />
      )}
    </div>
  );
};

function App() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public/Auth Routes - No Sidebar */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* Protected/Main Routes - With Sidebar */}
          <Route element={
            <MainLayout
              showCreatePost={showCreatePost}
              setShowCreatePost={setShowCreatePost}
              showUploadModal={showUploadModal}
              setShowUploadModal={setShowUploadModal}
            />
          }>
            <Route path="/" element={
              <HomePage
                showCreatePost={showCreatePost}
                setShowCreatePost={setShowCreatePost}
                showUploadModal={showUploadModal}
                setShowUploadModal={setShowUploadModal}
              />
            } />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/reels" element={<ReelsPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            <Route path="/gaming" element={<GamingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
