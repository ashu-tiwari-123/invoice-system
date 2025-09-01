import express from "express";
import * as customerController from "../../controllers/catalog/customer.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();
router.get("/search", authMiddleware, customerController.searchCustomers);
router.post("/customers", authMiddleware, customerController.createCustomer);
router.get("/customers", authMiddleware, customerController.getAllCustomers);
router.get(
  "/customers/:id",
  authMiddleware,
  customerController.getCustomerById
);
router.patch(
  "/customers/:id",
  authMiddleware,
  customerController.updateCustomer
);
router.delete(
  "/customers/:id",
  authMiddleware,
  customerController.deleteCustomer
);

export default router;
