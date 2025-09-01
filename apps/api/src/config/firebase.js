import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../config/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(
  __dirname,
  "firebase-service-account.json"
);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
  logger.info("✅ Firebase Admin SDK initialized");
} catch (error) {
  logger.error("❌ Firebase Admin SDK initialization failed:", error);
  process.exit(1);
}

export const auth = admin.auth();
export default admin;
