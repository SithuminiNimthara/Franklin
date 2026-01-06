import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// ✅ Use this for upload endpoints
export function uploadSingleFile(req, res, next) {
  const single = upload.single("file");

  single(req, res, (err) => {
    if (err) {
      console.error("MULTER ERROR:", err);

      return res.status(400).json({
        detail: err.message || "multer failed parsing multipart body",
        multer: {
          name: err.name,
          code: err.code,
          field: err.field,
        },
      });
    }

    next();
  });
}
