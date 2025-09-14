import Expense from "./expenses.schema.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/ApiError.js";

export const createExpense = asyncHandler(async (req, res) => {
  const { type, description, amount, date, linkedInvoiceId } = req.body;

  if (!type) throw new ApiError(400, "type is required");
  if (amount === undefined || amount === null) throw new ApiError(400, "amount is required");

  const expense = await Expense.create({
    companyId: req.user.companyId,
    type,
    description,
    amount: Number(amount),
    date: date ? new Date(date) : new Date(),
    linkedInvoiceId: linkedInvoiceId || undefined,
    createdBy: req.user?.uid || "system",
    auditLogs: [{ action: "create", user: req.user?.uid || "system" }],
  });

  return res.status(201).json(new ApiResponse(201, expense, "Expense created"));
});


export const getAllExpenses = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    startDate,
    endDate,
    invoiceId,
    q, 
    sortBy = "date",
    sortOrder = "desc",
  } = req.query;

  const filter = { companyId: req.user.companyId, isDeleted: false };

  if (type) filter.type = type;
  if (invoiceId) filter.linkedInvoiceId = invoiceId;
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) filter.date.$gte = new Date(startDate);
    if (endDate) filter.date.$lte = new Date(endDate);
  }
  if (q) {
    const regex = { $regex: q, $options: "i" };
    filter.$or = [{ description: regex }];
  }

  const skip = Math.max(0, (Number(page) - 1) * Number(limit));
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Expense.find(filter).sort(sort).skip(skip).limit(Number(limit)).populate("linkedInvoiceId").lean(),
    Expense.countDocuments(filter),
  ])
  const totalSumAgg = await Expense.aggregate([
    { $match: filter },
    { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
  ]);
  const grandTotal = (totalSumAgg[0]?.totalAmount) || 0;

  return res.json(
    new ApiResponse(200, {
      expenses: items,
      meta: { total, page: Number(page), limit: Number(limit), grandTotal },
    })
  );
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
    isDeleted: false,
  }).populate("linkedInvoiceId");

  if (!expense) throw new ApiError(404, "Expense not found");
  return res.json(new ApiResponse(200, expense));
});

export const updateExpense = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  if (payload.amount !== undefined) payload.amount = Number(payload.amount);
  if (payload.date) payload.date = new Date(payload.date);

  const updated = await Expense.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId, isDeleted: false },
    {
      $set: payload,
      $push: { auditLogs: { action: "update", user: req.user?.uid || "system" } },
    },
    { new: true, runValidators: true }
  );

  if (!updated) throw new ApiError(404, "Expense not found");
  return res.json(new ApiResponse(200, updated, "Expense updated"));
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const deleted = await Expense.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId, isDeleted: false },
    {
      $set: { isDeleted: true },
      $push: { auditLogs: { action: "delete", user: req.user?.uid || "system" } },
    },
    { new: true }
  );

  if (!deleted) throw new ApiError(404, "Expense not found");
  return res.json(new ApiResponse(200, deleted, "Expense deleted (soft)"));
});

export const searchExpenses = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json(new ApiResponse(200, []));
  const regex = { $regex: q, $options: "i" };
  const items = await Expense.find({
    companyId: req.user.companyId,
    isDeleted: false,
    $or: [{ description: regex }, { type: regex }],
  })
    .limit(20)
    .sort({ date: -1 });
  return res.json(new ApiResponse(200, items));
});
