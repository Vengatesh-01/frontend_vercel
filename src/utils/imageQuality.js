/**
 * Compresses an image file using the Canvas API.
 * @param {File} file - The image file to compress.
 * @param {Object} options - Compression options.
 * @param {number} options.maxWidth - Maximum width of the compressed image.
 * @param {number} options.maxHeight - Maximum height of the compressed image.
 * @param {number} options.quality - Quality of the compressed image (0 to 1).
 * @returns {Promise<File|Blob>} - The compressed image file or the original if compression fails/isn't needed.
 */
export const compressImage = async (file, options = { maxWidth: 1200, maxHeight: 1200, quality: 0.7 }) => {
    // Only compress images
    if (!file.type.startsWith('image/')) return file;

    // Don't compress small GIFs as it would lose animation
    if (file.type === 'image/gif') return file;

    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
            URL.revokeObjectURL(url); // Clean up memory
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > height) {
                if (width > options.maxWidth) {
                    height *= options.maxWidth / width;
                    width = options.maxWidth;
                }
            } else {
                if (height > options.maxHeight) {
                    width *= options.maxHeight / height;
                    height = options.maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    // Return the smaller one. Keep it as a blob if smaller.
                    // The caller will handle filename extension if needed.
                    resolve(blob.size < file.size ? blob : file);
                },
                'image/jpeg',
                options.quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
    });
};
