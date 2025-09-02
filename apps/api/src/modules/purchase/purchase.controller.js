import PurchaseRecord from "./purchase.schema.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";

// Create
export const createPurchaseRecord = asyncHandler(async (req, res) => {
  const { invoiceId, purchases } = req.body;

  const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.amount, 0);

  const record = await PurchaseRecord.create({
    invoiceId,
    purchases,
    totalPurchaseCost,
    createdBy: req.user?.uid || "system",
  });

  res.status(201).json(new ApiResponse(201, record, "Purchase record created"));
});

// Get All
export const getAllPurchaseRecords = asyncHandler(async (req, res) => {
  const records = await PurchaseRecord.find().populate("invoiceId");
  res.json(new ApiResponse(200, records));
});

// Get One
export const getPurchaseRecordById = asyncHandler(async (req, res) => {
  const record = await PurchaseRecord.findById(req.params.id).populate("invoiceId");
  if (!record) return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, record));
});

// Update
export const updatePurchaseRecord = asyncHandler(async (req, res) => {
  const { purchases } = req.body;
  const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.amount, 0);

  const updated = await PurchaseRecord.findByIdAndUpdate(
    req.params.id,
    { ...req.body, totalPurchaseCost },
    { new: true }
  );

  if (!updated) return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, updated, "Updated successfully"));
});

// Soft Delete
export const deletePurchaseRecord = asyncHandler(async (req, res) => {
  const deleted = await PurchaseRecord.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, $push: { auditLogs: { action: "delete", user: req.user?.uid || "system" } } },
    { new: true }
  );
  if (!deleted) return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, deleted, "Soft deleted successfully"));
});

