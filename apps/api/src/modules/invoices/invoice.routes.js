import express from "express";
import {
  createInvoice,
  getInvoiceById,
  getAllInvoices,
  updateInvoice,
  approveInvoice,
  markInvoicePaid,
  voidInvoice,
  generatePdfSnapshot,
  searchInvoices,
} from "./invoice.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

router.get("/search", authMiddleware, searchInvoices);
router.get("/", authMiddleware, getAllInvoices);
router.post("/", authMiddleware, createInvoice);
router.get("/:id", authMiddleware, getInvoiceById);
router.patch("/:id", authMiddleware, updateInvoice);
router.patch("/:id/approve", authMiddleware, approveInvoice);
router.patch("/:id/mark-paid", authMiddleware, markInvoicePaid);
router.patch("/:id/void", authMiddleware, voidInvoice);
router.post("/:id/generate-pdf", authMiddleware, generatePdfSnapshot);

export default router;
