import Quotation from "./quotation.schema.js";
import Counter from "../counter/counter.schema.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

const getNextQuotationNo = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `quotation-${year}` },
    { $inc: { nextSeq: 1 } },
    { new: true, upsert: true }
  );
  return `QUO-${year}-${counter.nextSeq}`;
};

const createQuotation = asyncHandler(async (req, res) => {
  const { customer, customColumns, items, ...quotationData } = req.body;

  // 1️⃣ Generate quotation number
  const quotationNo = await getNextQuotationNo();

  // 2️⃣ Build quotation
  const newQuotation = await Quotation.create({
    quotationNo,
    customer,
    customColumns,
    items,
    ...quotationData,
    auditLogs: [
      { action: "create", user: req.user.uid, timestamp: new Date() }
    ]
  });

  if (!newQuotation) throw new ApiError(500, "Quotation creation failed");

  return res
    .status(201)
    .json(new ApiResponse(201, newQuotation, "Quotation created successfully"));
});

const getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new ApiError(404, "Quotation not found");

  return res.json(new ApiResponse(200, quotation, "Quotation fetched"));
});

const getAllQuotations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, customer, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (customer) filter["customer.name"] = { $regex: customer, $options: "i" };
  if (from && to) filter.date = { $gte: new Date(from), $lte: new Date(to) };

  const quotations = await Quotation.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Quotation.countDocuments(filter);

  return res.json(
    new ApiResponse(200, { quotations, total }, "Quotations retrieved")
  );
});

const updateQuotation = asyncHandler(async (req, res) => {
  const updated = await Quotation.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!updated) throw new ApiError(404, "Quotation not found");

  updated.auditLogs.push({
    action: "update",
    user: req.user.uid,
    timestamp: new Date(),
    changes: req.body
  });

  await updated.save();

  return res.json(new ApiResponse(200, updated, "Quotation updated"));
});

const approveQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "accepted" } },
    { new: true }
  );

  if (!quotation) throw new ApiError(404, "Quotation not found");

  return res.json(new ApiResponse(200, quotation, "Quotation approved"));
});

const rejectQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "rejected" } },
    { new: true }
  );

  if (!quotation) throw new ApiError(404, "Quotation not found");

  return res.json(new ApiResponse(200, quotation, "Quotation rejected"));
});

const generateQuotationPdf = asyncHandler(async (req, res) => {
  const { pdfUrl } = req.body;
  if (!pdfUrl) throw new ApiError(400, "pdfUrl is required");

  const quotation = await Quotation.findById(req.params.id);
  if (!quotation) throw new ApiError(404, "Quotation not found");

  const version = quotation.pdfSnapshots.length + 1;
  quotation.pdfSnapshots.push({
    version,
    pdfUrl,
    generatedBy: req.user.uid
  });

  await quotation.save();

  return res.json(new ApiResponse(200, quotation, "PDF snapshot saved"));
});

export {
  createQuotation,
  getQuotationById,
  getAllQuotations,
  updateQuotation,
  approveQuotation,
  rejectQuotation,
  generateQuotationPdf
};
