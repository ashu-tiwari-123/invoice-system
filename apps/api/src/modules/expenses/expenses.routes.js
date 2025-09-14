import express from "express";
import {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  searchExpenses,
} from "./expenses.controller.js";
import authMiddleware from "../../middlewares/auth.js";

const router = express.Router();

router.post("/", authMiddleware, createExpense);
router.get("/search", authMiddleware, searchExpenses); // typeahead
router.get("/", authMiddleware, getAllExpenses);
router.get("/:id", authMiddleware, getExpenseById);
router.put("/:id", authMiddleware, updateExpense);
router.delete("/:id", authMiddleware, deleteExpense);

export default router;
