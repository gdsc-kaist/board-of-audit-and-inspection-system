import multer from 'multer';

const memoryStorage = multer.memoryStorage();
const limits = {
    fileSize: 10 * 1024 * 1024, // 10MB
};
const allowedFileTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/pdf',
];

const fileTypeFilter = (req: any, file: any, cb: any) => {
    if (allowedFileTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
const upload = multer({
    storage: memoryStorage,
    limits: limits,
    fileFilter: fileTypeFilter,
});

export { upload };
