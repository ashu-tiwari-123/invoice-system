import mongoose from "mongoose";
import logger from "./logger.js";

export const connectDB = async (MONGO_URL) => {
  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error after initial connect:", err);
  });
  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected.");
  });

  try {
    await mongoose.connect(MONGO_URL, { dbName: "ims-cluster" });
    logger.info("✅ MongoDB connected");
  } catch (err) {
    logger.error("❌ MongoDB initial connection failed:", err);
    process.exit(1);
  }
};
