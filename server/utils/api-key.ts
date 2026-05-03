import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const API_KEY_PREFIX = "key_";
const API_SECRET_PREFIX = "secret_";

export const generateApiSecretCredential = () => {
  const apiSecret = `${API_SECRET_PREFIX}${randomBytes(24).toString("hex")}`;
  return {
    apiSecret,
    secretHash: hashApiSecret(apiSecret),
  };
};

export const generateApiCredential = () => {
  const apiKey = `${API_KEY_PREFIX}${randomBytes(18).toString("hex")}`;
  const { apiSecret, secretHash } = generateApiSecretCredential();

  return {
    apiKey,
    apiSecret,
    secretHash,
  };
};

export const hashApiSecret = (secret: string) =>
  createHash("sha256").update(String(secret || "")).digest("hex");

export const verifyApiSecret = (secret: string, expectedHash: string) => {
  const incomingHash = hashApiSecret(secret);
  const incomingBuffer = Buffer.from(incomingHash);
  const expectedBuffer = Buffer.from(String(expectedHash || ""));

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, expectedBuffer);
};
