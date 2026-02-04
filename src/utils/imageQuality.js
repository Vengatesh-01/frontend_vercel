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
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
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
                        // Create a new file from the blob
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });

                        // Return the smaller one
                        resolve(compressedFile.size < file.size ? compressedFile : file);
                    },
                    'image/jpeg',
                    options.quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};
