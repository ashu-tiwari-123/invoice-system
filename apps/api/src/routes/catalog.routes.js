import express from "express";
import customerRoutes from "./catalog/customer.routes.js";
import productRoutes from "./catalog/product.routes.js";

const router = express.Router();

// Nest routes inside /catalog
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);

export default router;
