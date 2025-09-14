// src/modules/reports/reports.controller.js
import Invoice from "../invoices/invoice.schema.js";
import PurchaseRecord from "../purchase/purchase.schema.js";
import Expense from "../expenses/expenses.schema.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";
import mongoose from "mongoose";

/* Utilities */
const n = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v) || 0);

function parseDateRange(q) {
  const { from, to } = q || {};
  if (!from && !to) return null;
  const gte = from ? new Date(from) : new Date("1970-01-01");
  const lte = to ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date();
  return { $gte: gte, $lte: lte };
}

function toCSV(rows = [], headers = []) {
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerLine = headers.map((h) => esc(h.label || h.key)).join(",");
  const lines = [headerLine];
  for (const r of rows) {
    const cols = headers.map((h) => esc((r[h.key] === undefined ? "" : r[h.key])));
    lines.push(cols.join(","));
  }
  return lines.join("\n");
}

/* ---------------------------
   DETAILED INVOICE PROFIT
   GET /reports/invoice-detailed/:id
   --------------------------- */
export const getInvoiceDetailedProfit = asyncHandler(async (req, res) => {
  const invoiceId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) throw new ApiError(400, "Invalid invoice id");

  const invoice = await Invoice.findOne({ _id: invoiceId, companyId: req.user.companyId }).lean();
  if (!invoice) throw new ApiError(404, "Invoice not found");

  // purchases (COGS) for this invoice
  const purchase = await PurchaseRecord.findOne({
    companyId: req.user.companyId,
    invoiceId: invoice._id,
    isDeleted: false,
  }).lean();

  // direct expenses linked to invoice (delivery, commission, packaging etc.)
  const directExpensesDocs = await Expense.find({
    companyId: req.user.companyId,
    linkedInvoiceId: invoice._id,
  }).lean();

  const totalPurchase = n(purchase?.totalPurchaseCost);
  const directExpenses = (directExpensesDocs || []).reduce((s, e) => s + n(e.amount), 0);

  // invoice-level adjustments (schema-dependent)
  const invoiceDiscount = n(invoice.discount ?? invoice.totalDiscount ?? 0);
  const invoiceAdjustment = n(invoice.adjustment ?? 0);
  const returnsAmount = n(invoice.returnsAmount ?? 0);

  // tax breakdown
  const taxCollected = n(invoice.totalCgst) + n(invoice.totalSgst) + n(invoice.totalIgst);
  const revenueGross = n(invoice.grandTotal ?? invoice.total ?? 0);
  const revenueNetOfTax = revenueGross - taxCollected;

  // Optional overhead allocation (query param: allocateOverhead=true, overheadFrom, overheadTo)
  let overheadAlloc = 0;
  if (req.query.allocateOverhead === "true") {
    const from = req.query.overheadFrom;
    const to = req.query.overheadTo;
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    const overheadMatch = { companyId: req.user.companyId, type: { $in: ["Rent", "Salary", "Utilities", "Other"] } };
    if (from || to) overheadMatch.date = dateFilter;

    const overheadDocs = await Expense.find(overheadMatch).lean();
    const totalOverheads = overheadDocs.reduce((s, e) => s + n(e.amount), 0);

    const invFilter = { companyId: req.user.companyId };
    if (from || to) invFilter.invoiceDate = dateFilter;
    const invoicesInRange = await Invoice.find(invFilter).select("grandTotal").lean();
    const totalRevenueRange = (invoicesInRange || []).reduce((s, i) => s + n(i.grandTotal ?? i.total ?? 0), 0);

    overheadAlloc = totalRevenueRange > 0 ? (totalOverheads * (revenueGross / totalRevenueRange)) : 0;
  }

  // profit metrics
  const grossProfit = revenueGross - totalPurchase - invoiceDiscount + invoiceAdjustment - returnsAmount;
  const operatingProfit = grossProfit - directExpenses;
  const netProfit = operatingProfit - overheadAlloc;

  const breakdown = {
    invoiceId: invoice._id,
    invoiceNo: invoice.invoiceNo || null,
    revenue: revenueGross,
    revenueNetOfTax,
    taxCollected,
    purchaseCost: totalPurchase,
    directExpenses,
    invoiceDiscount,
    invoiceAdjustment,
    returnsAmount,
    overheadAlloc,
    grossProfit,
    operatingProfit,
    netProfit,
    purchasesDoc: purchase || null,
    directExpensesDocs,
  };

  return res.json(new ApiResponse(200, breakdown));
});

/* ---------------------------
   EXISTING/ADDITIONAL REPORTS
   (combined improved implementations)
   --------------------------- */

/* Invoice profit/loss (simple) */
export const getInvoiceProfitLoss = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, companyId: req.user.companyId }).lean();
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const purchase = await PurchaseRecord.findOne({
    companyId: req.user.companyId,
    invoiceId: invoice._id,
    isDeleted: false,
  }).lean();

  const expenses = await Expense.find({
    companyId: req.user.companyId,
    linkedInvoiceId: invoice._id,
  }).lean();

  const totalPurchase = n(purchase?.totalPurchaseCost);
  const totalExpense = (expenses || []).reduce((s, e) => s + n(e.amount), 0);
  const revenue = n(invoice.grandTotal ?? invoice.total ?? 0);
  const profit = revenue - (totalPurchase + totalExpense);

  res.json(new ApiResponse(200, { invoiceId: invoice._id, revenue, totalPurchase, totalExpense, profit }));
});

/* Overall profit/loss */
export const getOverallProfitLoss = asyncHandler(async (req, res) => {
  const range = parseDateRange(req.query);

  const invoiceFilter = { companyId: req.user.companyId };
  const purchaseFilter = { companyId: req.user.companyId, isDeleted: false };
  const expenseFilter = { companyId: req.user.companyId };

  if (range) {
    invoiceFilter.invoiceDate = range;
    purchaseFilter.createdAt = range;
    expenseFilter.date = range;
  }

  const invoices = await Invoice.find(invoiceFilter).select("grandTotal total").lean();
  const purchases = await PurchaseRecord.find(purchaseFilter).select("totalPurchaseCost").lean();
  const expenses = await Expense.find(expenseFilter).select("amount").lean();

  const revenue = invoices.reduce((s, inv) => s + n(inv.grandTotal ?? inv.total ?? 0), 0);
  const totalPurchase = purchases.reduce((s, p) => s + n(p.totalPurchaseCost), 0);
  const totalExpense = expenses.reduce((s, e) => s + n(e.amount), 0);
  const profit = revenue - (totalPurchase + totalExpense);

  res.json(new ApiResponse(200, { revenue, totalPurchase, totalExpense, profit }));
});

/* Sales report (list) */
export const getSalesReport = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, customerId, status } = req.query;
  const range = parseDateRange(req.query);
  const skip = Math.max(0, (Number(page) - 1) * Number(limit || 25));

  const filter = { companyId: req.user.companyId };
  if (range) filter.invoiceDate = range;
  if (customerId && mongoose.Types.ObjectId.isValid(customerId)) filter["customer._id"] = mongoose.Types.ObjectId(customerId);
  if (status) filter.status = status;

  const total = await Invoice.countDocuments(filter);
  const list = await Invoice.find(filter).sort({ invoiceDate: -1 }).skip(skip).limit(Number(limit)).lean();

  res.json(new ApiResponse(200, { invoices: list, meta: { page: Number(page), limit: Number(limit), total } }));
});

/* Sales summary grouped by period */
export const getSalesSummary = asyncHandler(async (req, res) => {
  const { groupBy = "month" } = req.query;
  const range = parseDateRange(req.query);
  const match = { companyId: req.user.companyId };
  if (range) match.invoiceDate = range;

  let dateFormat;
  if (groupBy === "day") dateFormat = { year: { $year: "$invoiceDate" }, month: { $month: "$invoiceDate" }, day: { $dayOfMonth: "$invoiceDate" } };
  else if (groupBy === "year") dateFormat = { year: { $year: "$invoiceDate" } };
  else dateFormat = { year: { $year: "$invoiceDate" }, month: { $month: "$invoiceDate" } };

  const agg = await Invoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: dateFormat,
        count: { $sum: 1 },
        revenue: { $sum: { $ifNull: ["$grandTotal", "$total", 0] } },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]).allowDiskUse(true);

  res.json(new ApiResponse(200, { groupBy, series: agg }));
});

/* Top customers */
export const getTopCustomers = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const range = parseDateRange(req.query);
  const match = { companyId: req.user.companyId };
  if (range) match.invoiceDate = range;

  const agg = await Invoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$customer._id",
        name: { $first: "$customer.name" },
        totalRevenue: { $sum: { $ifNull: ["$grandTotal", "$total", 0] } },
        invoices: { $sum: 1 },
      },
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: Number(limit) },
  ]).allowDiskUse(true);

  res.json(new ApiResponse(200, { topCustomers: agg }));
});

/* Top products */
export const getTopProducts = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const range = parseDateRange(req.query);
  const match = { companyId: req.user.companyId };
  if (range) match.invoiceDate = range;

  const agg = await Invoice.aggregate([
    { $match: match },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        name: { $first: "$items.name" },
        qty: { $sum: { $ifNull: ["$items.columns.qty", "$items.qty", 0] } },
        revenue: { $sum: { $ifNull: ["$items.columns.total", "$items.total", 0] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: Number(limit) },
  ]).allowDiskUse(true);

  res.json(new ApiResponse(200, { topProducts: agg }));
});

/* Tax report */
export const getTaxReport = asyncHandler(async (req, res) => {
  const range = parseDateRange(req.query);
  const filter = { companyId: req.user.companyId };
  if (range) filter.invoiceDate = range;

  const invoices = await Invoice.find(filter).select("invoiceNo invoiceDate totalCgst totalSgst totalIgst taxSummary").lean();

  const gstSummary = invoices.reduce(
    (acc, inv) => {
      acc.cgst += n(inv.totalCgst);
      acc.sgst += n(inv.totalSgst);
      acc.igst += n(inv.totalIgst);
      return acc;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );

  res.json(new ApiResponse(200, { totals: gstSummary, invoices }));
});

/* Expenses summary */
export const getExpensesSummary = asyncHandler(async (req, res) => {
  const range = parseDateRange(req.query);
  const match = { companyId: req.user.companyId };
  if (range) match.date = range;

  const agg = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        total: { $sum: { $ifNull: ["$amount", 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]).allowDiskUse(true);

  const vendorAgg = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$vendor",
        total: { $sum: { $ifNull: ["$amount", 0] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 20 },
  ]).allowDiskUse(true);

  res.json(new ApiResponse(200, { byType: agg, byVendor: vendorAgg }));
});

/* Purchases report */
export const getPurchasesReport = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const range = parseDateRange(req.query);
  const filter = { companyId: req.user.companyId, isDeleted: false };
  if (range) filter.createdAt = range;

  const skip = Math.max(0, (Number(page) - 1) * Number(limit));
  const total = await PurchaseRecord.countDocuments(filter);
  const list = await PurchaseRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();

  const totals = await PurchaseRecord.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalPurchaseCost: { $sum: "$totalPurchaseCost" },
      },
    },
  ]);

  const totalPurchaseCost = totals[0]?.totalPurchaseCost ?? 0;
  res.json(new ApiResponse(200, { purchases: list, meta: { page: Number(page), limit: Number(limit), total }, totals: { totalPurchaseCost } }));
});

/* Cashflow */
export const getCashflowReport = asyncHandler(async (req, res) => {
  const groupBy = req.query.groupBy || "month";
  const range = parseDateRange(req.query);

  const invoiceMatch = { companyId: req.user.companyId };
  const expenseMatch = { companyId: req.user.companyId };
  const purchaseMatch = { companyId: req.user.companyId, isDeleted: false };
  if (range) {
    invoiceMatch.invoiceDate = range;
    expenseMatch.date = range;
    purchaseMatch.createdAt = range;
  }

  const groupKey =
    groupBy === "day"
      ? { year: { $year: "$dateField" }, month: { $month: "$dateField" }, day: { $dayOfMonth: "$dateField" } }
      : groupBy === "year"
      ? { year: { $year: "$dateField" } }
      : { year: { $year: "$dateField" }, month: { $month: "$dateField" } };

  const invoiceAgg = await Invoice.aggregate([
    { $match: invoiceMatch },
    { $project: { income: { $ifNull: ["$grandTotal", "$total", 0] }, dateField: "$invoiceDate" } },
    { $group: { _id: groupKey, income: { $sum: "$income" } } },
  ]).allowDiskUse(true);

  const expenseAgg = await Expense.aggregate([
    { $match: expenseMatch },
    { $project: { outflow: { $ifNull: ["$amount", 0] }, dateField: "$date" } },
    { $group: { _id: groupKey, outflow: { $sum: "$outflow" } } },
  ]).allowDiskUse(true);

  const purchaseAgg = await PurchaseRecord.aggregate([
    { $match: purchaseMatch },
    { $project: { outflow: { $ifNull: ["$totalPurchaseCost", 0] }, dateField: "$createdAt" } },
    { $group: { _id: groupKey, outflow: { $sum: "$outflow" } } },
  ]).allowDiskUse(true);

  res.json(new ApiResponse(200, { invoices: invoiceAgg, expenses: expenseAgg, purchases: purchaseAgg }));
});

/* Export CSV */
export const exportReport = asyncHandler(async (req, res) => {
  const { report = "sales", format = "csv" } = req.query;
  const range = parseDateRange(req.query);

  if (format !== "csv") throw new ApiError(400, "Only csv export supported currently");

  if (report === "sales") {
    const filter = { companyId: req.user.companyId };
    if (range) filter.invoiceDate = range;
    const invoices = await Invoice.find(filter).lean();
    const headers = [
      { key: "invoiceNo", label: "Invoice No" },
      { key: "invoiceDate", label: "Invoice Date" },
      { key: "customer", label: "Customer" },
      { key: "grandTotal", label: "Total" },
      { key: "status", label: "Status" },
    ];
    const rows = invoices.map((i) => ({
      invoiceNo: i.invoiceNo || i._id,
      invoiceDate: i.invoiceDate ? new Date(i.invoiceDate).toISOString().slice(0, 10) : "",
      customer: (i.customer && i.customer.name) || i.customerName || "",
      grandTotal: n(i.grandTotal ?? i.total),
      status: i.status || "",
    }));
    const csv = toCSV(rows, headers);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="sales_${Date.now()}.csv"`);
    return res.send(csv);
  }

  if (report === "expenses") {
    const filter = { companyId: req.user.companyId };
    if (range) filter.date = range;
    const items = await Expense.find(filter).lean();
    const headers = [
      { key: "type", label: "Type" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount" },
      { key: "date", label: "Date" },
      { key: "linkedInvoice", label: "Linked Invoice" },
    ];
    const rows = items.map((e) => ({
      type: e.type,
      description: e.description || "",
      amount: n(e.amount),
      date: e.date ? new Date(e.date).toISOString().slice(0, 10) : "",
      linkedInvoice: (e.linkedInvoiceId && (typeof e.linkedInvoiceId === "string" ? e.linkedInvoiceId : e.linkedInvoiceId.invoiceNo || e.linkedInvoiceId._id)) || "",
    }));
    const csv = toCSV(rows, headers);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="expenses_${Date.now()}.csv"`);
    return res.send(csv);
  }

  if (report === "purchases") {
    const filter = { companyId: req.user.companyId, isDeleted: false };
    if (range) filter.createdAt = range;
    const items = await PurchaseRecord.find(filter).lean();
    const headers = [
      { key: "invoiceId", label: "InvoiceId" },
      { key: "purchasesCount", label: "Items" },
      { key: "totalPurchaseCost", label: "TotalPurchaseCost" },
      { key: "createdAt", label: "CreatedAt" },
    ];
    const rows = items.map((p) => ({
      invoiceId: p.invoiceId ? (typeof p.invoiceId === "object" ? p.invoiceId._id : p.invoiceId) : "",
      purchasesCount: Array.isArray(p.purchases) ? p.purchases.length : 0,
      totalPurchaseCost: n(p.totalPurchaseCost),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "",
    }));
    const csv = toCSV(rows, headers);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="purchases_${Date.now()}.csv"`);
    return res.send(csv);
  }

  if (report === "tax") {
    const filter = { companyId: req.user.companyId };
    if (range) filter.invoiceDate = range;
    const invoices = await Invoice.find(filter).select("invoiceNo invoiceDate totalCgst totalSgst totalIgst").lean();
    const headers = [
      { key: "invoiceNo", label: "InvoiceNo" },
      { key: "invoiceDate", label: "InvoiceDate" },
      { key: "totalCgst", label: "CGST" },
      { key: "totalSgst", label: "SGST" },
      { key: "totalIgst", label: "IGST" },
    ];
    const rows = invoices.map((i) => ({
      invoiceNo: i.invoiceNo || i._id,
      invoiceDate: i.invoiceDate ? new Date(i.invoiceDate).toISOString().slice(0, 10) : "",
      totalCgst: n(i.totalCgst),
      totalSgst: n(i.totalSgst),
      totalIgst: n(i.totalIgst),
    }));
    const csv = toCSV(rows, headers);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="tax_${Date.now()}.csv"`);
    return res.send(csv);
  }

  throw new ApiError(400, "Unknown report for export");
});
