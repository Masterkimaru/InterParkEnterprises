// libs/propertyMulter.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure 'Propertypic' directory exists
const propertyUploadsDir = path.join(process.cwd(), 'Propertypic');
if (!fs.existsSync(propertyUploadsDir)) {
    fs.mkdirSync(propertyUploadsDir, { recursive: true });
}

// Configure storage for uploaded property images
const propertyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, propertyUploadsDir); // Save uploads in the 'Propertypic' folder
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter: only allow images
const propertyFileFilter = (req, file, cb) => {
    console.log('Received file type:', file.mimetype); // Debugging
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed for properties.'), false);
    }
};

const propertyUpload = multer({
    storage: propertyStorage,
    fileFilter: propertyFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export default propertyUpload;
