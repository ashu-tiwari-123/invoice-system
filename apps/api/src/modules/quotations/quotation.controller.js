import mongoose from "mongoose";
import Quotation from "./quotation.schema.js";
import Counter from "../counter/counter.schema.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Customer from "../catalog/customers/customer.schema.js";

const getNextQuotationNo = async (companyId) => {
  const year = new Date().getFullYear();
  const key = `quotation-${companyId}-${year}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { nextSeq: 1 } },
    { new: true, upsert: true }
  );
  return `QUO-${year}-${counter.nextSeq}`;
};

const normalizeTerms = (terms) =>
  !terms
    ? []
    : Array.isArray(terms)
      ? terms.map((t) => String(t || "").trim()).filter(Boolean)
      : typeof terms === "string"
        ? terms
            .split(/\r?\n/)
            .map((s) => s.trim().replace(/^\d+\.\s*/, ""))
            .filter(Boolean)
        : [];

const normalizeCustomerInput = async (customerInput, companyId) => {
  if (!customerInput) return null;
  if (
    typeof customerInput === "object" &&
    !mongoose.Types.ObjectId.isValid(customerInput)
  )
    return {
      name: customerInput.name || "",
      gstin: customerInput.gstin || "",
      address: customerInput.address || "",
      state: customerInput.state || "",
      stateCode: customerInput.stateCode || "",
      phone: customerInput.phone || "",
      email: customerInput.email || "",
    };

  let cid = customerInput;
  if (typeof customerInput === "object" && customerInput._id)
    cid = customerInput._id;

  if (mongoose.Types.ObjectId.isValid(cid)) {
    const doc = await Customer.findOne({ _id: cid, companyId }).lean();
    return doc
      ? {
          _id: doc._id,
          name: doc.name || "",
          gstin: doc.gstin || "",
          address: doc.address || "",
          state: doc.state || "",
          stateCode: doc.stateCode ? String(doc.stateCode) : "",
          phone: doc.phone || "",
          email: doc.email || "",
        }
      : null;
  }
  return null;
};

// add helper used by GET (transient only)
const computeGrandTotal = (items = []) =>
  (items || []).reduce((sum, it) => sum + (Number(it.columns?.total) || 0), 0);

const createQuotation = asyncHandler(async (req, res) => {
  const {
    customer: customerInput,
    customColumns,
    items,
    termsAndConditions,
    sendPerRow,
    ...rest
  } = req.body;
  const customerSnapshot = await normalizeCustomerInput(
    customerInput,
    req.user.companyId
  );
  const customerId = customerSnapshot?._id;
  const quotationNo = await getNextQuotationNo(req.user.companyId);

  const payloadNode = {
    companyId: req.user.companyId,
    quotationNo,
    customer:
      customerSnapshot ||
      (typeof customerInput === "object" ? customerInput : undefined),
    customerId,
    customColumns,
    items,
    termsAndConditions: normalizeTerms(termsAndConditions),
    sendPerRow: Boolean(sendPerRow),
    ...rest,
    auditLogs: [
      { action: "create", user: req.user.uid, timestamp: new Date() },
    ],
  };

  const newQuotation = await Quotation.create(payloadNode);
  return res
    .status(201)
    .json(new ApiResponse(201, newQuotation, "Quotation created"));
});

const getQuotationById = asyncHandler(async (req, res) => {
  const q = await Quotation.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  })
    .lean()
    .populate("companyId");
  if (!q) throw new ApiError(404, "Quotation not found");
  const computedTotal = computeGrandTotal(q.items || []);
  return res.json(
    new ApiResponse(200, {
      ...q,
      computedTotal,
      sendPerRow: Boolean(q.sendPerRow),
    })
  );
});

const updateQuotation = asyncHandler(async (req, res) => {
  if (req.body?.customer) {
    const snap = await normalizeCustomerInput(
      req.body.customer,
      req.user.companyId
    );
    if (snap) {
      req.body.customer = snap;
      if (snap._id) req.body.customerId = snap._id;
    }
  }
  if (req.body.termsAndConditions !== undefined) {
    req.body.termsAndConditions = normalizeTerms(req.body.termsAndConditions);
  }

  // only save sendPerRow if present in body; do not alter root 'total' automatically
  const updated = await Quotation.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ApiError(404, "Quotation not found");

  updated.auditLogs.push({
    action: "update",
    user: req.user.uid,
    timestamp: new Date(),
    changes: req.body,
  });
  await updated.save();
  return res.json(new ApiResponse(200, updated, "Quotation updated"));
});

const getAllQuotations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, from, to } = req.query;
  const filter = { companyId: req.user.companyId };
  if (status) filter.status = status;
  if (from && to)
    filter.createdAt = { $gte: new Date(from), $lte: new Date(to) };

  const docs = await Quotation.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 })
    .lean();

  const quotations = docs.map((q) => ({
    ...q,
    computedTotal: computeGrandTotal(q.items || []),
  }));
  const total = await Quotation.countDocuments(filter);
  return res.json(new ApiResponse(200, { quotations, total }));
});

const approveQuotation = asyncHandler(async (req, res) => {
  let q = await Quotation.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { status: "accepted" } },
    { new: true }
  );
  if (!q) throw new ApiError(404, "Quotation not found");
  q.auditLogs.push({
    action: "approve",
    user: req.user.uid,
    timestamp: new Date(),
  });
  await q.save();
  return res.json(new ApiResponse(200, q, "Quotation approved"));
});

const rejectQuotation = asyncHandler(async (req, res) => {
  let q = await Quotation.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { status: "rejected" } },
    { new: true }
  );
  if (!q) throw new ApiError(404, "Quotation not found");
  q.auditLogs.push({
    action: "reject",
    user: req.user.uid,
    timestamp: new Date(),
  });
  await q.save();
  return res.json(new ApiResponse(200, q, "Quotation rejected"));
});

const generateQuotationPdf = asyncHandler(async (req, res) => {
  const { pdfUrl, note } = req.body;
  if (!pdfUrl) throw new ApiError(400, "pdfUrl is required");

  const q = await Quotation.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });
  if (!q) throw new ApiError(404, "Quotation not found");

  const version = (q.pdfSnapshots?.length || 0) + 1;
  q.pdfSnapshots.push({
    version,
    pdfUrl,
    note,
    generatedBy: req.user._id,
    generatedAt: new Date(),
  });
  await q.save();
  return res.json(new ApiResponse(200, q, "PDF snapshot saved"));
});
const searchQuotations = asyncHandler(async (req, res) => {
  const { q = "", limit = 50 } = req.query;
  const query = String(q || "").trim();
  if (!query) throw new ApiError(400, "Search query `q` is required.");

  const companyId = req.user.companyId;
  if (!companyId) throw new ApiError(400, "Missing companyId");

  const regex = { $regex: query, $options: "i" };
  const or = [
    { quotationNo: regex },
    { subject: regex },
    { notes: regex },
    { invoiceNo: regex },
    { "items.item": regex },
    { "items.description": regex },
    { "items.hsn": regex },
  ];

  // optional: match by ObjectId if looks like one
  if (/^[0-9a-fA-F]{24}$/.test(query)) {
    try {
      or.push({ _id: new mongoose.Types.ObjectId(query) });
    } catch (err) {
      // ignore
    }
  }

  // search matching customers (same company) and include their ids
  const matchingCustomers = await Customer.find({
    companyId,
    name: regex,
  }).select("_id");

  if (matchingCustomers && matchingCustomers.length) {
    const ids = matchingCustomers.map((c) => c._id);
    or.push({ customerId: { $in: ids } });
    or.push({ "customer.name": regex });
  }

  const docs = await Quotation.find({
    companyId,
    $or: or,
  })
    .populate("customer", "name gstin")
    .limit(Math.min(Number(limit) || 50, 500))
    .sort({ createdAt: -1 })
    .lean();

  if (!docs.length) throw new ApiError(404, "No quotations found matching your search.");

  return res.status(200).json(new ApiResponse(200, docs, "Quotations search results fetched successfully."));
});

export {
  createQuotation,
  getQuotationById,
  getAllQuotations,
  updateQuotation,
  approveQuotation,
  rejectQuotation,
  generateQuotationPdf,
  searchQuotations,
};
