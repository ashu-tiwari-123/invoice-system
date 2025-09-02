import express from "express";
import {
  getInvoiceProfitLoss,
  getOverallProfitLoss,
  getSalesReport,
  getTaxReport,
} from "./reports.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

router.get("/invoice/:id", authMiddleware, getInvoiceProfitLoss);
router.get("/overall", authMiddleware, getOverallProfitLoss);
router.get("/sales", authMiddleware, getSalesReport);
router.get("/tax", authMiddleware, getTaxReport);

export default router;
