import { useState } from 'react';
import AuthContext from '../context/AuthContext';
import { BACKEND_URL } from '../utils/urlUtils';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const ResetPasswordPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');

        try {
            const res = await axios.post(`${BACKEND_URL}/api/auth/reset-password/${token}`, { password });
            setMessage('Password has been reset successfully. Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired token. Please request a new one.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[350px] space-y-3">
                <div className="bg-white border border-gray-200 p-8 flex flex-col items-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 mb-8 font-display tracking-tight">
                        REELIO
                    </h1>

                    <h2 className="font-semibold text-gray-900 mb-6 text-center">Create a New Password</h2>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <input
                            type="password"
                            placeholder="New Password"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <input
                            type="password"
                            placeholder="Confirm New Password"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-1.5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>

                        {message && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 leading-relaxed text-center">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700 leading-relaxed text-center">
                                {error}
                            </div>
                        )}
                    </form>
                </div>

                <div className="bg-white border border-gray-200 p-4 text-center">
                    <Link to="/login" className="text-sm font-semibold text-gray-900 hover:text-gray-500 transition-colors">
                        Back to Login
                    </Link>
                </div>
            </div>

            <div className="mt-20 text-center text-xs text-gray-400">© 2026 REELIO</div>
        </div>
    );
};

export default ResetPasswordPage;
