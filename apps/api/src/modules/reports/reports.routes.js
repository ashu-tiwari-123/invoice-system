// src/modules/reports/reports.routes.js
import express from "express";
import {
  getInvoiceDetailedProfit,
  getInvoiceProfitLoss,
  getOverallProfitLoss,
  getSalesReport,
  getSalesSummary,
  getTaxReport,
  getTopCustomers,
  getTopProducts,
  getExpensesSummary,
  getPurchasesReport,
  getCashflowReport,
  exportReport,
} from "./reports.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

// Invoice-level
router.get("/invoice-detailed/:id", authMiddleware, getInvoiceDetailedProfit);
router.get("/invoice/:id", authMiddleware, getInvoiceProfitLoss);

// Overall
router.get("/overall", authMiddleware, getOverallProfitLoss);

// Sales
router.get("/sales", authMiddleware, getSalesReport);
router.get("/sales/summary", authMiddleware, getSalesSummary);

// Tax
router.get("/tax", authMiddleware, getTaxReport);

// Top lists
router.get("/top-customers", authMiddleware, getTopCustomers);
router.get("/top-products", authMiddleware, getTopProducts);

// Expenses & Purchases
router.get("/expenses/summary", authMiddleware, getExpensesSummary);
router.get("/purchases", authMiddleware, getPurchasesReport);

// Cashflow
router.get("/cashflow", authMiddleware, getCashflowReport);

// Export CSV
router.get("/export", authMiddleware, exportReport);

export default router;
