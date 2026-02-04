import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../utils/urlUtils';
import { FaRobot, FaPaperPlane, FaTimes, FaChevronUp, FaChevronDown } from 'react-icons/fa';

const AIChatOverlay = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [messages, isOpen, isMinimized]);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    sender: 'ai',
                    text: "Hello! I am your AI Assistant. How can I help you today?"
                }
            ]);
        }
    }, []);

    const toggleChat = () => {
        setIsOpen(!isOpen);
        setIsMinimized(false);
    };

    const toggleMinimize = (e) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input.trim();
        const userMessage = { sender: 'user', text: userText };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare history for context
            const history = messages.slice(-10).map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }));

            const { data } = await axios.post(`${BACKEND_URL}/api/ai/chat`, {
                message: userText,
                history: history
            });

            const aiMessage = {
                sender: 'ai',
                text: data.response
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = error.response?.data?.error || "I'm sorry, I'm having trouble connecting to the server. Please check your connection.";
            setMessages(prev => [...prev, {
                sender: 'ai',
                text: `Error: ${errorMessage}`
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={toggleChat}
                className="fixed bottom-5 right-5 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all z-50 hover:scale-110"
                title="Chat with AI"
            >
                <FaRobot size={24} />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-5 right-5 w-80 md:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 z-50 border border-gray-200 dark:border-zinc-800 ${isMinimized ? 'h-14' : 'h-[500px]'}`}>
            {/* Header */}
            <div
                onClick={() => isMinimized ? setIsMinimized(false) : null}
                className={`bg-indigo-600 p-4 flex items-center justify-between cursor-pointer ${isMinimized ? 'h-full' : ''}`}
            >
                <div className="flex items-center gap-2 text-white font-bold">
                    <FaRobot />
                    <span>AI Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMinimize}
                        className="text-white/80 hover:text-white p-1 rounded hover:bg-indigo-500/50 transition-colors"
                    >
                        {isMinimized ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
                    </button>
                    <button
                        onClick={toggleChat}
                        className="text-white/80 hover:text-white p-1 rounded hover:bg-indigo-500/50 transition-colors"
                    >
                        <FaTimes size={14} />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-zinc-950">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.sender === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-zinc-700 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-gray-100 dark:bg-zinc-950 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none text-gray-900 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`p-2 rounded-xl transition-all ${!input.trim() || isLoading
                                ? 'text-gray-400 bg-gray-100 dark:bg-zinc-800'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                }`}
                        >
                            <FaPaperPlane size={14} />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};

export default AIChatOverlay;
