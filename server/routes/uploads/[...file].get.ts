import fs from "node:fs";
import path from "node:path";
import { defineEventHandler, createError, setHeader, sendStream } from "h3";

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export default defineEventHandler(async (event) => {
  // 1. Get filepath after /uploads/
  const filepath = getRouterParam(event, "file");
  if (!filepath) {
    throw createError({ statusCode: 400, message: "Thiếu tên file" });
  }

  // 2. Map path to root /uploads/ folder
  const uploadDir = path.resolve(process.cwd(), "uploads");
  const fullPath = path.resolve(uploadDir, filepath);

  // 3. Security check: ensure resolved path is strictly inside uploads folder
  const relativePath = path.relative(uploadDir, fullPath);
  const isPathTraversal =
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath);

  if (isPathTraversal) {
    throw createError({ statusCode: 403, message: "Hành vi bị cấm" });
  }

  // 4. Return file if exists
  if (fs.existsSync(fullPath)) {
    const ext = path.extname(fullPath).toLowerCase();
    const mimeType = MIME_MAP[ext] || "application/octet-stream";
    setHeader(event, "Content-Type", mimeType);
    setHeader(event, "X-Content-Type-Options", "nosniff");
    setHeader(
      event,
      "Content-Disposition",
      MIME_MAP[ext]
        ? "inline"
        : `attachment; filename="${path.basename(fullPath)}"`
    );
    return sendStream(event, fs.createReadStream(fullPath));
  } else {
    throw createError({ statusCode: 404, message: "Ảnh không tồn tại" });
  }
});
