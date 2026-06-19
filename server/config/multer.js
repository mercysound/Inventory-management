import multer from "multer";

// Use memory storage — files land in req.file.buffer / req.files[].buffer.
// This avoids any disk-path issues across platforms and works cleanly with
// Cloudinary's upload_stream API.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB per file
});

// Single image (legacy field name "image")
export const uploadSingle = upload.single("image");

// Up to 5 product images sent as the "images" field from multipart form
export const uploadProductImages = upload.array("images", 5);
