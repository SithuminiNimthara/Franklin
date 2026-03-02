import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";

// temp folder for videos
const TMP_DIR = path.join(os.tmpdir(), "franklin_uploads");

// ensure tmp dir exists
function ensureTmpDir() {
  try {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  } catch {}
}

// ----------------------------
// 1) SMALL FILES (images) in RAM
// ----------------------------
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // ✅ 15MB (images)
});

// ----------------------------
// 2) LARGE FILES (videos) on DISK
// ----------------------------
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureTmpDir();
    cb(null, TMP_DIR);
  },
  filename: (req, file, cb) => {
    const safe = String(file.originalname || "video.mp4").replace(
      /[^\w.\-]/g,
      "_",
    );
    cb(null, `${Date.now()}_${safe}`);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // ✅ 500MB (change if needed)
  fileFilter: (req, file, cb) => {
    // accept only video/*
    if (file.mimetype && file.mimetype.startsWith("video/"))
      return cb(null, true);
    cb(new Error("Only video files are allowed (video/*)"));
  },
});

// ----------------------------
// Helpers to send nice errors
// ----------------------------
function handleMulterError(err, res) {
  const isTooLarge = err?.code === "LIMIT_FILE_SIZE";

  return res.status(isTooLarge ? 413 : 400).json({
    detail: isTooLarge
      ? "File too large. Please upload a smaller video or increase server limit."
      : err.message || "multer failed parsing multipart body",
    multer: {
      name: err?.name,
      code: err?.code,
      field: err?.field,
    },
  });
}

// ----------------------------
// ✅ Use this for IMAGE endpoints
// ----------------------------
export function uploadSingleImage(req, res, next) {
  const single = uploadImage.single("file");
  single(req, res, (err) => {
    if (err) {
      console.error("MULTER IMAGE ERROR:", err);
      return handleMulterError(err, res);
    }
    next();
  });
}

// ----------------------------
// ✅ Use this for VIDEO endpoints
// ----------------------------
export function uploadSingleVideo(req, res, next) {
  const single = uploadVideo.single("file");
  single(req, res, (err) => {
    if (err) {
      console.error("MULTER VIDEO ERROR:", err);
      return handleMulterError(err, res);
    }
    next();
  });
}

// ----------------------------
// Backward compatible (your old name)
// If you want: keep uploadSingleFile for images
// ----------------------------
export const uploadSingleFile = uploadSingleImage;
