import PurchaseRecord from "./purchase.schema.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/apiResponse.js";

// Create
export const createPurchaseRecord = asyncHandler(async (req, res) => {
  const { invoiceId, purchases } = req.body;
  const totalPurchaseCost = (purchases || []).reduce((sum, p) => sum + p.amount, 0);

  const record = await PurchaseRecord.create({
    companyId: req.user.companyId,
    invoiceId,
    purchases,
    totalPurchaseCost,
    createdBy: req.user?.uid || "system",
  });

  res.status(201).json(new ApiResponse(201, record, "Created successfully"));
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

export const updatePurchaseRecord = asyncHandler(async (req, res) => {
  const { purchases } = req.body;
  const totalPurchaseCost = (purchases || []).reduce((sum, p) => sum + p.amount, 0);

  const updated = await PurchaseRecord.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { purchases, totalPurchaseCost }, $push: { auditLogs: { action: "update", user: req.user?.uid || "system" } } },
    { new: true }
  );
  if (!updated) return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, updated, "Updated successfully"));
});

export const deletePurchaseRecord = asyncHandler(async (req, res) => {
  const deleted = await PurchaseRecord.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { isDeleted: true, $push: { auditLogs: { action: "delete", user: req.user?.uid || "system" } } },
    { new: true }
  );
  if (!deleted) return res.status(404).json(new ApiResponse(404, null, "Not found"));
  res.json(new ApiResponse(200, deleted, "Soft deleted successfully"));
});

export const getPurchaseRecordByInvoice = asyncHandler(async (req, res) => {
  const record = await PurchaseRecord.findOne({
    companyId: req.user.companyId,
    invoiceId: req.params.invoiceId,
    isDeleted: false,
  });
  res.json(new ApiResponse(200, record));
});
