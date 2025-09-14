import express from "express";
import * as purchaseController from "./purchase.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

router.post("/", authMiddleware, purchaseController.createPurchaseRecord);
router.get("/", authMiddleware, purchaseController.getAllPurchaseRecords);
router.get("/:id", authMiddleware, purchaseController.getPurchaseRecordById);
router.patch("/:id", authMiddleware, purchaseController.updatePurchaseRecord);
router.patch("/:id", authMiddleware, purchaseController.deletePurchaseRecord);
router.get("/invoice/:invoiceId", authMiddleware, purchaseController.getPurchaseRecordByInvoice);

export default router;
