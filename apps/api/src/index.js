import http from "http";
import app from "./app.js";
import config from "./config/config.js";
import logger from "./config/logger.js";
import { connectDB } from "./config/db.js";
import mongoose from "mongoose";

const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB(config.mongo.url);
    server.listen(config.port, () => {
      logger.info(
        `🚀 Server listening on port ${config.port} in ${config.env} mode`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  shutdownHandler();
};

process.on("unhandledRejection", unexpectedErrorHandler);
process.on("uncaughtException", unexpectedErrorHandler);

const shutdownHandler = () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    logger.info("✅ HTTP server closed.");
    mongoose.connection.close(false, () => {
      logger.info("✅ MongoDB connection closed.");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", shutdownHandler);
process.on("SIGINT", shutdownHandler);
