import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, done) =>
    done(null, /^(image\/|application\/pdf)/.test(file.mimetype))
});

export default upload;
