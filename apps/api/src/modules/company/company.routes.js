import express from "express";
import { upsertCompany, getCompany } from "./company.controller.js";

const router = express.Router();

router.get("/", getCompany);
router.post("/", upsertCompany);

export default router;
