import express from "express";
import {
  createPurchaseRecord,
  getAllPurchaseRecords,
  getPurchaseRecordById,
  updatePurchaseRecord,
  deletePurchaseRecord,
} from "./purchase.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

router.post("/", authMiddleware, createPurchaseRecord);
router.get("/", authMiddleware, getAllPurchaseRecords);
router.get("/:id", authMiddleware, getPurchaseRecordById);
router.put("/:id", authMiddleware, updatePurchaseRecord);
router.delete("/:id", authMiddleware, deletePurchaseRecord);

export default router;
