// src/modules/reports/reports.controller.js
import Invoice from "../invoices/invoice.schema.js";
import PurchaseRecord from "../purchase/purchase.schema.js";
import Expense from "../expenses/expenses.schema.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";

// const companyFilter = (companyId) => ({ companyId });

export const getInvoiceProfitLoss = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId });
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const purchase = await PurchaseRecord.findOne({
    companyId: req.user.companyId,
    invoiceId: invoice._id,
    isDeleted: false,
  });

  const expenses = await Expense.find({
    companyId: req.user.companyId,
    linkedInvoiceId: invoice._id,
  });

  const totalPurchase = purchase?.totalPurchaseCost || 0;
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const revenue = invoice.grandTotal || 0;
  const profit = revenue - (totalPurchase + totalExpense);

  res.json(new ApiResponse(200, { invoiceId: invoice._id, revenue, totalPurchase, totalExpense, profit }));
});

export const getOverallProfitLoss = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = from && to ? { $gte: new Date(from), $lte: new Date(to) } : null;

  const invoices = await Invoice.find({
    companyId: req.user.companyId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  });

  const purchases = await PurchaseRecord.find({
    companyId: req.user.companyId,
    isDeleted: false,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  });

  const expenses = await Expense.find({
    companyId: req.user.companyId,
    ...(dateFilter ? { date: dateFilter } : {}),
  });

  const revenue = invoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0);
  const totalPurchase = purchases.reduce((s, p) => s + (p.totalPurchaseCost || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = revenue - (totalPurchase + totalExpense);

  res.json(new ApiResponse(200, { revenue, totalPurchase, totalExpense, profit }));
});

export const getSalesReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = { companyId: req.user.companyId };
  if (from && to) filter.invoiceDate = { $gte: new Date(from), $lte: new Date(to) };

  const invoices = await Invoice.find(filter).sort({ invoiceDate: 1 });
  res.json(new ApiResponse(200, invoices));
});

export const getTaxReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = { companyId: req.user.companyId };
  if (from && to) filter.invoiceDate = { $gte: new Date(from), $lte: new Date(to) };

  const invoices = await Invoice.find(filter);

  const gstSummary = invoices.reduce(
    (acc, inv) => {
      acc.cgst += inv.totalCgst || 0;
      acc.sgst += inv.totalSgst || 0;
      acc.igst += inv.totalIgst || 0;
      return acc;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );

  res.json(new ApiResponse(200, gstSummary));
});
