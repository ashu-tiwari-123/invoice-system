// src/modules/catalog/customers/customer.routes.js
import express from "express";
import * as customerController from "./customer.controller.js";
import authMiddleware from "../../../middlewares/auth.js";

const router = express.Router();

router.get("/search", authMiddleware, customerController.searchCustomers);
router.post("/", authMiddleware, customerController.createCustomer);
router.get("/", authMiddleware, customerController.getAllCustomers);
router.get("/:id", authMiddleware, customerController.getCustomerById);
router.patch("/:id", authMiddleware, customerController.updateCustomer);
router.patch("/delete/:id", authMiddleware, customerController.deleteCustomer);

export default router;
