import Expense from "./expenses.schema.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";

// Create
export const createExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({
    ...req.body,
    createdBy: req.user?.uid || "system",
  });
  res.status(201).json(new ApiResponse(201, expense, "Expense created"));
});

// Get All
export const getAllExpenses = asyncHandler(async (req, res) => {
  const { type, startDate, endDate, invoiceId } = req.query;
  let filter = {};
  if (type) filter.type = type;
  if (invoiceId) filter.linkedInvoiceId = invoiceId;
  if (startDate && endDate)
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  const expenses = await Expense.find(filter).populate("linkedInvoiceId");
  res.json(new ApiResponse(200, expenses));
});

// Get One
export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id).populate(
    "linkedInvoiceId"
  );
  if (!expense)
    return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, expense));
});

// Update
export const updateExpense = asyncHandler(async (req, res) => {
  const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!updated)
    return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, updated, "Updated successfully"));
});

// Delete
export const deleteExpense = asyncHandler(async (req, res) => {
  const deleted = await Expense.findByIdAndDelete(req.params.id);
  if (!deleted)
    return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, deleted, "Deleted successfully"));
});
