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
router.post("/:id/approve", authMiddleware, approveInvoice);
router.post("/:id/mark-paid", authMiddleware, markInvoicePaid);
router.post("/:id/void", authMiddleware, voidInvoice);
router.post("/:id/generate-pdf", authMiddleware, generatePdfSnapshot);

export default router;
