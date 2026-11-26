// Resume upload: one PDF file, max 5 MB (multer handles multipart/form-data)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const AppError = require('../utils/AppError');

const UPLOAD_DIR = path.join(__dirname, '../../uploads/resumes');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const uploadResume = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.pdf`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(AppError.badRequest('Resume must be a PDF file')),
}).single('resume');

module.exports = { uploadResume, UPLOAD_DIR };
