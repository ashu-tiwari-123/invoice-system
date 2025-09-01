import express from "express";
import * as productController from "../../controllers/catalog/product.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();
router.get("/search", authMiddleware, productController.searchProducts);
router.post("/products", authMiddleware, productController.createProduct);
router.get("/products", authMiddleware, productController.getAllProducts);
router.get("/products/:id", authMiddleware, productController.getProductById);
router.patch("/products/:id", authMiddleware, productController.updateProduct);
router.delete("/products/:id", authMiddleware, productController.deleteProduct);

export default router;
