export const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "https://reelio.onrender.com").replace(/\/+$/, '');

/**
 * Normalizes a URL by prefixing local paths with the backend URL.
 * Handles both absolute URLs and relative paths starting with /uploads.
 * @param {string} url - The URL or path to normalize.
 * @param {string} fallback - Optional fallback URL if the input is missing.
 * @returns {string} The normalized URL.
 */
export const getAppUrl = (url, fallback = '') => {
    if (!url) return fallback;

    // If it's a blob URL (for local preview), return as is
    if (url.startsWith('blob:')) {
        return url;
    }

    // If it's a YouTube URL or already an external absolute URL we want to keep, return it
    if (url.startsWith('http')) {
        // Explicitly check for Cloudinary or other external storage
        if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
            return url;
        }
        if (!url.includes('localhost') && !url.includes('reelio.onrender.com') && !url.includes('ngrok-free.dev')) {
            return url;
        }
    }

    // Convert absolute localhost, known production URLs, OR Windows local paths to relative paths
    let path = url;

    // Handle Windows absolute paths (e.g., C:\Users\... or C:/Users/...), BUT ignore if it looks like a URL
    const isWindowsPath = (url.match(/^[a-zA-Z]:[\\\/]/) || url.toLowerCase().includes('uploads/') || url.toLowerCase().includes('uploads\\')) && !url.startsWith('http');

    if (isWindowsPath) {
        // Normalize all slashes to / for easier splitting
        const normalizedUrl = url.replace(/\\/g, '/');
        const parts = normalizedUrl.split('/');

        // Find 'uploads' regardless of case
        const uploadIndex = parts.findIndex(p => p.toLowerCase() === 'uploads');

        if (uploadIndex !== -1 && uploadIndex < parts.length - 1) {
            path = '/uploads/' + parts.slice(uploadIndex + 1).join('/');
        } else {
            // Fallback: take the last segment if it looks like a file
            const lastPart = parts[parts.length - 1];
            path = '/uploads/' + lastPart;
        }
    } else if (url.startsWith('http')) {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'localhost' || urlObj.hostname.includes('reelio.onrender.com') || urlObj.hostname.includes('ngrok-free.dev') || urlObj.hostname === '10.240.89.247') {
                path = urlObj.pathname + urlObj.search;
            }
        } catch (e) {
            path = url.replace(/^https?:\/\/[^\/]+/, '');
        }
    }

    // Ensure it starts with / and normalize slashes
    path = path.replace(/\\/g, '/');
    if (!path.startsWith('/')) path = '/' + path;

    // Reject non-resolvable paths (like Windows absolute paths that couldn't be converted)
    if (path.match(/^[a-zA-Z]:/) || path === '/') {
        console.warn(`[getAppUrl] Non-resolvable path detected: ${url}`);
        return fallback;
    }

    // If it looks like an uploaded file (starts with /file-) but missing /uploads/, add it
    if (path.startsWith('/file-') && !path.startsWith('/uploads/')) {
        path = '/uploads' + path;
    }

    // Avoid double /
    path = path.replace(/\/+/g, '/');

    // Return the full URL pointing to the backend
    return `${BACKEND_URL}${path}`;
};

export default getAppUrl;
