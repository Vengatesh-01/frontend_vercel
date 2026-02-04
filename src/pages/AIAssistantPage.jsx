import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../utils/urlUtils';
import axios from 'axios';
import { FaArrowLeft, FaPaperPlane, FaRobot, FaTrash, FaUser } from 'react-icons/fa';

const AIAssistantPage = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    text: "Hello! I am your AI Assistant. How can I help you today?",
                    sender: 'ai',
                    timestamp: new Date().toISOString()
                }
            ]);
        }
    }, []);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            text: input.trim(),
            sender: 'user',
            timestamp: new Date().toISOString()
        };

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
                message: userMessage.text,
                history: history
            });

            const aiResponse = {
                id: (Date.now() + 1).toString(),
                text: data.response,
                sender: 'ai',
                timestamp: data.timestamp
            };

            setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = error.response?.data?.error || "I'm sorry, I'm having trouble connecting to my brain right now. Please try again.";
            setMessages(prev => [...prev, {
                id: 'error',
                text: `Error: ${errorMessage}`,
                sender: 'ai',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearChat = () => {
        setMessages([
            {
                id: 'welcome',
                text: "Chat cleared. How else can I help you?",
                sender: 'ai',
                timestamp: new Date().toISOString()
            }
        ]);
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm z-10 sticky top-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-700 dark:text-gray-300"
                    >
                        <FaArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <FaRobot size={22} />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900 dark:text-white text-base leading-tight">AI Assistant</h1>
                            <p className="text-xs text-green-500 font-medium">Online</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={clearChat}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Clear Conversation"
                >
                    <FaTrash size={16} />
                </button>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gray-50 dark:bg-zinc-950">
                <div className="max-w-3xl mx-auto space-y-6 pt-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${msg.sender === 'user'
                                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                    : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    }`}>
                                    {msg.sender === 'user' ? <FaUser size={12} /> : <FaRobot size={14} />}
                                </div>
                                <div className={`group relative p-3.5 rounded-2xl text-[14.5px] leading-relaxed shadow-sm transition-all hover:shadow-md ${msg.sender === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-zinc-800 rounded-tl-none'
                                    }`}>
                                    {msg.text}
                                    <div className={`text-[10px] mt-1.5 opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start animate-in fade-in duration-300">
                            <div className="flex gap-3 items-center">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                                    <FaRobot size={14} />
                                </div>
                                <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <span className="ml-2 text-xs text-gray-400 font-medium">AI is thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Area */}
            <footer className="p-4 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 sticky bottom-0">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message AI Assistant..."
                            className="flex-1 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white rounded-2xl px-5 py-3.5 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className={`absolute right-1.5 p-2.5 rounded-xl transition-all ${!input.trim() || isLoading
                                ? 'text-gray-300 dark:text-zinc-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95'
                                }`}
                        >
                            <FaPaperPlane size={18} />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-gray-400 mt-3 font-medium uppercase tracking-widest opacity-60">
                        AI ASSISTANT • POWERED BY REELIO
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default AIAssistantPage;
