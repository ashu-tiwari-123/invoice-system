import express from "express";
import {
  createQuotation,
  getQuotationById,
  getAllQuotations,
  updateQuotation,
  approveQuotation,
  rejectQuotation,
  generateQuotationPdf,
  searchQuotations
} from "./quotation.controller.js";

import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();
router.get("/quotations/search", authMiddleware, searchQuotations);
router.get("/", authMiddleware, getAllQuotations);           
router.post("/", authMiddleware, createQuotation);         
router.get("/:id", authMiddleware, getQuotationById);       
router.patch("/:id", authMiddleware, updateQuotation);       
router.patch("/:id/approve", authMiddleware, approveQuotation); 
router.post("/:id/reject", authMiddleware, rejectQuotation);   
router.post("/:id/generate-pdf", authMiddleware, generateQuotationPdf); 

export default router;
