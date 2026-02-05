import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import getAppUrl from '../utils/urlUtils';
import {
    FaUser, FaLock, FaBell, FaShieldAlt, FaQuestionCircle, FaInfoCircle,
    FaChevronRight, FaCrown, FaSignOutAlt, FaChevronLeft, FaToggleOn, FaToggleOff,
    FaHistory, FaKey, FaLifeRing, FaBug, FaGithub, FaTwitter, FaGlobe
} from 'react-icons/fa';
import AuthContext from '../context/AuthContext';
import { BACKEND_URL } from '../utils/urlUtils';
import { uploadToCloudinary } from '../utils/cloudinary';

const SettingsPage = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [activePanel, setActivePanel] = useState(null); // 'notifications', 'privacy', etc.
    const [toast, setToast] = useState(null);
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [showPasswordForm, setShowPasswordForm] = useState(false);

    // Form states
    const [reportMsg, setReportMsg] = useState('');
    const [pwState, setPwState] = useState({ old: '', new: '', confirm: '' });
    const [isUpdatingPw, setIsUpdatingPw] = useState(false);
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const fileInputRef = useRef(null);
    const [profileData, setProfileData] = useState({
        username: user?.username || '',
        bio: user?.bio || '',
        photo: user?.profilePic || ''
    });

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const { checkUserLoggedIn } = useContext(AuthContext);

    // Notification & Privacy State (Persisted locally)
    const [prefs, setPrefs] = useState(() => {
        const saved = localStorage.getItem('reelio_settings');
        return saved ? JSON.parse(saved) : {
            push: true,
            email: false,
            dm: true,
            private: false,
            activity: true
        };
    });

    useEffect(() => {
        localStorage.setItem('reelio_settings', JSON.stringify(prefs));
    }, [prefs]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const togglePref = (key) => {
        setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
        showToast('Setting updated and saved!');
    };

    const handlePwChange = async (e) => {
        e.preventDefault();

        if (pwState.new !== pwState.confirm) {
            showToast('New passwords do not match');
            return;
        }

        if (pwState.new.length < 6) {
            showToast('New password must be at least 6 characters');
            return;
        }

        setIsUpdatingPw(true);

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${BACKEND_URL}/api/users/update-password`, {
                currentPassword: pwState.old,
                newPassword: pwState.new
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            showToast('Password changed successfully!');
            setShowPasswordForm(false);
            setPwState({ old: '', new: '', confirm: '' });
        } catch (error) {
            console.error('Error updating password:', error);
            const message = error.response?.data?.message || 'Failed to update password';
            showToast(message);
        } finally {
            setIsUpdatingPw(false);
        }
    };


    const handleReport = async (e) => {
        e.preventDefault();
        if (!reportMsg.trim()) return;
        setIsSubmittingReport(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${BACKEND_URL}/api/reports`,
                { message: reportMsg },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast('Report submitted successfully!');
            setReportMsg('');
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to submit report', 'error');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${BACKEND_URL}/api/users/profile`, {
                username: profileData.username,
                bio: profileData.bio,
                profilePic: profileData.photo
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (checkUserLoggedIn) await checkUserLoggedIn();
            showToast('Profile updated successfully!');
            setIsSavingProfile(false);
            setActivePanel(null);
        } catch (error) {
            console.error('Error saving profile:', error);
            showToast('Failed to save profile');
            setIsSavingProfile(false);
        }
    };

    const handlePhotoChange = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);
        showToast('Uploading photo...');

        try {
            const token = localStorage.getItem('token');
            const data = await uploadToCloudinary(file, token, (percent) => {
                setUploadProgress(percent);
            });

            setProfileData({ ...profileData, photo: data.filePath });
            showToast('Photo uploaded! Click "Save Profile" to apply changes.');
        } catch (err) {
            console.error('Error uploading file:', err);
            showToast(err.message || 'Upload failed');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    // State for login sessions
    const [sessions, setSessions] = useState([
        { id: 1, device: 'Windows PC', location: 'New York, USA', status: 'Active Now', isCurrent: true },
        { id: 2, device: 'iPhone 14', location: 'London, UK', status: '2 hours ago', isCurrent: false },
        { id: 3, device: 'iPad Air', location: 'Paris, France', status: 'Yesterday', isCurrent: false }
    ]);

    const terminateSession = (id) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        showToast('Session terminated successfully.');
    };

    const renderPanel = () => {
        const backBtn = (
            <button
                onClick={() => {
                    setActivePanel(null);
                    setShowPasswordForm(false);
                    setExpandedFaq(null);
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors"
            >
                <FaChevronLeft /> Back to Settings
            </button>
        );

        switch (activePanel) {
            case 'notifications':
                return (
                    <div className="animate-slide-in">
                        {backBtn}
                        <h2 className="text-2xl font-bold mb-6">Notifications</h2>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                            {[
                                { id: 'push', label: 'Push Notifications', desc: 'Receive alerts on your device' },
                                { id: 'email', label: 'Email Notifications', desc: 'Summary of what you missed' },
                                { id: 'dm', label: 'Direct Messages', desc: 'Alerts for new messages' }
                            ].map(item => (
                                <div
                                    key={item.id}
                                    onClick={() => togglePref(item.id)}
                                    className="flex justify-between items-center p-6 transition-all hover:bg-gray-50 cursor-pointer group"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{item.label}</p>
                                        <p className="text-sm text-gray-500">{item.desc}</p>
                                    </div>
                                    <div className="text-3xl transition-transform active:scale-90">
                                        {prefs[item.id] ? <FaToggleOn className="text-blue-500" /> : <FaToggleOff className="text-gray-300" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="animate-slide-in">
                        {backBtn}
                        <h2 className="text-2xl font-bold mb-6">Privacy</h2>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
                            <div
                                onClick={() => togglePref('private')}
                                className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 group transition-all"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Private Account</p>
                                    <p className="text-sm text-gray-500">Only people you approve can see your content</p>
                                </div>
                                <div className="text-3xl active:scale-95 transition-transform">
                                    {prefs.private ? <FaToggleOn className="text-blue-500" /> : <FaToggleOff className="text-gray-300" />}
                                </div>
                            </div>
                            <div
                                onClick={() => togglePref('activity')}
                                className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 group transition-all"
                            >
                                <div>
                                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Show Activity Status</p>
                                    <p className="text-sm text-gray-500">Allow accounts you follow to see your status</p>
                                </div>
                                <div className="text-3xl active:scale-95 transition-transform">
                                    {prefs.activity ? <FaToggleOn className="text-blue-500" /> : <FaToggleOff className="text-gray-300" />}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-amber-50 rounded-lg text-xs text-amber-700 leading-relaxed border border-amber-100">
                            <strong>Note:</strong> Privacy settings impact how your profile appears to others. Private accounts hide posts/reels from non-followers.
                        </div>
                    </div>
                );
            case 'security':
                return (
                    <div className="animate-slide-in">
                        {backBtn}
                        <h2 className="text-2xl font-bold mb-6">Security</h2>
                        <div className="space-y-4">
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden">
                                <div
                                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                                    className="flex items-center justify-between cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-500 rounded-lg group-hover:bg-blue-100 transition-colors"><FaKey /></div>
                                        <h3 className="font-bold group-hover:text-blue-600 transition-colors">Password Management</h3>
                                    </div>
                                    <FaChevronRight className={`text-gray-300 transition-transform ${showPasswordForm ? 'rotate-90' : ''}`} />
                                </div>
                                {showPasswordForm && (
                                    <form onSubmit={handlePwChange} className="mt-6 space-y-3 animate-fade-in border-t border-gray-50 pt-6">
                                        <input
                                            type="password"
                                            placeholder="Current Password"
                                            required
                                            value={pwState.old}
                                            onChange={e => setPwState({ ...pwState, old: e.target.value })}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                                        />
                                        <input
                                            type="password"
                                            placeholder="New Password"
                                            required
                                            value={pwState.new}
                                            onChange={e => setPwState({ ...pwState, new: e.target.value })}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirm New Password"
                                            required
                                            value={pwState.confirm}
                                            onChange={e => setPwState({ ...pwState, confirm: e.target.value })}
                                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                                        />
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="submit"
                                                disabled={isUpdatingPw}
                                                className={`flex-1 py-2.5 ${isUpdatingPw ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-100 transition-all`}
                                            >
                                                {isUpdatingPw ? 'Updating...' : 'Update Password'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isUpdatingPw}
                                                onClick={(e) => { e.stopPropagation(); setShowPasswordForm(false); setPwState({ old: '', new: '', confirm: '' }) }}
                                                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-green-50 text-green-500 rounded-lg"><FaHistory /></div>
                                    <h3 className="font-bold">Login Activity</h3>
                                </div>
                                <div className="space-y-4">
                                    {sessions.map(s => (
                                        <div key={s.id} className={`flex justify-between items-center text-sm p-3 rounded-lg border animate-slide-in ${s.isCurrent ? 'bg-gray-50 border-gray-100' : 'border-transparent'}`}>
                                            <div>
                                                <p className={`font-bold ${s.isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>{s.device} • {s.location}</p>
                                                <p className="text-gray-500 text-xs mt-0.5">{s.status} {s.isCurrent ? '• This Device' : ''}</p>
                                            </div>
                                            {s.isCurrent ? (
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-black tracking-wider">ONLINE</span>
                                            ) : (
                                                <button
                                                    onClick={() => terminateSession(s.id)}
                                                    className="text-red-500 font-bold text-xs uppercase hover:underline p-1 transition-all active:scale-90"
                                                >
                                                    Log Out
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {sessions.length === 1 && (
                                        <p className="text-center text-[10px] text-gray-400 mt-4 italic">No other active sessions found</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'help':
                return (
                    <div className="animate-slide-in">
                        {backBtn}
                        <h2 className="text-2xl font-bold mb-6">Help & Support</h2>
                        <div className="space-y-6">
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h3 className="font-bold mb-4 flex items-center gap-2"><FaBug className="text-red-500" /> Report a problem</h3>
                                {!reportMsg && toast === 'Report submitted! Our team will review it.' ? (
                                    <div className="py-8 text-center animate-fade-in">
                                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FaShieldAlt />
                                        </div>
                                        <p className="font-bold text-gray-900">Thank you for your feedback!</p>
                                        <p className="text-sm text-gray-500 mt-1">Our support team has received your report.</p>
                                        <button
                                            onClick={() => setToast(null)}
                                            className="mt-6 text-sm font-bold text-blue-500 hover:underline"
                                        >
                                            Report another issue
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleReport} className="space-y-3">
                                        <div className="relative">
                                            <textarea
                                                value={reportMsg}
                                                onChange={e => setReportMsg(e.target.value.slice(0, 500))}
                                                placeholder="What's going wrong?"
                                                rows={4}
                                                required
                                                className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none"
                                            />
                                            <div className="absolute bottom-3 right-3 text-[10px] font-mono text-gray-400">
                                                {reportMsg.length}/500
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingReport || !reportMsg.trim()}
                                            className={`w-full py-3 ${isSubmittingReport || !reportMsg.trim() ? 'bg-gray-200 cursor-not-allowed text-gray-400' : 'bg-black hover:bg-zinc-800 text-white shadow-lg'} rounded-xl text-sm font-bold transition-all active:scale-[0.98]`}
                                        >
                                            {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                                        </button>
                                    </form>
                                )}
                            </div>
                            <div className="px-1">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-4 tracking-widest">Expansion FAQ</h4>
                                <div className="space-y-1 bg-white border border-gray-50 rounded-xl overflow-hidden shadow-sm">
                                    {[
                                        { q: "How to edit profile?", a: "Simply navigate to Settings > Edit Profile right here in the settings menu to update your information instantly." },

                                        { q: "Is my data secure?", a: "Yes. Reelio uses AES-256 bit encryption for data at rest and TLS for data in transit." },
                                        { q: "How to reach owner?", a: "Authorized admins can access the 'Owner Administration' link at the bottom of the main settings menu." },
                                        { q: "Can I delete my account?", a: "Currently, account deletion requires a direct request to the Admin team via the 'Report a problem' form above." },
                                        { q: "Content Guidelines", a: "We prohibit hate speech, harassment, and explicit content. Please respect the community." }
                                    ].map((faq, i) => (
                                        <div key={i} className="border-b border-gray-50 last:border-0">
                                            <button
                                                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                                className="w-full p-4 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between group"
                                            >
                                                <span className="group-hover:text-blue-600 transition-colors">{faq.q}</span>
                                                <FaChevronRight className={`text-[10px] transform transition-transform duration-300 ${expandedFaq === i ? 'rotate-90 text-blue-500' : 'text-gray-300'}`} />
                                            </button>
                                            {expandedFaq === i && (
                                                <div className="px-4 pb-4 animate-fade-in">
                                                    <p className="text-xs text-gray-500 leading-relaxed bg-blue-50/50 p-3 rounded-lg border border-blue-50">
                                                        {faq.a}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'about':
                return (
                    <div className="animate-slide-in">
                        {backBtn}
                        <h2 className="text-2xl font-bold mb-6">About Reelio</h2>
                        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm text-center">
                            <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 mb-6 tracking-tighter">REELIO</div>
                            <div className="space-y-1 mb-8">
                                <p className="text-sm font-bold text-gray-900">Version 2.1.0-Admin Release</p>
                                <p className="text-[10px] text-gray-400 font-mono">Build 2026.01.28-Final</p>
                            </div>

                            <button
                                onClick={() => {
                                    setIsCheckingUpdates(true);
                                    setTimeout(() => {
                                        setIsCheckingUpdates(false);
                                        showToast('Reelio is up to date!');
                                    }, 2000);
                                }}
                                disabled={isCheckingUpdates}
                                className={`px-6 py-2 rounded-full border text-xs font-bold transition-all ${isCheckingUpdates ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-white border-blue-500 text-blue-500 hover:bg-blue-50'}`}
                            >
                                {isCheckingUpdates ? 'Checking for updates...' : 'Check for Updates'}
                            </button>

                            <div className="flex justify-center gap-10 text-2xl text-gray-300 my-12 border-y border-gray-50 py-8">
                                <FaGithub onClick={() => showToast('Opening GitHub...')} className="hover:text-black cursor-pointer transition-all hover:scale-125" />
                                <FaTwitter onClick={() => showToast('Opening Twitter...')} className="hover:text-[#1DA1F2] cursor-pointer transition-all hover:scale-125" />
                                <FaGlobe onClick={() => showToast('Opening website...')} className="hover:text-green-500 cursor-pointer transition-all hover:scale-125" />
                            </div>

                            <div className="space-y-6 text-[10px] text-gray-400">
                                <div className="flex justify-center gap-4">
                                    <span onClick={() => showToast('Privacy Policy loading...')} className="hover:text-gray-900 cursor-pointer transition-colors">Privacy Policy</span>
                                    <span>•</span>
                                    <span onClick={() => showToast('Terms of Use loading...')} className="hover:text-gray-900 cursor-pointer transition-colors">Terms of Use</span>
                                    <span>•</span>
                                    <span onClick={() => showToast('Cookie Policy loading...')} className="hover:text-gray-900 cursor-pointer transition-colors">Cookie Policy</span>
                                </div>
                                <p className="font-medium">© 2026 Reelio Platform Inc.</p>
                            </div>
                        </div>
                    </div>
                );
            case 'edit-profile':
                return (
                    <div className="animate-slide-in">
                        {backBtn}
                        <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>
                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div className="flex flex-col items-center py-4 border-b border-gray-50 mb-4">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    <div className="relative group cursor-pointer" onClick={handlePhotoChange}>
                                        <div className="w-24 h-24 rounded-full border-2 border-gray-100 overflow-hidden bg-gray-50 flex items-center justify-center">
                                            {profileData.photo ? (
                                                <img
                                                    src={getAppUrl(profileData.photo)}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=random`;
                                                    }}
                                                />
                                            ) : (
                                                <FaUser className="text-3xl text-gray-300" />
                                            )}
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[10px] text-white font-bold">CHANGE</p>
                                        </div>
                                    </div>
                                    <p
                                        onClick={handlePhotoChange}
                                        className="mt-4 text-sm font-bold text-blue-500 hover:text-blue-700 cursor-pointer active:translate-y-0.5 transition-all outline-none"
                                    >
                                        Change Profile Photo
                                    </p>
                                </div>

                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Username</label>
                                        <input
                                            type="text"
                                            value={profileData.username}
                                            onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                                            className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Bio</label>
                                        <textarea
                                            value={profileData.bio}
                                            onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                                            rows={3}
                                            placeholder="Write something about yourself..."
                                            className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className={`w-full py-4 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98] ${isSavingProfile ? 'bg-gray-200 text-gray-400' : 'bg-blue-500 text-white shadow-blue-100 hover:bg-blue-600'}`}
                                >
                                    {isSavingProfile ? 'Saving Changes...' : 'Save Profile'}
                                </button>
                            </form>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    if (activePanel) {
        return (
            <div className="max-w-xl mx-auto p-4 md:p-8 relative">
                {toast && (
                    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#262626] text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-2xl animate-toast-in border border-white/10">
                        {toast}
                    </div>
                )}
                {renderPanel()}
                <style>{`
                    .animate-slide-in { animation: slideIn 0.3s ease-out; }
                    @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .animate-toast-in { animation: toastIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
                    @keyframes toastIn { from { transform: translate(-50%, -100%) scale(0.8); opacity: 0; } to { transform: translate(-50%, 0) scale(1); opacity: 1; } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
            <h1 className="text-2xl font-bold mb-8">Settings</h1>

            <div className="space-y-8">
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wider">How you use Reelio</h2>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div onClick={() => setActivePanel('edit-profile')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-white transition-all"><FaUser /></div>
                                <div><p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">Edit profile</p><p className="text-sm text-gray-500">Change your photo and bio</p></div>
                            </div>
                            <FaChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <div onClick={() => setActivePanel('notifications')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FaBell /></div>
                                <div><p className="font-medium text-gray-900">Notifications</p><p className="text-sm text-gray-500">Manage what alerts you receive</p></div>
                            </div>
                            <FaChevronRight className="text-gray-300" />
                        </div>
                        <div onClick={() => setActivePanel('privacy')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FaLock /></div>
                                <div><p className="font-medium text-gray-900">Privacy</p><p className="text-sm text-gray-500">Manage your visibility</p></div>
                            </div>
                            <FaChevronRight className="text-gray-300" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wider">More info and support</h2>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div onClick={() => setActivePanel('security')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FaShieldAlt /></div>
                                <div><p className="font-medium text-gray-900">Security</p><p className="text-sm text-gray-500">Login activity and security checks</p></div>
                            </div>
                            <FaChevronRight className="text-gray-300" />
                        </div>
                        <div onClick={() => setActivePanel('help')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FaQuestionCircle /></div>
                                <div><p className="font-medium text-gray-900">Help</p><p className="text-sm text-gray-500">Support and FAQs</p></div>
                            </div>
                            <FaChevronRight className="text-gray-300" />
                        </div>
                        <div onClick={() => setActivePanel('about')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600"><FaInfoCircle /></div>
                                <div><p className="font-medium text-gray-900">About</p><p className="text-sm text-gray-500">Reelio version and legal terms</p></div>
                            </div>
                            <FaChevronRight className="text-gray-300" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-500 px-2 uppercase tracking-wider">Account</h2>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <a
                            href="/owner.html"
                            onClick={(e) => {
                                // show toast but don't prevent default unless we want full simulation
                                showToast('Opening Owner Panel...');
                            }}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-50 transition-colors border-b border-gray-100 group active:bg-zinc-100"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-100 transition-all"><FaCrown /></div>
                                <div><p className="font-bold text-gray-900 group-hover:text-amber-700 transition-colors">Owner Administration</p><p className="text-xs text-gray-500">Secure owner-only management panel</p></div>
                            </div>
                            <FaChevronRight className="text-gray-300 group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                        </a>
                        <div
                            onClick={() => {
                                showToast('Signing out...');
                                setIsLoggingOut(true);
                                setTimeout(() => {
                                    logout();
                                    navigate('/login');
                                }, 800);
                            }}
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-all"><FaSignOutAlt /></div>
                                <div><p className="font-bold text-red-600">Log Out</p><p className="text-xs text-red-400">Sign out of your session</p></div>
                            </div>
                            <FaChevronRight className="text-red-200 group-hover:text-red-500 transition-all group-hover:translate-x-1" />
                        </div>
                    </div>

                </div>
            </div>

            {isLoggingOut && (
                <div className="fixed inset-0 z-[100] bg-white animate-fade-in pointer-events-none" />
            )}

            <style>{`
                .animate-slide-in { animation: slideIn 0.3s ease-out; }
                @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default SettingsPage;
