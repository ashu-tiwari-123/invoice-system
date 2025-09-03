import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import rateLimit from "express-rate-limit";
import config from "./config/config.js";
import logger from "./config/logger.js";
import ApiError from "./utils/ApiError.js";
import { errorConverter, errorHandler } from "./middlewares/errorHandler.js";
import apiRoutes from "./routes/V1/index.js";

const app = express();

// --- Security Middleware ---

// Set various HTTP headers for security
app.use(helmet());

// Enable CORS with whitelisted origins
app.use(
  cors({
    origin: "http://localhost:5173", // frontend origin
    credentials: true, // if you need cookies/auth headers
  })
);

// Sanitize user-supplied data to prevent MongoDB operator injection
app.use(mongoSanitize());

// Protect against HTTP Parameter Pollution attacks
app.use(hpp());

// --- Core Middleware ---

// Parse json request body
app.use(express.json({ limit: "1mb" }));

// Parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Gzip compressing can greatly decrease the size of the response body
app.use(compression());

// --- API Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});
app.use("/api", limiter);

// --- HTTP Logging ---
// Use morgan to log HTTP requests in a production-friendly format
const morganFormat = config.env === "development" ? "dev" : "combined";
// Log via our logger
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// --- API Routes ---

// Health check endpoint
app.get("/health", (req, res) => res.status(200).send({ status: "OK" }));

// Version 1 API routes
app.use("/api/v1", apiRoutes);

// --- Error Handling ---

// Send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(404, "Not found"));
});

// Convert error to ApiError, if needed
app.use(errorConverter);

// Handle the final error
app.use(errorHandler);

export default app;
