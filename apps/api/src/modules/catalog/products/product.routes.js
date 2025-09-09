import express from "express";
import * as productController from "./product.controller.js";
import authMiddleware from "../../../middlewares/auth.js";

const router = express.Router();

router.get("/search", authMiddleware, productController.searchProducts);
router.post("/", authMiddleware, productController.createProduct);
router.get("/", authMiddleware, productController.getAllProducts);
router.get("/:id", authMiddleware, productController.getProductById);
router.patch("/:id", authMiddleware, productController.updateProduct);
router.patch("/delete/:id", authMiddleware, productController.deleteProduct);

export default router;
