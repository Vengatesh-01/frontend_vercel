import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../utils/urlUtils';

const AuthContext = createContext();

const API_BASE = BACKEND_URL;

// Bypasses Ngrok browser warning and adds auth headers globally
axios.interceptors.request.use(config => {
    // Check if the request is for our backend
    const isBackendRequest = config.url && (config.url.startsWith(API_BASE) || config.url.startsWith('/') || config.url.includes('localhost') || config.url.includes('ngrok') || config.url.includes('reelio'));

    if (isBackendRequest) {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Critical for Ngrok and LocalTunnel mobile testing
        config.headers['ngrok-skip-browser-warning'] = '69420';
        config.headers['bypass-tunnel-reminder'] = 'true';
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// Helper for debugging production 500s
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 500) {
            console.error('CRITICAL 500 ERROR:', error.response.data);
            // Optionally we could show a more detailed alert if in a specific mode, 
            // but for now we'll just log it. 
        }
        return Promise.reject(error);
    }
);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [lastCheck, setLastCheck] = useState(0);

    const checkUserLoggedIn = async (force = false) => {
        const now = Date.now();
        // Skip check if it's been less than 5 minutes since the last one, 
        // unless we force it or the user state is missing.
        if (!force && user && (now - lastCheck < 300000)) {
            setLoading(false);
            return;
        }

        const token = localStorage.getItem('token');
        if (token) {
            try {
                const { data } = await axios.get(`${API_BASE}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                });
                setUser(data);
                setLastCheck(now);
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                setUser(null);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const login = async (email, password) => {
        const { data } = await axios.post(`${API_BASE}/api/auth/login`, { email, password }, { timeout: 30000 });
        localStorage.setItem('token', data.token);
        setUser(data);
    };

    const register = async (username, fullname, email, password) => {
        const { data } = await axios.post(`${API_BASE}/api/auth/register`, { username, fullname, email, password }, { timeout: 30000 });
        localStorage.setItem('token', data.token);
        setUser(data);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, checkUserLoggedIn }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
