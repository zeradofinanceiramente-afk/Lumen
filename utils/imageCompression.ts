
import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file on the client side before upload.
 * Optimizes for Firebase Storage (Spark plan) by converting to WebP and reducing size.
 */
export const compressImage = async (file: File): Promise<File> => {
    // If it's not an image, return original
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Requirement: Do not compress if smaller than 50KB (50 * 1024 bytes)
    if (file.size <= 51200) {
        console.log(`Skipping compression for ${file.name} (Size: ${(file.size / 1024).toFixed(2)} KB <= 50KB)`);
        return file;
    }

    const options = {
        maxSizeMB: 0.5, // Max 500KB target (soft limit)
        maxWidthOrHeight: 1920, // Full HD max
        useWebWorker: true,
        fileType: 'image/webp', // Modern format, smaller size
        initialQuality: 0.7
    };

    try {
        console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
        const compressedFile = await imageCompression(file, options);
        
        // Safety check for 0-byte files or failed compression
        if (compressedFile.size === 0) {
            console.warn("Compression resulted in 0 bytes. Using original file.");
            return file;
        }

        // Additional check: If compression somehow made it larger or smaller than the hard floor (unlikely but safe), 
        // strictly speaking we just return the compressed one, but if we want to enforce "don't reduce TO less than 50kb" 
        // implies quality control. Usually, smaller is better, but if the user meant "don't compress small files", 
        // the first check covers it.
        
        console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
        return compressedFile;
    } catch (error) {
        console.error("Image compression failed:", error);
        // Return original file as fallback if compression fails
        return file;
    }
};
