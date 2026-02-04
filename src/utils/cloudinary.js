import axios from 'axios';
import { BACKEND_URL } from './urlUtils';

import { compressImage } from './imageQuality';

/**
 * Uploads a file directly to Cloudinary from the client.
 * @param {File} file - The file to upload.
 * @param {string} token - The user's authentication token.
 * @param {Function} onProgress - Optional callback for upload progress.
 * @returns {Promise<Object>} - The Cloudinary response data.
 */
export const uploadToCloudinary = async (file, token, onProgress) => {
    const API_BASE = BACKEND_URL;

    // Compress if it's an image
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
    }

    // 1. Get signature from backend
    const { data: config } = await axios.get(`${API_BASE}/api/upload/signature`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // 2. Prepare FormData for Cloudinary
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('api_key', config.apiKey);
    formData.append('timestamp', config.timestamp);
    formData.append('signature', config.signature);
    formData.append('folder', config.folder);

    // 3. Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`;

    const response = await axios.post(cloudinaryUrl, formData, {
        onUploadProgress: (progressEvent) => {
            if (onProgress) {
                const percent = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
                onProgress(percent);
            }
        }
    });

    return {
        filePath: response.data.secure_url,
        fileName: response.data.original_filename,
        publicId: response.data.public_id
    };
};
