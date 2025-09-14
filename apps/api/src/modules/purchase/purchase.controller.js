import PurchaseRecord from "./purchase.schema.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";
import ApiError from "../../utils/ApiError.js";

// Create
export const createPurchaseRecord = asyncHandler(async (req, res) => {
  const { invoiceId, purchases = [] } = req.body;
  if (!invoiceId) throw new ApiError(400, "invoiceId is required");

  const totalPurchaseCost = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

  const record = await PurchaseRecord.create({
    companyId: req.user.companyId,
    invoiceId,
    purchases,
    totalPurchaseCost,
    createdBy: req.user?.uid || "system",
    auditLogs: [{ action: "create", user: req.user?.uid || "system" }],
  });

  return res.status(201).json(new ApiResponse(201, record, "Purchase record created"));
});

// Get all (with pagination)
export const getAllPurchaseRecords = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const query = { companyId: req.user.companyId, isDeleted: false };

  const [records, total] = await Promise.all([
    PurchaseRecord.find(query)
      .populate("invoiceId")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    PurchaseRecord.countDocuments(query),
  ]);

  res.json(new ApiResponse(200, { records, meta: { total, page, limit } }));
});

// Get by ID
export const getPurchaseRecordById = asyncHandler(async (req, res) => {
  const record = await PurchaseRecord.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
    isDeleted: false,
  }).populate("invoiceId");

  if (!record) throw new ApiError(404, "Purchase record not found");

  res.json(new ApiResponse(200, record));
});

// Update
export const updatePurchaseRecord = asyncHandler(async (req, res) => {
  const { purchases = [] } = req.body;
  const totalPurchaseCost = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

  const updated = await PurchaseRecord.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId, isDeleted: false },
    {
      $set: { purchases, totalPurchaseCost },
      $push: { auditLogs: { action: "update", user: req.user?.uid || "system" } },
    },
    { new: true }
  );

  if (!updated) throw new ApiError(404, "Purchase record not found");

  res.json(new ApiResponse(200, updated, "Purchase record updated"));
});

// Soft delete
export const deletePurchaseRecord = asyncHandler(async (req, res) => {
  const deleted = await PurchaseRecord.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    {
      $set: { isDeleted: true },
      $push: { auditLogs: { action: "delete", user: req.user?.uid || "system" } },
    },
    { new: true }
  );

  if (!deleted) throw new ApiError(404, "Purchase record not found");

  res.json(new ApiResponse(200, deleted, "Purchase record soft deleted"));
});

// Get by invoiceId
export const getPurchaseRecordByInvoice = asyncHandler(async (req, res) => {
  const record = await PurchaseRecord.findOne({
    companyId: req.user.companyId,
    invoiceId: req.params.invoiceId,
    isDeleted: false,
  });

  if (!record) throw new ApiError(404, "No purchase record for this invoice");

  res.json(new ApiResponse(200, record));
});
