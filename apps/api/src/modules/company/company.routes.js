import express from "express";
import { upsertCompany, getCompany } from "./company.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getCompany);
router.post("/",authMiddleware, upsertCompany);

export default router;
