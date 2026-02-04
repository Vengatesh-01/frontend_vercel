import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { BACKEND_URL } from '../utils/urlUtils';
import axios from 'axios';
import { FaChevronLeft, FaLock } from 'react-icons/fa';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/forgot-password`, { email });
            setMessage(res.data.message);
            // In a real app we wouldn't show the URL, but for testing we will log it or show it if available
            if (res.data.resetUrl) {
                console.log('Reset URL:', res.data.resetUrl);
                setMessage(`${res.data.message}. For testing purposes, the link is logged in the console and also here: ${res.data.resetUrl}`);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[350px] space-y-3">
                <div className="bg-white border border-gray-200 p-8 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center mb-4">
                        <FaLock className="text-4xl" />
                    </div>

                    <h2 className="font-semibold text-gray-900 mb-2">Trouble logging in?</h2>
                    <p className="text-sm text-gray-500 text-center mb-6">
                        Enter your email and we'll send you a link to get back into your account.
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-1.5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Login Link'}
                        </button>

                        {message && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 leading-relaxed">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 leading-relaxed text-center">
                                {error}
                            </div>
                        )}
                    </form>

                    <div className="flex items-center w-full my-4">
                        <div className="flex-1 border-b border-gray-200"></div>
                        <span className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR</span>
                        <div className="flex-1 border-b border-gray-200"></div>
                    </div>

                    <Link to="/register" className="text-sm font-semibold text-gray-900 hover:text-gray-500 transition-colors">
                        Create New Account
                    </Link>
                </div>

                <div className="bg-white border border-gray-200 p-4 text-center">
                    <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 hover:text-gray-500 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>

            <div className="mt-20 text-center text-xs text-gray-400">© 2026 REELIO</div>
        </div>
    );
};

export default ForgotPasswordPage;
