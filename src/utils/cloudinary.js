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
    try {
        console.log(`[Cloudinary] Fetching signature from: ${API_BASE}/api/upload/signature`);
        const { data: config } = await axios.get(`${API_BASE}/api/upload/signature`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!config || !config.cloudName || !config.signature) {
            console.error('[Cloudinary] Invalid signature configuration received:', config);
            throw new Error('Invalid upload configuration from server');
        }

        console.log(`[Cloudinary] Signature received for cloud: ${config.cloudName}`);

        // 2. Prepare FormData for Cloudinary
        const formData = new FormData();
        // If it's a blob, we need to provide a filename for Cloudinary to detect file extension
        if (fileToUpload instanceof Blob && !(fileToUpload instanceof File)) {
            formData.append('file', fileToUpload, file.name || 'upload.jpg');
        } else {
            formData.append('file', fileToUpload);
        }

        formData.append('api_key', config.apiKey);
        formData.append('timestamp', config.timestamp);
        formData.append('signature', config.signature);
        formData.append('folder', config.folder);

        // 3. Upload to Cloudinary
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`;
        console.log(`[Cloudinary] Uploading to: ${cloudinaryUrl}`);

        const response = await axios.post(cloudinaryUrl, formData, {
            onUploadProgress: (progressEvent) => {
                if (onProgress) {
                    const percent = progressEvent.total ? Math.round((progressEvent.loaded * 100) / progressEvent.total) : 0;
                    onProgress(percent);
                }
            }
        });

        console.log('[Cloudinary] Upload successful:', response.data.secure_url);

        return {
            filePath: response.data.secure_url,
            fileName: response.data.original_filename,
            publicId: response.data.public_id
        };
    } catch (error) {
        console.error('Cloudinary upload failure details:', {
            message: error.message,
            code: error.code,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url
        });

        // Differentiate between connectivity issues and auth issues
        if (error.response?.status === 401) {
            throw new Error('Your session has expired. Please log out and log back in to upload.');
        }

        if (error.code === 'ERR_NETWORK') {
            throw new Error(`Connection failed. Please check if the backend at ${API_BASE} is reachable and that you aren't using an ad-blocker.`);
        }

        throw new Error(error.response?.data?.message || error.message || 'Upload failed due to a server error.');
    }
};
