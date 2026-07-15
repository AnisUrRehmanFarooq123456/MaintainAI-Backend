import multer from "multer";

// Keep files in memory (not on disk) — we stream them straight to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per file
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only image (jpg, png, webp, gif) or mp4 video files are allowed"));
        }
    },
});

export default upload;