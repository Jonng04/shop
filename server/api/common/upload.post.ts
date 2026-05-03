import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_UPLOADS_PER_WINDOW = 20;
const UPLOAD_WINDOW_MS = 10 * 60 * 1000;

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".txt",
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
]);

interface UploadRateLimitState {
  count: number;
  expiresAt: number;
}

const uploadRateLimit = new Map<number, UploadRateLimitState>();

const getUploadRateState = (userId: number, now: number) => {
  const state = uploadRateLimit.get(userId);

  if (!state) return null;

  if (state.expiresAt <= now) {
    uploadRateLimit.delete(userId);
    return null;
  }

  return state;
};

const incrementUploadRateState = (userId: number) => {
  const now = Date.now();
  const current = getUploadRateState(userId, now);
  const nextState = {
    count: (current?.count || 0) + 1,
    expiresAt: now + UPLOAD_WINDOW_MS,
  };

  uploadRateLimit.set(userId, nextState);
  return nextState;
};

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);
  const user = session.user as { id?: number | null } | undefined;

  if (!user?.id) {
    throw createError({
      statusCode: 401,
      message: "Vui long dang nhap de tai tep len",
    });
  }

  const userId = Number(user.id);
  const currentRateState = getUploadRateState(userId, Date.now());

  if (currentRateState && currentRateState.count >= MAX_UPLOADS_PER_WINDOW) {
    throw createError({
      statusCode: 429,
      message: "Ban da tai tep qua nhieu lan. Vui long thu lai sau.",
    });
  }

  const formData = await readMultipartFormData(event);

  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: "Khong co file" });
  }

  const file = formData.find((entry) => entry.name === "file");

  if (!file || !file.filename || !file.data) {
    throw createError({
      statusCode: 400,
      message: "File khong hop le hoac thieu ten file",
    });
  }

  const fileExt = path.extname(file.filename).toLowerCase();
  const mimeType = String(file.type || "").toLowerCase();
  const fileSize = Number(file.data.length || 0);

  if (!ALLOWED_EXTENSIONS.has(fileExt) || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw createError({
      statusCode: 400,
      message: "Loai tep khong duoc ho tro",
    });
  }

  if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      message: "Kich thuoc tep phai tu 1 byte den 5 MB",
    });
  }

  const newFilename = `${Date.now()}-${randomUUID()}${fileExt}`;
  const uploadDir = path.resolve(process.cwd(), "uploads");
  incrementUploadRateState(userId);

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, newFilename);
    await fs.writeFile(fullPath, file.data);

    return {
      url: `/uploads/${newFilename}`,
      filename: newFilename,
      size: fileSize,
      mimeType,
    };
  } catch (error: any) {
    console.error("Upload error:", error);
    throw createError({
      statusCode: 500,
      message: "Loi khi luu file: " + error.message,
    });
  }
});
