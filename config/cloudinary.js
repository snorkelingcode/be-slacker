const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'slacker',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'mp3', 'mkv', 'wav'],
        resource_type: 'auto',
        transformation: []
    }
});

// Configure Multer
const uploadMiddleware = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 1 // Only allow one file per request
    }
}).single('file');

// Export the configuration
module.exports = {
    cloudinary,
    uploadMiddleware  // Export uploadMiddleware directly
};