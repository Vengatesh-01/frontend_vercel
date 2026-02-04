import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { FaFacebook } from 'react-icons/fa';

const RegisterPage = () => {
    const [username, setUsername] = useState('');
    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(username, fullname, email, password);
            navigate('/');
        } catch (error) {
            console.error('Registration Error:', error);
            const message = error.response?.data?.message || 'Registration failed. Please check your backend server.';
            alert(message);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-[350px] space-y-3">
                <div className="bg-white border border-gray-200 p-10 flex flex-col items-center">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 mb-4 font-display tracking-tight">
                        REELIO
                    </h1>
                    <h2 className="text-gray-500 font-bold text-base text-center mb-6 leading-tight">Sign up to see photos and videos from your friends.</h2>

                    <button type="button" className="flex items-center justify-center gap-2 w-full bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm py-1.5 rounded-lg mb-4">
                        <FaFacebook size={18} /> Log in with Facebook
                    </button>

                    <div className="relative py-4 w-full">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                        <div className="relative flex justify-center text-xs px-4 bg-white text-gray-400 font-bold uppercase tracking-wider">OR</div>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-2">
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={fullname}
                            onChange={(e) => setFullname(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Username"
                            className="w-full px-2 py-2.5 rounded-sm bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all placeholder-gray-400"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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

                        <p className="text-[10px] text-gray-500 text-center py-2 leading-tight">
                            People who use our service may have uploaded your contact information to Instagram. <a href="#" className="font-bold">Learn More</a>
                        </p>

                        <button
                            type="submit"
                            className="w-full py-1.5 rounded-lg bg-[#0095f6] hover:bg-[#1877f2] text-white font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
                        >
                            Sign Up
                        </button>
                    </form>
                </div>

                <div className="bg-white border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600">
                        Have an account? <Link to="/login" className="font-semibold text-[#0095f6] hover:text-[#1877f2] transition-colors">Log in</Link>
                    </p>
                </div>

                <div className="text-center pt-2">
                    <p className="text-sm text-gray-800 mb-4">Get the app.</p>
                    <div className="flex justify-center gap-2">
                        <div className="bg-black text-white px-4 py-1.5 rounded-md text-xs font-bold w-32 border border-gray-800 cursor-not-allowed opacity-80 text-center">App Store</div>
                        <div className="bg-black text-white px-4 py-1.5 rounded-md text-xs font-bold w-32 border border-gray-800 cursor-not-allowed opacity-80 text-center">Google Play</div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-400 flex flex-wrap justify-center gap-4 max-w-2xl px-4">
                <span>Meta</span><span>About</span><span>Blog</span><span>Jobs</span><span>Help</span><span>API</span><span>Privacy</span><span>Terms</span><span>Locations</span><span>REELIO Lite</span><span>Threads</span>
            </div>
            <div className="mt-4 text-xs text-gray-400">© 2026 REELIO</div>
        </div >
    );
};

export default RegisterPage;
