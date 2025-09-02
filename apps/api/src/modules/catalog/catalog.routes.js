import express from "express";
import customerRoutes from "./customers/customer.routes.js";
import productRoutes from "./products/product.routes.js";

const router = express.Router();

// Nest routes inside /catalog
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);

export default router;
