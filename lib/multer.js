// lib/multer.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure 'uploads' directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'Propertypic');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Save uploads in the 'Propertypic' folder
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter: only allow images
const fileFilter = (req, file, cb) => {
    console.log('Received file type:', file.mimetype); // Debugging
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export default upload;
