import Invoice from "./invoice.schema.js";
import Customer from "../catalog/customers/customer.schema.js";
import Product from "../catalog/products/product.schema.js";
import Counter from "../counter/counter.schema.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Company from "../company/company.schema.js";

const getNextInvoiceNo = async () => {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { _id: `invoice-${year}` },
    { $inc: { nextSeq: 1 } },
    { new: true, upsert: true }
  );

  return `INV-${year}-${counter.nextSeq}`;
};

const createInvoice = asyncHandler(async (req, res) => {
  const { customer, items, ...invoiceData } = req.body;

  // 1️⃣ Fetch seller (Company profile)
  const seller = await Company.findOne({});
  if (!seller) {
    throw new ApiError(
      400,
      "Company profile not set. Please configure seller info first."
    );
  }

  // 2️⃣ Handle Customer (auto-create if new)
  let existingCustomer = await Customer.findOne({
    $or: [
      { gstin: customer.gstin?.toUpperCase() },
      { email: customer.email?.toLowerCase() },
      { phone: customer.phone },
    ],
  });

  if (!existingCustomer) {
    existingCustomer = await Customer.create(customer);
  }

  // 3️⃣ Handle Products + Calculate Totals
  let subtotal = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0;

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      let product = await Product.findOne({ name: item.name, hsn: item.hsn });
      if (!product) product = await Product.create(item);

      const taxableValue = item.quantity * item.rate - (item.discount || 0);

      let cgstAmount = 0,
        sgstAmount = 0,
        igstAmount = 0;

      // GST split logic → compare seller vs buyer state
      if (seller.stateCode === customer.stateCode) {
        cgstAmount = (taxableValue * item.gstRate) / 200;
        sgstAmount = (taxableValue * item.gstRate) / 200;
      } else {
        igstAmount = (taxableValue * item.gstRate) / 100;
      }

      subtotal += taxableValue;
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;

      return {
        ...item,
        product: product._id,
        taxableValue,
        cgstAmount,
        sgstAmount,
        igstAmount,
        total: taxableValue + cgstAmount + sgstAmount + igstAmount,
      };
    })
  );

  const grandTotal = subtotal + totalCgst + totalSgst + totalIgst;

  // 4️⃣ Assign Invoice No
  const invoiceNo = await getNextInvoiceNo();

  // 5️⃣ Save Invoice with Seller info copied
  const newInvoice = await Invoice.create({
    invoiceNo,
    seller, // ⬅️ Copy entire company profile snapshot
    customer: existingCustomer._id,
    items: enrichedItems,
    subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax: totalCgst + totalSgst + totalIgst,
    grandTotal,
    ...invoiceData,
    auditLogs: [
      { action: "create", user: req.user.uid, timestamp: new Date() },
    ],
  });

  if (!newInvoice) {
    throw new ApiError(500, "Invoice creation failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, newInvoice, "Invoice created successfully"));
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate("customer")
    .populate("items.product");
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice));
});

const getAllInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, customer, from, to } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (customer) filter.customer = customer;
  if (from && to)
    filter.invoiceDate = { $gte: new Date(from), $lte: new Date(to) };

  const invoices = await Invoice.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Invoice.countDocuments(filter);
  res.json(new ApiResponse(200, { invoices, total }));
});

const updateInvoice = asyncHandler(async (req, res) => {
  const updated = await Invoice.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ApiError(404, "Invoice not found");
  updated.auditLogs.push({
    action: "update",
    user: req.user.uid,
    timestamp: new Date(),
    changes: req.body,
  });
  await updated.save();
  res.json(new ApiResponse(200, updated, "Invoice updated"));
});

const approveInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "approved" } },
    { new: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice approved"));
});

const markInvoicePaid = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { $set: { paymentStatus: req.body.paymentStatus } },
    { new: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice marked paid"));
});

const voidInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { $set: { status: "void" } },
    { new: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice voided"));
});

const generatePdfSnapshot = asyncHandler(async (req, res) => {
  const { pdfUrl } = req.body;
  if (!pdfUrl) throw new ApiError(400, "pdfUrl is required");

  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, "Invoice not found");

  const version = invoice.pdfSnapshots.length + 1;
  invoice.pdfSnapshots.push({
    version,
    pdfUrl,
    generatedBy: req.user.uid,
  });
  await invoice.save();

  res.json(new ApiResponse(200, invoice, "PDF snapshot added"));
});

const searchInvoices = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    throw new ApiError(400, "Search query `q` is required.");
  }

  // 🔍 Build search query
  const searchQuery = {
    $or: [
      { invoiceNo: { $regex: q, $options: "i" } },
      { poNo: { $regex: q, $options: "i" } },
      { notes: { $regex: q, $options: "i" } },
    ],
  };

  // If q looks like MongoDB ObjectId, allow searching by ID too
  if (/^[0-9a-fA-F]{24}$/.test(q)) {
    searchQuery.$or.push({ _id: q });
  }

  // Populate customer for better search results
  const invoices = await Invoice.find(searchQuery)
    .populate("customer", "name gstin")
    .limit(20) // limit for performance
    .sort({ createdAt: -1 });

  if (!invoices.length) {
    throw new ApiError(404, "No invoices found matching your search.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        invoices,
        "Invoices search results fetched successfully."
      )
    );
});

export {
  createInvoice,
  getInvoiceById,
  getAllInvoices,
  updateInvoice,
  approveInvoice,
  markInvoicePaid,
  voidInvoice,
  generatePdfSnapshot,
  searchInvoices,
};
