import Invoice from "../invoices/invoice.schema.js";
import PurchaseRecord from "../purchase/purchase.schema.js";
import Expense from "../expenses/expenses.schema.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/ApiError.js";
import asyncHandler from "../../utils/asyncHandler.js";

// 1. Per-Invoice Profit/Loss
const getInvoiceProfitLoss = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const purchase = await PurchaseRecord.findOne({
    invoiceId: invoice._id,
    isDeleted: false,
  });
  const expenses = await Expense.find({
    linkedInvoiceId: invoice._id,
    isDeleted: false,
  });

  const purchaseCost = purchase ? purchase.totalPurchaseCost : 0;
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const profit = invoice.grandTotal - (purchaseCost + expenseTotal);

  res.json(
    new ApiResponse(200, {
      invoiceNo: invoice.invoiceNo,
      revenue: invoice.grandTotal,
      purchaseCost,
      expenseTotal,
      profit,
    })
  );
});

// 2. Overall Profit/Loss (date range optional)
const getOverallProfitLoss = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  let filter = {};
  if (startDate && endDate) {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const invoices = await Invoice.find(filter);
  if (!invoices || invoices.length === 0)
    throw new ApiError(404, "No invoices found in given range");

  const purchases = await PurchaseRecord.find({ isDeleted: false });
  const expenses = await Expense.find({ isDeleted: false });

  const totalRevenue = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalPurchases = purchases.reduce(
    (sum, p) => sum + p.totalPurchaseCost,
    0
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const profit = totalRevenue - (totalPurchases + totalExpenses);

  res.json(
    new ApiResponse(200, {
      totalRevenue,
      totalPurchases,
      totalExpenses,
      profit,
    })
  );
});

// 3. Sales Report (by customer)
const getSalesReport = asyncHandler(async (req, res) => {
  const { groupBy = "customer" } = req.query; // "customer" | "product" | "vendor"

  if (groupBy === "customer") {
    const report = await Invoice.aggregate([
      {
        $group: {
          _id: "$customer.name",
          totalSales: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);
    if (!report || report.length === 0)
      throw new ApiError(404, "No sales data found");

    return res.json(new ApiResponse(200, report));
  }

  throw new ApiError(400, `Unsupported groupBy value: ${groupBy}`);
});

// 4. Tax Report (GST Summary)
const getTaxReport = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find();
  if (!invoices || invoices.length === 0)
    throw new ApiError(404, "No invoices found");

  const gstSummary = invoices.reduce(
    (acc, inv) => {
      acc.cgst += inv.cgstTotal || 0;
      acc.sgst += inv.sgstTotal || 0;
      acc.igst += inv.igstTotal || 0;
      return acc;
    },
    { cgst: 0, sgst: 0, igst: 0 }
  );

  res.json(new ApiResponse(200, gstSummary));
});

// ✅ Export all at the bottom
export {
  getInvoiceProfitLoss,
  getOverallProfitLoss,
  getSalesReport,
  getTaxReport,
};
