import React from 'react';
import { BACKEND_URL } from '../utils/urlUtils';

const GamingPage = () => {
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasError, setHasError] = React.useState(false);

    // Use relative path for Vercel/Static serving from 'public/gaming-hub'
    // This bypasses the backend 500 error and ensures the latest files are served directly by Vercel
    const gamingUrl = "/gaming-hub/";

    return (
        <div className="w-full h-screen bg-[#0f172a] overflow-hidden flex flex-col items-center justify-center">
            <div className="flex-1 w-full h-full relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] z-10">
                        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 text-sm animate-pulse">Connecting to Gaming Hub...</p>
                    </div>
                )}

                {hasError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] text-white z-20 p-6 text-center">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                            <span className="text-4xl">🎮</span>
                        </div>
                        <p className="text-xl font-bold mb-2">Gaming Hub is not responding</p>
                        <p className="text-sm text-gray-400 mb-8 max-w-xs">This might be due to connection issues or app restrictions.</p>

                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 bg-red-600 rounded-xl hover:bg-red-700 transition font-bold shadow-lg shadow-red-600/20"
                            >
                                Retry Connection
                            </button>

                            <a
                                href={gamingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3 bg-white/10 rounded-xl hover:bg-white/20 transition font-semibold"
                            >
                                Open in Browser
                            </a>
                        </div>
                    </div>
                ) : (
                    <iframe
                        src={gamingUrl}
                        title="Gaming Hub"
                        className="w-full h-full border-none"
                        allow="autoplay; fullscreen; pointer-lock; accelerometer; gyroscope; payment; camera; microphone; clipboard-read; clipboard-write; web-share"
                        onLoad={() => {
                            console.log("Gaming Hub Iframe Loaded");
                            setIsLoading(false);
                            setHasError(false);
                        }}
                        onError={(e) => {
                            console.error("Gaming Hub Load Error", e);
                            setIsLoading(false);
                            setHasError(true);
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default GamingPage;
