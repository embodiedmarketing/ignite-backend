import multer from "multer";

/**
 * Multer middleware for file uploads
 * Configured for memory storage with 10MB limit
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

