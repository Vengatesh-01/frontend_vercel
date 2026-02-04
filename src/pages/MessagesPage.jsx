import { useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import getAppUrl, { BACKEND_URL } from '../utils/urlUtils';
import {
    FaRegEdit, FaChevronLeft, FaInfoCircle, FaRegImage, FaRegHeart, FaRegSmile,
    FaMicrophone, FaCheck, FaCheckDouble, FaUsers, FaStopCircle, FaTrash,
    FaGhost, FaVolumeMute, FaBan, FaFlag, FaTimes, FaRegPaperPlane,
    FaVolumeUp, FaPlay, FaPause, FaEllipsisH
} from 'react-icons/fa';
import { uploadToCloudinary } from '../utils/cloudinary';
const popularEmojis = ['😂', '😮', '😍', '😢', '👏', '🔥', '🎉', '💯', '❤️', '🤣', '😘', '🥰', '😗', '😭', '😊'];
const smileyEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤'];

const MessagesPage = () => {
    const { user, loading: authLoading, checkUserLoggedIn } = useContext(AuthContext);
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [typingUsers, setTypingUsers] = useState({});
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [showNewMessageModal, setShowNewMessageModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudio, setRecordedAudio] = useState(null);
    const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [activeTab, setActiveTab] = useState('primary');
    const [chatTheme, setChatTheme] = useState('classic');
    const [vanishMode, setVanishMode] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [viewingStory, setViewingStory] = useState(null);
    const [videoProgress, setVideoProgress] = useState(0);
    const [isStoryPaused, setIsStoryPaused] = useState(false);
    const [isStoryMuted, setIsStoryMuted] = useState(false);
    const [showStoryMenu, setShowStoryMenu] = useState(false);
    const [storyDuration, setStoryDuration] = useState(5); // Default 5s for images
    const [messageMenuOpen, setMessageMenuOpen] = useState(null);
    const [editingMessage, setEditingMessage] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const scrollRef = useRef(null);
    const socket = useRef(null);
    const emojiPickerRef = useRef(null);
    const progressInterval = useRef(null);

    const themes = {
        classic: { bg: 'bg-white', text: 'text-gray-900', bubble: 'bg-[#0095f6]', otherBubble: 'bg-[#efefef] text-gray-900', secondary: 'text-gray-500' },
        berry: { bg: 'bg-[#fff0f5]', text: 'text-[#800080]', bubble: 'bg-[#ff1493]', otherBubble: 'bg-white border-[#ffc0cb]', secondary: 'text-[#b03060]' },
        ocean: { bg: 'bg-[#f0f8ff]', text: 'text-[#000080]', bubble: 'bg-[#1e90ff]', otherBubble: 'bg-white border-[#add8e6]', secondary: 'text-[#4682b4]' },
        twilight: { bg: 'bg-[#1a1a2e]', text: 'text-white', bubble: 'bg-[#e94560]', otherBubble: 'bg-[#16213e] text-gray-100', secondary: 'text-gray-400' }
    };

    const selectedConversationRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        selectedConversationRef.current = selectedConversation;
    }, [selectedConversation]);

    useEffect(() => {
        if (!user) return;

        socket.current = io(`${BACKEND_URL}`);

        socket.current.on('connect', () => {
            console.log('Socket connected');
            socket.current.emit('join', user._id);
        });

        socket.current.on('connect_error', (err) => {
            console.error('Socket connection error:', err);
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, [user?._id]);

    useEffect(() => {
        if (!user || !socket.current) return;

        socket.current.on('new-message', (m) => {
            const currentSelected = selectedConversationRef.current;
            if (currentSelected?._id === m.conversationId) {
                setMessages(prev => {
                    if (prev.find(msg => msg._id === m._id)) return prev;

                    const optimisticIndex = prev.findIndex(msg => {
                        const mSenderId = m.sender?._id || m.sender;
                        const msgSenderId = msg.sender?._id || msg.sender;
                        return msg.status === 'sending' &&
                            msg.text === m.text &&
                            msgSenderId.toString() === mSenderId.toString();
                    });

                    if (optimisticIndex !== -1) {
                        const newMsgs = [...prev];
                        newMsgs[optimisticIndex] = m;
                        return newMsgs;
                    }

                    return [...prev, m];
                });
                socket.current.emit('mark-seen', { messageId: m._id, senderId: m.sender?._id || m.sender });
            }
            fetchConversations();
        });

        socket.current.on('message-sent', (m) => {
            setMessages(prev => {
                const index = prev.findIndex(msg => msg.status === 'sending' && msg.text === m.text);
                if (index !== -1) {
                    const newMsgs = [...prev];
                    newMsgs[index] = m;
                    return newMsgs;
                }
                return prev.find(msg => msg._id === m._id) ? prev : [...prev, m];
            });
        });

        socket.current.on('typing', ({ conversationId, senderName }) => {
            setTypingUsers(prev => ({ ...prev, [conversationId]: senderName }));
        });

        socket.current.on('stop-typing', ({ conversationId }) => {
            setTypingUsers(prev => {
                const copy = { ...prev };
                delete copy[conversationId];
                return copy;
            });
        });

        socket.current.on('user-status', ({ userId, status }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                if (status === 'online') next.add(userId);
                else next.delete(userId);
                return next;
            });
        });

        socket.current.on('message-seen', ({ messageId }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status: 'seen' } : m));
        });

        socket.current.on('new-message-notification', ({ conversationId, message }) => {
            fetchConversations();
        });

        socket.current.on('new-request-notification', ({ conversationId, sender }) => {
            fetchConversations();
            // Show a specific alert for a new request
            setNotification(`New message request from @${sender.username}`);
        });

        socket.current.on('message-reaction', ({ messageId, userId, emoji }) => {
            setMessages(prev => prev.map(m => {
                if (m._id !== messageId) return m;
                const existing = m.reactions || [];
                const filtered = existing.filter(r => (r.user?._id || r.user) !== userId);
                return { ...m, reactions: [...filtered, { user: userId, emoji }] };
            }));
        });

        socket.current.on('message-edited', (m) => {
            const currentSelected = selectedConversationRef.current;
            if (currentSelected?._id === m.conversationId) {
                setMessages(prev => prev.map(msg => msg._id === m._id ? m : msg));
            }
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, [user?._id]);

    // Reset progress when story opens
    useEffect(() => {
        if (viewingStory) {
            setVideoProgress(0);
            setStoryDuration(5); // Reset to default
        }
    }, [viewingStory]);

    // Handle progress
    useEffect(() => {
        if (viewingStory) {
            progressInterval.current = setInterval(() => {
                if (isStoryPaused || showStoryMenu) return;
                setVideoProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(progressInterval.current);
                        setViewingStory(null);
                        return 100;
                    }
                    // Calculate increment based on duration (100% / (duration * 10 ticks/sec))
                    return prev + (10 / storyDuration);
                });
            }, 100);
        } else {
            clearInterval(progressInterval.current);
            setShowStoryMenu(false);
        }
        return () => clearInterval(progressInterval.current);
    }, [viewingStory, isStoryPaused, showStoryMenu, storyDuration]);

    useEffect(() => { if (user) fetchConversations(); }, [user]);
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, typingUsers]);

    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BACKEND_URL}/api/messages/conversations`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            });
            setConversations(res.data);
        } catch (err) { console.error('Fetch conversations failed:', err); }
    };

    const fetchMessages = async (conv) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${BACKEND_URL}/api/messages/${conv._id}`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            });

            // Leave old room if switching
            if (selectedConversation && socket.current) {
                socket.current.emit('leave-conversation', selectedConversation._id);
            }

            setMessages(res.data);
            setSelectedConversation(conv);
            setChatTheme(conv.theme || 'classic');
            setReplyingTo(null);
            setShowInfo(false);

            // Join new room
            if (socket.current) {
                socket.current.emit('join-conversation', conv._id);
            }

            if (res.data.length > 0) {
                const last = res.data[res.data.length - 1];
                const lastSenderId = last.sender?._id || last.sender;
                if (lastSenderId !== user?._id && socket.current) {
                    socket.current.emit('mark-seen', { messageId: last._id, senderId: lastSenderId });
                }
            }
        } catch (err) { console.error(err); }
    };

    const handleSendMessage = async (payload) => {
        if (!selectedConversation) return;

        // Auto-accept request if recipient replies
        if (selectedConversation.isRequest && selectedConversation.requestedTo === user._id) {
            handleAcceptRequest();
        }

        if (!socket.current || !socket.current.connected) {
            alert('Not connected to chat server. Please wait or refresh.');
            return;
        }

        if (!payload.text?.trim() && !payload.media) return;

        if (editingMessage) {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.put(`${BACKEND_URL}/api/messages/message/${editingMessage._id}`, {
                    text: payload.text
                }, { headers: { Authorization: `Bearer ${token}` } });

                setMessages(prev => prev.map(m => m._id === editingMessage._id ? res.data : m));
                setEditingMessage(null);
                setNewMessage('');
            } catch (err) {
                console.error('Failed to edit message:', err);
                alert('Failed to edit message');
            }
            return;
        }

        // Emit socket event for real-time delivery
        socket.current.emit('send-message', {
            conversationId: selectedConversation._id,
            sender: user._id,
            text: payload.text || '',
            media: payload.media,
            replyTo: replyingTo?._id,
            vanishMode
        });

        // Optimistically add message to UI
        const tempMessage = {
            _id: `temp-${Date.now()}`,
            sender: { _id: user._id, username: user.username, profilePic: user.profilePic },
            text: payload.text || '',
            media: payload.media,
            createdAt: new Date(),
            status: 'sending'
        };
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');
        setReplyingTo(null);

        socket.current.emit('stop-typing', {
            conversationId: selectedConversation._id,
            receiverId: !selectedConversation.isGroup ? getOther(selectedConversation)?._id : null,
            isGroup: selectedConversation.isGroup
        });
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const data = await uploadToCloudinary(file, token);

            const fileUrl = getAppUrl(data.filePath);
            const type = file.type.startsWith('image') ? 'image' : 'video';

            await handleSendMessage({
                text: '',
                media: { type, url: fileUrl }
            });
        } catch (err) {
            console.error('File upload failed:', err);
            const errorMsg = err.response?.data?.message || err.message;
            alert(`Message section upload failed: ${errorMsg}`);
        }
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            const token = localStorage.getItem('token');
            setMessages(prev => prev.map(m => {
                if (m._id !== messageId) return m;
                const existing = m.reactions || [];
                const filtered = existing.filter(r => (r.user?._id || r.user) !== user?._id);
                return { ...m, reactions: [...filtered, { user: user, emoji }] };
            }));
            await axios.put(`${BACKEND_URL}/api/messages/react/${messageId}`, { emoji }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) { console.error('Reaction failed:', err); }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const previewUrl = URL.createObjectURL(audioBlob);

                setRecordedAudio(audioBlob);
                setAudioPreviewUrl(previewUrl);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleSendVoice = async () => {
        if (!recordedAudio) return;

        const formData = new FormData();
        formData.append('file', recordedAudio, `voice-${Date.now()}.webm`);

        try {
            const token = localStorage.getItem('token');
            const data = await uploadToCloudinary(recordedAudio, token);

            await handleSendMessage({
                text: '',
                media: { type: 'voice', url: getAppUrl(data.filePath) }
            });

            handleDeleteVoice();
        } catch (err) {
            console.error('Voice upload failed:', err);
        }
    };

    const handleDeleteVoice = () => {
        if (audioPreviewUrl) {
            URL.revokeObjectURL(audioPreviewUrl);
        }
        setRecordedAudio(null);
        setAudioPreviewUrl(null);
    };

    const handleEditMessage = (msg) => {
        setEditingMessage(msg);
        setNewMessage(msg.text);
        setMessageMenuOpen(null);
    };

    const handleDeleteMessage = async (messageId) => {
        console.log('Delete message called for ID:', messageId);

        if (!window.confirm('Delete this message? This cannot be undone.')) {
            console.log('User cancelled deletion');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            console.log('Attempting to delete message...', messageId);

            const response = await axios.delete(`${BACKEND_URL}/api/messages/message/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Delete response:', response.data);
            setMessages(prev => prev.filter(m => m._id !== messageId));
            setMessageMenuOpen(null);
            alert('Message deleted successfully!');
        } catch (err) {
            console.error('Failed to delete message:', err);
            console.error('Error response:', err.response?.data);
            alert(`Failed to delete message: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (selectedConversation) {
            socket.current.emit('typing', {
                conversationId: selectedConversation._id,
                receiverId: !selectedConversation.isGroup ? getOther(selectedConversation)?._id : null,
                senderName: user.username,
                isGroup: selectedConversation.isGroup
            });
            clearTimeout(window.typingTimeout);
            window.typingTimeout = setTimeout(() => {
                socket.current.emit('stop-typing', {
                    conversationId: selectedConversation._id,
                    receiverId: !selectedConversation.isGroup ? getOther(selectedConversation)?._id : null,
                    isGroup: selectedConversation.isGroup
                });
            }, 2000);
        }
    };

    const handleAcceptRequest = async () => {
        if (!selectedConversation) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${BACKEND_URL}/api/messages/accept/${selectedConversation._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(prev => prev.map(c => c._id === res.data._id ? res.data : c));
            setSelectedConversation(res.data);
            setActiveTab('primary');
        } catch (err) { console.error(err); }
    };

    const handleCreateGroup = async () => {
        if (!groupName || selectedUsers.length < 2) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${BACKEND_URL}/api/messages/group`, {
                participantIds: selectedUsers.map(u => u._id),
                groupName
            }, { headers: { Authorization: `Bearer ${token}` } });

            setConversations(prev => [res.data, ...prev]);
            setShowGroupModal(false);
            setGroupName('');
            setSelectedUsers([]);
            fetchMessages(res.data);
        } catch (err) { console.error(err); }
    };

    const handleDeleteConversation = async () => {
        if (!selectedConversation) return;
        if (!window.confirm('Are you sure you want to delete this conversation? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${BACKEND_URL}/api/messages/${selectedConversation._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(prev => prev.filter(c => c._id !== selectedConversation._id));
            setSelectedConversation(null);
        } catch (err) { console.error(err); }
    };

    const handleToggleMute = async () => {
        if (!selectedConversation) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${BACKEND_URL}/api/messages/mute/${selectedConversation._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(prev => prev.map(c => c._id === res.data._id ? res.data : c));
            setSelectedConversation(res.data);
        } catch (err) { console.error(err); }
    };

    const handleToggleCategory = async () => {
        if (!selectedConversation) return;
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.put(`${BACKEND_URL}/api/messages/category/${selectedConversation._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(prev => prev.map(c => c._id === data._id ? data : c));
            setSelectedConversation(data);
        } catch (err) { console.error(err); }
    };

    const handleToggleBlock = async () => {
        const other = getOther(selectedConversation);
        if (!other || !other._id || other._id === 'group') return;

        if (!window.confirm(`Are you sure you want to block ${other.username} ? `)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${BACKEND_URL}/api/users/block/${other._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await checkUserLoggedIn();
            alert(res.data.message || 'Operation successful');
            fetchConversations();
        } catch (err) { console.error(err); }
    };

    const getOther = (conv) => {
        if (!conv) return null;
        if (conv.isGroup) return { _id: 'group', username: conv.groupName || 'Group', profilePic: conv.groupPic };
        return conv.participants?.find(p => p._id !== user?._id) || { username: 'Unknown User', profilePic: null };
    };

    const currentTheme = themes[chatTheme] || themes.classic;

    if (authLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>;

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <div className={`flex h-screen overflow-hidden ${currentTheme.bg}`}>
            {/* Sidebar - Conversation List */}
            <div className={`w-full md:w-[350px] flex flex-col border-r border-gray-200 bg-white ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
                <div className="px-5 flex justify-between items-center h-[60px] border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/')}
                            className="md:hidden text-lg cursor-pointer hover:text-gray-500 transition-colors mr-2"
                        >
                            <FaChevronLeft />
                        </button>
                        <button className="flex items-center gap-2 font-bold text-lg tracking-tight group">
                            {user?.username}
                            <FaChevronLeft className="text-[10px] transform -rotate-90 group-hover:translate-y-0.4 transition-transform" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <FaUsers
                            className="text-lg cursor-pointer hover:text-gray-500 transition-colors"
                            onClick={() => setShowGroupModal(true)}
                        />
                        <FaRegEdit
                            className="text-lg cursor-pointer hover:text-gray-500 transition-colors"
                            onClick={() => setShowNewMessageModal(true)}
                        />
                    </div>
                </div>

                <div className="flex px-4 py-1 border-b border-gray-50">
                    {['primary', 'general', 'requests'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 text-[13px] font-semibold py-2.5 transition-colors relative ${activeTab === tab ? 'text-black' : 'text-gray-400'}`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {tab === 'requests' && conversations.filter(c => c.isRequest && c.requestedTo === user?._id).length > 0 && (
                                <span className="ml-1 bg-red-500 text-white text-[9px] px-1 rounded-full">{conversations.filter(c => c.isRequest && c.requestedTo === user?._id).length}</span>
                            )}
                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-black" />}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {conversations.filter(c => {
                        const isMyRequest = c.isRequest && c.requestedTo === user?._id;
                        if (activeTab === 'requests') return isMyRequest;
                        return !isMyRequest && (c.category || 'primary') === activeTab;
                    }).length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-xs">No conversations yet.</div>
                    ) : (
                        conversations
                            .filter(c => {
                                const isMyRequest = c.isRequest && c.requestedTo === user?._id;
                                if (activeTab === 'requests') return isMyRequest;
                                return !isMyRequest && (c.category || 'primary') === activeTab;
                            })
                            .map(conv => {
                                const other = getOther(conv);
                                const isSel = selectedConversation?._id === conv._id;
                                const isOnline = onlineUsers.has(other?._id);
                                return (
                                    <div key={conv._id} onClick={() => fetchMessages(conv)} className={`p-3 px-5 flex gap-3 items-center cursor-pointer transition-colors ${isSel ? 'bg-[#efefef]' : 'hover:bg-[#fafafa]'}`}>
                                        <div className="relative flex-shrink-0">
                                            <div className="w-[48px] h-[48px] rounded-full p-[1px] border border-gray-100 overflow-hidden">
                                                <img src={getAppUrl(other?.profilePic) || `https://ui-avatars.com/api/?name=${other?.username || 'User'}`} className="w-full h-full rounded-full object-cover" alt="" />
                                            </div >
                                            {isOnline && <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                                        </div >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-[14px] leading-tight mb-0.5 truncate ${isSel ? 'font-semibold' : 'font-normal'}`}>{other?.username || 'Unknown User'}</p>
                                                {conv.mutedBy?.includes(user?._id) && <FaVolumeMute size={12} className="text-gray-400 shrink-0" />}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                                                <p className="truncate">
                                                    {typingUsers[conv._id] ? (
                                                        <span className="text-green-500">Typing...</span>
                                                    ) : (
                                                        conv.lastMessage?.text || (conv.lastMessage?.media ? 'Sent an attachment' : 'No messages')
                                                    )}
                                                </p>
                                                <span className="opacity-50 shrink-0">• 1h</span>
                                            </div>
                                        </div>
                                    </div >
                                );
                            })
                    )}
                </div >
            </div >

            {/* Create Group Modal */}
            {
                showGroupModal && (
                    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-[2px]">
                        <div className="bg-white w-full max-w-[400px] rounded-xl flex flex-col max-h-[90vh] shadow-2xl animate-fade-in-down">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <button onClick={() => setShowGroupModal(false)} className="text-xl p-1"><FaTimes /></button>
                                <h2 className="font-bold text-base">New Group</h2>
                                <button
                                    className="text-[#0095f6] font-bold text-sm disabled:opacity-50"
                                    disabled={!groupName || selectedUsers.length < 2}
                                    onClick={handleCreateGroup}
                                >
                                    Create
                                </button>
                            </div>
                            <div className="p-4 border-b border-gray-100 space-y-4">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest">Group Details</span>
                                    <input
                                        type="text"
                                        placeholder="Group Name..."
                                        className="w-full outline-none text-sm border-b border-gray-100 pb-2 focus:border-[#0095f6] transition-colors"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Add People</span>
                                    <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto no-scrollbar mb-2">
                                        {selectedUsers.map(u => (
                                            <div key={u._id} className="bg-blue-50 text-[#0095f6] px-3 py-1 rounded-full text-[13px] font-semibold flex items-center gap-2">
                                                {u.username}
                                                <FaTimes className="cursor-pointer text-[10px]" onClick={() => setSelectedUsers(prev => prev.filter(item => item._id !== u._id))} />
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        placeholder="Search people..."
                                        className="w-full outline-none text-sm placeholder:text-gray-400"
                                        onChange={(e) => {
                                            if (e.target.value.length > 0) {
                                                console.log(`Searching for "${e.target.value}" at ${BACKEND_URL}`);
                                                axios.get(`${BACKEND_URL}/api/users/search`, {
                                                    params: { q: e.target.value },
                                                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                                }).then(res => {
                                                    console.log(`Found ${res.data.length} results`);
                                                    setSearchResults(res.data);
                                                }).catch(err => {
                                                    console.error('Search error:', err);
                                                    setSearchResults([]);
                                                });
                                            } else setSearchResults([]);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                                {searchResults.map(u => {
                                    const isSelected = selectedUsers.find(item => item._id === u._id);
                                    return (
                                        <div key={u._id} onClick={() => {
                                            if (isSelected) setSelectedUsers(prev => prev.filter(item => item._id !== u._id));
                                            else setSelectedUsers(prev => [...prev, u]);
                                        }} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                            <img src={getAppUrl(u.profilePic) || `https://ui-avatars.com/api/?name=${u.username}`} className="w-[44px] h-[44px] rounded-full border border-gray-100" />
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{u.username}</p>
                                                <p className="text-gray-500 text-xs">{u.fullname || u.username}</p>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all ${isSelected ? 'border-[#0095f6] bg-[#0095f6]' : 'border-gray-200'}`}>
                                                {isSelected && <FaCheck size={10} className="text-white" />}
                                            </div>
                                        </div>
                                    );
                                })}
                                {searchResults.length === 0 && (
                                    <div className="p-10 text-center text-gray-500 text-sm">No users found</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modals & CSS */}
            {
                showNewMessageModal && (
                    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-[2px]">
                        <div className="bg-white w-full max-w-[400px] rounded-xl flex flex-col max-h-[90vh] shadow-2xl animate-fade-in-down">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <button onClick={() => setShowNewMessageModal(false)} className="text-xl p-1"><FaTimes /></button>
                                <h2 className="font-bold text-base">New Message</h2>
                                <button
                                    className="text-[#0095f6] font-bold text-sm disabled:opacity-50"
                                    disabled={!selectedUser}
                                    onClick={async () => {
                                        try {
                                            const token = localStorage.getItem('token');
                                            const API_BASE = BACKEND_URL;
                                            const res = await axios.post(`${API_BASE}/api/messages/conversation`, { recipientId: selectedUser._id }, { headers: { Authorization: `Bearer ${token}` } });
                                            if (!conversations.find(c => c._id === res.data._id)) setConversations(prev => [res.data, ...prev]);
                                            fetchMessages(res.data);
                                            setShowNewMessageModal(false);
                                            setSelectedUser(null);
                                        } catch (err) { alert('Could not start conversation'); }
                                    }}
                                >
                                    Chat
                                </button>
                            </div>
                            <div className="p-3 border-b border-gray-100 flex items-center gap-3">
                                <span className="font-bold text-sm text-gray-700">To:</span>
                                <input
                                    autoFocus
                                    placeholder="Search..."
                                    className="flex-1 outline-none text-sm placeholder:text-gray-400"
                                    onChange={(e) => {
                                        if (e.target.value.length > 0) {
                                            const API_BASE = BACKEND_URL;
                                            console.log(`Searching for "${e.target.value}" at ${API_BASE}`);
                                            axios.get(`${API_BASE}/api/users/search`, {
                                                params: { q: e.target.value },
                                                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                            }).then(res => {
                                                console.log(`Found ${res.data.length} results`);
                                                setSearchResults(res.data);
                                            }).catch(err => {
                                                console.error('Search error:', err);
                                                setSearchResults([]);
                                            });
                                        } else setSearchResults([]);
                                    }}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                                {searchResults.map(u => (
                                    <div key={u._id} onClick={() => setSelectedUser(u)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedUser?._id === u._id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                        <img src={getAppUrl(u.profilePic) || `https://ui-avatars.com/api/?name=${u.username}`} className="w-[44px] h-[44px] rounded-full border border-gray-100" />
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{u.username}</p>
                                            <p className="text-gray-500 text-xs">{u.fullname || u.username}</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-[2px] flex items-center justify-center transition-all ${selectedUser?._id === u._id ? 'border-[#0095f6] bg-[#0095f6]' : 'border-gray-200'}`}>
                                            {selectedUser?._id === u._id && <FaCheck size={10} className="text-white" />}
                                        </div>
                                    </div>
                                ))}
                                {searchResults.length === 0 && (
                                    <div className="p-10 text-center text-gray-500 text-sm">No users found</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-white relative ${!selectedConversation ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
                {selectedConversation ? (
                    <>
                        {/* Chat Header */}
                        <div className="h-[60px] border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-10 bg-white">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedConversation(null)} className="md:hidden mr-2 p-1"><FaChevronLeft size={18} /></button>
                                <div className="relative cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
                                    <div className="w-[36px] h-[36px] rounded-full p-[1px] border border-gray-100 overflow-hidden">
                                        <img src={getAppUrl(getOther(selectedConversation)?.profilePic) || `https://ui-avatars.com/api/?name=${getOther(selectedConversation)?.username}`} className="w-full h-full rounded-full object-cover" alt="" />
                                    </div>
                                    {onlineUsers.has(getOther(selectedConversation)?._id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />}
                                </div>
                                <div className="cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
                                    <p className="text-[14px] font-bold tracking-tight">{getOther(selectedConversation)?.username || 'User'}</p>
                                    <p className="text-[11px] text-gray-400 -mt-1">{onlineUsers.has(getOther(selectedConversation)?._id) ? 'Active now' : 'Seen some time ago'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-gray-900">
                                <FaGhost size={18} className={`cursor-pointer transition-colors ${vanishMode ? 'text-indigo-500' : 'text-gray-400 hover:text-gray-600'}`} onClick={() => setVanishMode(!vanishMode)} />
                                <FaInfoCircle size={20} className="cursor-pointer hover:opacity-50 transition-opacity" onClick={() => setShowInfo(!showInfo)} />
                            </div>
                        </div>

                        {/* Messages List */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 py-6 space-y-1 no-scrollbar bg-white">
                            {messages.map((msg, i) => {
                                const isMine = (msg.sender?._id || msg.sender) === user?._id;
                                const showStatus = isMine && i === messages.length - 1;
                                const prevMsg = messages[i - 1];
                                const isGrouped = prevMsg && (prevMsg.sender?._id || prevMsg.sender) === (msg.sender?._id || msg.sender);
                                const isFirstInGroup = !prevMsg || (prevMsg.sender?._id || prevMsg.sender) !== (msg.sender?._id || msg.sender);

                                return (
                                    <div key={msg._id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}>
                                        {selectedConversation.isGroup && !isMine && isFirstInGroup && (
                                            <span className="text-[11px] text-gray-500 mb-0.5 ml-3 font-medium">
                                                {msg.sender?.username || 'User'}
                                            </span>
                                        )}
                                        <div className={`max-w-[70%] relative group`}>
                                            <div
                                                onDoubleClick={() => handleReaction(msg._id, '❤️')}
                                                className={`p-3 px-4 text-[14px] leading-snug break-words cursor-pointer transition-transform active:scale-[0.98] select-none ${isMine
                                                    ? 'bg-[#0095f6] text-white rounded-[22px]'
                                                    : 'bg-[#efefef] text-[#262626] rounded-[22px]'
                                                    } ${isMine ? (isFirstInGroup ? 'rounded-tr-md' : 'rounded-r-md') : (isFirstInGroup ? 'rounded-tl-md' : 'rounded-l-md')}`}>
                                                {msg.media ? (
                                                    <div className="rounded-lg overflow-hidden my-1">
                                                        {msg.media.type === 'image' && <img src={getAppUrl(msg.media.url)} className="max-w-[250px] rounded-md shadow-sm" alt="" />}
                                                        {msg.media.type === 'video' && <video src={getAppUrl(msg.media.url)} controls className="max-w-[250px] rounded-md shadow-sm" />}
                                                        {msg.media.type === 'voice' && (
                                                            <div className="flex items-center gap-2 min-w-[200px] max-w-[300px] py-1">
                                                                <FaMicrophone size={14} className="flex-shrink-0 opacity-70" />
                                                                <audio src={msg.media.url} controls className="flex-1 h-8" style={{ maxHeight: '32px' }}>
                                                                    Your browser does not support the audio element.
                                                                </audio>
                                                            </div>
                                                        )}
                                                        {msg.media.type === 'story' && (
                                                            <div
                                                                className="relative w-[220px] aspect-[9/16] rounded-xl overflow-hidden border border-gray-100 shadow-xl bg-black group transform transition-transform hover:scale-[1.02] cursor-pointer"
                                                                onClick={() => setViewingStory({ ...msg.media, sender: msg.sender })}
                                                            >
                                                                {msg.media.url && (msg.media.url.match(/\.(mp4|webm|ogg)$/i) || msg.media.url.includes('upload')) ? (
                                                                    <video src={getAppUrl(msg.media.url)} className="w-full h-full object-cover" muted autoPlay loop />
                                                                ) : (
                                                                    <img src={getAppUrl(msg.media.url)} className="w-full h-full object-cover opacity-90" />
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                                                                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                                                    <div className="w-8 h-8 rounded-full border-2 border-[#0095f6] p-[1.5px] bg-white">
                                                                        <img src={getAppUrl(msg.media.thumbnail) || `https://ui-avatars.com/api/?name=Story`} className="w-full h-full rounded-full object-cover" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-white text-[12px] font-bold leading-none">Watch Story</span>
                                                                        <span className="text-white/60 text-[10px]">Tap to view</span>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
                                                                    <div className="w-full py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold text-center">
                                                                        View Story
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {msg.media.type === 'post' && (
                                                            <div
                                                                className="relative w-[220px] aspect-[4/5] rounded-xl overflow-hidden border border-gray-100 shadow-xl bg-black group transform transition-transform hover:scale-[1.02] cursor-pointer"
                                                                onClick={() => navigate('/')}
                                                            >
                                                                {msg.media.url && (msg.media.url.match(/\.(mp4|webm|ogg)$/i) || msg.media.url.includes('video')) ? (
                                                                    <video src={getAppUrl(msg.media.url)} className="w-full h-full object-cover" muted autoPlay loop />
                                                                ) : (
                                                                    <img src={getAppUrl(msg.media.url)} className="w-full h-full object-cover opacity-90" />
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                                                                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                                                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 p-[1.5px] bg-white">
                                                                        <img src={getAppUrl(msg.media.thumbnail) || `https://ui-avatars.com/api/?name=Post`} className="w-full h-full rounded-full object-cover" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-white text-[12px] font-bold leading-none">View Post</span>
                                                                        <span className="text-white/60 text-[10px]">Tap to open</span>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
                                                                    <div className="w-full py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold text-center">
                                                                        View Post
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {msg.media.type === 'reel' && (
                                                            <div
                                                                className="relative w-[220px] aspect-[9/16] rounded-xl overflow-hidden border border-gray-100 shadow-xl bg-black group transform transition-transform hover:scale-[1.02] cursor-pointer"
                                                                onClick={() => navigate(`/reels?id=${msg.media.refId}`)}
                                                            >
                                                                {msg.media.source === 'youtube' ? (
                                                                    <img src={getAppUrl(msg.media.thumbnail) || `https://img.youtube.com/vi/${msg.media.url}/maxresdefault.jpg`} className="w-full h-full object-cover opacity-90" />
                                                                ) : (
                                                                    <video src={getAppUrl(msg.media.url)} className="w-full h-full object-cover" muted autoPlay loop />
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
                                                                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                                                                    <div className="w-8 h-8 rounded-full border-2 border-red-500 p-[1.5px] bg-white">
                                                                        <img src={getAppUrl(msg.media.thumbnail) || `https://ui-avatars.com/api/?name=Reel`} className="w-full h-full rounded-full object-cover" />
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-white text-[12px] font-bold leading-none">Watch Reel</span>
                                                                        <span className="text-white/60 text-[10px]">Tap to play</span>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center">
                                                                    <div className="w-full py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold text-center">
                                                                        View Reel
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {msg.text && msg.media.type !== 'story' && msg.media.type !== 'reel' && <p className="mt-2 text-sm">{msg.text}</p>}
                                                    </div>
                                                ) : msg.text}
                                                {msg.isEdited && <span className="text-[10px] opacity-70 block text-right mt-1 italic">(edited)</span>}
                                            </div>

                                            {/* Edit/Delete Menu for all messages */}
                                            {isMine && (
                                                <div className={`absolute top-1/2 -translate-y-1/2 ${isMine ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                                                    <button
                                                        onClick={() => setMessageMenuOpen(messageMenuOpen === msg._id ? null : msg._id)}
                                                        className="text-gray-400 hover:text-gray-600 p-1"
                                                    >
                                                        <FaEllipsisH size={14} />
                                                    </button>

                                                    {messageMenuOpen === msg._id && (
                                                        <div className="absolute bottom-full mb-2 left-0 bg-white shadow-xl border border-gray-100 rounded-lg py-1 z-20 min-w-[80px]">
                                                            {!msg.media && (
                                                                <button
                                                                    onClick={() => handleEditMessage(msg)}
                                                                    className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2"
                                                                >
                                                                    <FaRegEdit size={12} /> Edit
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteMessage(msg._id)}
                                                                className="w-full px-4 py-1.5 text-left text-xs hover:bg-gray-50 text-red-500 flex items-center gap-2"
                                                            >
                                                                <FaTrash size={12} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {msg.reactions?.length > 0 && (
                                                <div className={`absolute -bottom-2 ${isMine ? 'right-2' : 'left-2'} bg-white shadow-sm border border-gray-100 rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 z-10 animate-fade-in-down`}>
                                                    {msg.reactions.slice(0, 3).map((r, i) => <span key={i}>{r.emoji}</span>)}
                                                </div>
                                            )}
                                            {showStatus && (
                                                <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1 opacity-80">
                                                    {msg.status === 'seen' ? 'Seen' : 'Delivered'}
                                                    {msg.status === 'seen' && <FaCheckDouble size={8} className="text-[#0095f6]" />}
                                                </div>
                                            )}
                                        </div>

                                        {/* Delete button for voice messages */}
                                        {msg.media?.type === 'voice' && isMine && (
                                            <button
                                                onClick={() => handleDeleteMessage(msg._id)}
                                                className="mt-1 text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1"
                                            >
                                                <FaTrash size={8} /> Delete
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {typingUsers[selectedConversation._id] && (
                                <div className="flex items-start mt-4 animate-pulse">
                                    <div className="p-3 bg-[#f0f0f0] rounded-2xl flex gap-1 items-center">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input or Request Actions */}
                        <div className="p-3 px-4 bg-white border-t border-gray-100">
                            {selectedConversation.isRequest && selectedConversation.requestedTo === user?._id ? (
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className="text-center space-y-1">
                                        <p className="text-[14px] font-bold">Accept message request from {getOther(selectedConversation)?.username}?</p>
                                        <p className="text-[12px] text-gray-500">If you accept, they'll be able to see when you've read the message.</p>
                                    </div>
                                    <div className="flex w-full gap-2 pt-2">
                                        <button onClick={handleToggleBlock} className="flex-1 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">Block</button>
                                        <button onClick={handleDeleteConversation} className="flex-1 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors">Delete</button>
                                        <button onClick={handleAcceptRequest} className="flex-1 py-2 text-sm font-bold text-[#0095f6] hover:bg-blue-50 rounded-xl transition-colors">Accept</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative flex flex-col">
                                    {editingMessage && (
                                        <div className="flex items-center justify-between bg-blue-50 p-2.5 px-4 rounded-t-[22px] border-x border-t border-blue-100 text-[12px]">
                                            <p className="text-blue-600 truncate">Editing message...</p>
                                            <FaTimes className="cursor-pointer text-blue-400" onClick={() => { setEditingMessage(null); setNewMessage(''); }} />
                                        </div>
                                    )}
                                    {replyingTo && (
                                        <div className="flex items-center justify-between bg-gray-50 p-2.5 px-4 rounded-t-[22px] border-x border-t border-gray-100 text-[12px]">
                                            <p className="text-gray-500 truncate">Replying to <span className="font-semibold">@{replyingTo.sender?.username}</span></p>
                                            <FaTimes className="cursor-pointer text-gray-400" onClick={() => setReplyingTo(null)} />
                                        </div>
                                    )}
                                    {user?.blockedUsers?.includes(getOther(selectedConversation)?._id) ? (
                                        <div className="flex items-center justify-center p-4 py-8 bg-gray-50 rounded-[22px] border border-gray-100">
                                            <div className="text-center">
                                                <p className="text-[14px] font-bold text-gray-900 mb-1">You blocked this account</p>
                                                <p className="text-[12px] text-gray-500 mb-4">You can't message them until you unblock them.</p>
                                                <button
                                                    onClick={handleToggleBlock}
                                                    className="bg-[#0095f6] text-white px-6 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
                                                >
                                                    Unblock
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`relative flex items-center min-h-[44px] border border-gray-200 ${replyingTo || editingMessage ? 'rounded-b-[22px]' : 'rounded-full'} px-4 gap-3 focus-within:border-gray-400 transition-all bg-white`}>
                                            <div className="relative">
                                                <FaRegSmile
                                                    size={24}
                                                    className={`cursor-pointer flex-shrink-0 transition-colors ${showEmojiPicker ? 'text-[#0095f6]' : 'text-gray-900'}`}
                                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                />
                                                {showEmojiPicker && (
                                                    <div
                                                        ref={emojiPickerRef}
                                                        className="absolute bottom-12 left-0 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in-down"
                                                        style={{ maxHeight: '400px' }}
                                                    >
                                                        <div className="flex flex-col h-full overflow-y-auto p-4 no-scrollbar">
                                                            <div className="mb-4">
                                                                <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Most popular</h4>
                                                                <div className="grid grid-cols-7 gap-1">
                                                                    {popularEmojis.map((emoji, idx) => (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => {
                                                                                setNewMessage(prev => prev + emoji);
                                                                                // setShowEmojiPicker(false); // keep open for multiple?
                                                                            }}
                                                                            className="text-2xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-gray-50 bg-white border-0 cursor-pointer flex items-center justify-center outline-none"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Smileys & people</h4>
                                                                <div className="grid grid-cols-7 gap-1">
                                                                    {smileyEmojis.map((emoji, idx) => (
                                                                        <button
                                                                            key={idx}
                                                                            onClick={() => {
                                                                                setNewMessage(prev => prev + emoji);
                                                                            }}
                                                                            className="text-2xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-gray-50 bg-white border-0 cursor-pointer flex items-center justify-center outline-none"
                                                                        >
                                                                            {emoji}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={handleTyping}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage({ text: newMessage });
                                                    }
                                                }}
                                                placeholder="Message..."
                                                className="flex-1 outline-none text-[14px] bg-transparent py-2.5"
                                            />
                                            {recordedAudio ? (
                                                <div className="flex items-center gap-3 flex-1">
                                                    <FaMicrophone size={14} className="text-red-500 flex-shrink-0" />
                                                    <audio src={audioPreviewUrl} controls className="flex-1 h-7" style={{ maxHeight: '28px' }} />
                                                    <FaTrash size={18} className="cursor-pointer text-gray-500 hover:text-red-500 transition-colors" onClick={handleDeleteVoice} />
                                                    <button onClick={handleSendVoice} className="text-[#0095f6] font-bold text-sm hover:text-blue-700 transition-colors">Send</button>
                                                </div>
                                            ) : newMessage && newMessage.trim() ? (
                                                <button onClick={() => handleSendMessage({ text: newMessage })} className="text-[#0095f6] font-bold text-sm hover:text-blue-700 transition-colors pr-1">Send</button>
                                            ) : (
                                                <div className="flex gap-4 text-gray-900 items-center flex-shrink-0">
                                                    {isRecording ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-red-500 text-[10px] font-bold uppercase tracking-wider animate-pulse">REC</span>
                                                            <FaStopCircle size={22} className="cursor-pointer text-red-500" onClick={stopRecording} />
                                                        </div>
                                                    ) : (
                                                        <FaMicrophone size={20} className="cursor-pointer hover:opacity-50" onClick={startRecording} />
                                                    )}
                                                    <FaRegImage size={22} className="cursor-pointer hover:opacity-50" onClick={() => fileInputRef.current?.click()} />
                                                    <FaRegHeart
                                                        size={22}
                                                        className="cursor-pointer hover:opacity-50 hover:text-red-500"
                                                        onClick={() => handleSendMessage({ text: '❤️' })}
                                                    />
                                                </div>
                                            )}
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-[350px]">
                        <div className="w-[100px] h-[100px] rounded-full border-[2px] border-black flex items-center justify-center mb-2">
                            <FaRegPaperPlane className="text-4xl translate-x-1 -translate-y-1 rotate-12" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold tracking-tight">Your Messages</h2>
                            <p className="text-gray-500 text-[14px] mt-1">Send private photos and messages to a friend or group.</p>
                        </div>
                        <button
                            onClick={() => setShowNewMessageModal(true)}
                            className="bg-[#0095f6] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-[#1877f2] transition-colors shadow-sm"
                        >
                            Send Message
                        </button>
                    </div>
                )}
            </div>

            {/* Info Sidebar Overlay */}
            {
                showInfo && selectedConversation && (
                    <div className="fixed md:static inset-0 z-40 bg-white w-full md:w-[300px] border-l border-gray-100 flex flex-col animate-fade-in-down shadow-xl md:shadow-none">
                        <div className="h-[60px] border-b border-gray-100 flex items-center justify-between px-5 sticky top-0 bg-white">
                            <span className="font-bold">Details</span>
                            <button onClick={() => setShowInfo(false)} className="md:hidden"><FaTimes /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
                            <section>
                                <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-5">Members</h4>
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate(`/profile/${getOther(selectedConversation)?.username}`)}>
                                    <div className="w-[48px] h-[48px] rounded-full p-[1px] border border-gray-100 overflow-hidden">
                                        <img src={getAppUrl(getOther(selectedConversation)?.profilePic) || `https://ui-avatars.com/api/?name=${getOther(selectedConversation)?.username}`} className="w-full h-full rounded-full object-cover group-hover:opacity-80 transition-opacity" alt="" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-[15px] font-bold block">{getOther(selectedConversation)?.username}</span>
                                        <span className="text-xs text-gray-500">View Profile</span>
                                    </div>
                                </div>
                            </section>
                            <section className="pt-8 border-t border-gray-100 space-y-4">
                                <button
                                    onClick={handleToggleMute}
                                    className={`w-full text-left font-bold text-[14px] flex items-center gap-3 p-3 rounded-xl transition-colors ${selectedConversation.mutedBy?.includes(user?._id) ? 'text-[#0095f6] bg-blue-50' : 'text-red-500 hover:bg-red-50'}`}
                                >
                                    <FaVolumeMute size={18} /> {selectedConversation.mutedBy?.includes(user?._id) ? 'Unmute' : 'Mute'} Notifications
                                </button>
                                {!selectedConversation.isRequest && !selectedConversation.isGroup && (
                                    <button
                                        onClick={handleToggleCategory}
                                        className="w-full text-left font-bold text-[14px] flex items-center gap-3 p-3 rounded-xl transition-colors text-gray-900 hover:bg-gray-50"
                                    >
                                        <FaInfoCircle size={18} className="text-gray-400" /> Move to {selectedConversation.category === 'primary' ? 'General' : 'Primary'}
                                    </button>
                                )}
                                {!selectedConversation.isGroup && (
                                    <button
                                        onClick={handleToggleBlock}
                                        className="w-full text-left text-red-500 text-[14px] font-bold flex items-center gap-3 hover:bg-red-50 p-3 rounded-xl transition-colors"
                                    >
                                        <FaBan size={18} /> {user?.blockedUsers?.includes(getOther(selectedConversation)?._id) ? 'Unblock' : 'Block'} {getOther(selectedConversation)?.username}
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteConversation}
                                    className="w-full text-left text-red-500 text-[14px] font-bold flex items-center gap-3 hover:bg-red-50 p-3 rounded-xl transition-colors"
                                >
                                    <FaTrash size={18} /> Delete Conversation
                                </button>
                            </section>
                        </div>
                    </div>
                )
            }

            {/* Story Viewer Overlay */}
            {
                viewingStory && (
                    <div className="fixed inset-0 z-[200] bg-black bg-opacity-95 flex items-center justify-center animate-fade-in" onClick={() => setViewingStory(null)}>
                        <div className="relative h-[98vh] aspect-[9/16] bg-black rounded-[20px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            {/* Progress Bar */}
                            <div className="absolute top-4 left-3 right-3 flex gap-1 z-30">
                                <div className="h-[2px] flex-1 bg-white/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white transition-all duration-100 ease-linear"
                                        style={{ width: `${videoProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Top Header Info */}
                            <div className="absolute top-8 left-4 right-4 flex justify-between items-center z-30">
                                <div className="flex items-center gap-2">
                                    <img src={getAppUrl(viewingStory.sender?.profilePic) || `https://ui-avatars.com/api/?name=${viewingStory.sender?.username || 'User'}`} className="w-8 h-8 rounded-full border border-white/20" />
                                    <div className="flex flex-col">
                                        <span className="text-white text-[13px] font-bold drop-shadow-lg">{viewingStory.sender?.username || 'User'}</span>
                                        <span className="text-white/60 text-[11px]">Shared Story</span>
                                    </div>
                                </div>
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

                            {/* Content */}
                            <div className="w-full h-full flex items-center justify-center">
                                {viewingStory.url.match(/\.(mp4|webm|ogg)$/i) || viewingStory.url.includes('upload') ? (
                                    <video
                                        src={getAppUrl(viewingStory.url)}
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        muted={isStoryMuted}
                                        onLoadedMetadata={(e) => setStoryDuration(e.target.duration || 5)}
                                        ref={el => {
                                            if (el) {
                                                (isStoryPaused || showStoryMenu) ? el.pause() : el.play();
                                            }
                                        }}
                                        onPlay={() => setIsStoryPaused(false)}
                                        onPause={() => setIsStoryPaused(true)}
                                    />
                                ) : (
                                    <img src={getAppUrl(viewingStory.url)} className="w-full h-full object-cover" alt="" />
                                )}
                            </div>

                            {/* Story Menu Modal */}
                            {showStoryMenu && (
                                <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowStoryMenu(false); setIsStoryPaused(false); }}>
                                    <div className="w-full m-4 bg-[#262626] rounded-xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                                        <button className="w-full py-3.5 text-center text-white text-[14px] font-semibold border-b border-[#363636] active:bg-white/5" onClick={() => { /* Report logic */ setShowStoryMenu(false); }}>
                                            Report
                                        </button>
                                        <button className="w-full py-3.5 text-center text-white text-[14px] font-semibold border-b border-[#363636] active:bg-white/5" onClick={() => { navigator.clipboard.writeText(viewingStory.url); setShowStoryMenu(false); }}>
                                            Copy Link
                                        </button>
                                        <button className="w-full py-3.5 text-center text-red-500 text-[14px] font-bold active:bg-white/5" onClick={() => { setShowStoryMenu(false); setIsStoryPaused(false); }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out forwards;
                }
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.2s ease-out forwards;
                }
            `}</style>
        </div >
    );
};

export default MessagesPage;
