import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaFacebook, FaGoogle } from 'react-icons/fa';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (error) {
            console.error('Login Error:', error);
            let message = 'Login failed.';
            if (error.response) {
                // The server responded with a status code that falls out of the range of 2xx
                message = error.response.data?.message || `Server Error: ${error.response.status}`;
            } else if (error.request) {
                // The request was made but no response was received
                message = 'No response from server. Is the backend running?';
            } else {
                // Something happened in setting up the request that triggered an Error
                message = error.message;
            }
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[350px] space-y-3">
                {/* Main Login Box */}
                <div className="bg-white border border-gray-200 p-10 flex flex-col items-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 mb-8 font-display tracking-tight">
                        REELIO
                    </h1>

                    <form onSubmit={handleSubmit} className="w-full space-y-2">
                        <input
                            type="email"
                            placeholder="Phone number, username, or email"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <button
                            type="submit"
                            className="w-full py-1.5 mt-2 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
                        >
                            Log In
                        </button>



                        <div className="text-center mt-4">
                            <Link to="/forgot-password" title='Click To Reset Password' className="text-xs text-[#00376b]">Forgot password?</Link>
                        </div>

                    </form>
                </div>

                {/* Switch to Register Box */}
                <div className="bg-white border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account? <Link to="/register" className="font-semibold text-[#0095f6] hover:text-[#1877f2] transition-colors">Sign up</Link>
                    </p>
                </div>

                {/* App Links Placeholder */}
                <div className="text-center pt-2">
                    <p className="text-sm text-gray-800 mb-4">Get the app.</p>
                    <div className="flex justify-center gap-2">
                        <div className="bg-black text-white px-4 py-1.5 rounded-md text-xs font-bold w-32 border border-gray-800 cursor-not-allowed opacity-80">App Store</div>
                        <div className="bg-black text-white px-4 py-1.5 rounded-md text-xs font-bold w-32 border border-gray-800 cursor-not-allowed opacity-80">Google Play</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-20 text-center text-xs text-gray-400 flex flex-wrap justify-center gap-4 max-w-2xl">
                <span>About</span><span>Blog</span><span>Jobs</span><span>Help</span><span>API</span><span>Privacy</span><span>Terms</span><span>Locations</span><span>REELIO Lite</span><span>Threads</span>
            </div>
            <div className="mt-4 text-xs text-gray-400">© 2026 REELIO</div>
            bitumen
        </div>
    );
};

export default LoginPage;
