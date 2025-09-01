import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongo: {
    url: process.env.MONGO_URL || "mongodb://localhost:27017/ims-dev",
    dbName: process.env.DB_NAME || "ims-cluster",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "a-very-strong-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
  corsOptions: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    credentials: true,
  },
};

export default config;
