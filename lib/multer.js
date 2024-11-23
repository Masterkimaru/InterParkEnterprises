import multer from 'multer';
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import path from 'path'; // Import path module

// Configure AWS SDK for DigitalOcean Spaces
const s3 = new S3Client({
    region: process.env.DO_SPACES_REGION, // e.g., "blr1"
    endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`, // e.g., "https://blr1.digitaloceanspaces.com"
    forcePathStyle: true, // Ensure path-style addressing
    credentials: {
        accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
    },
});


// Configure Multer with multer-s3 for Spaces
const upload = multer({
    storage: multerS3({
        s3,
        bucket: process.env.DO_SPACES_BUCKET_NAME,
        acl: 'public-read', // Make files publicly readable
        key: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `Propertypic/${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
    }),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images are allowed.'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

export default upload;
