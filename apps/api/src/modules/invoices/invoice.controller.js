import Invoice from "./invoice.schema.js";
import Customer from "../catalog/customers/customer.schema.js";
import Product from "../catalog/products/product.schema.js";
import Counter from "../counter/counter.schema.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import Company from "../company/company.schema.js";
import mongoose from "mongoose";

const getNextInvoiceNo = async (companyId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let fyStart, fyEnd;
  if (month >= 3) {
    fyStart = year % 100;
    fyEnd = (year + 1) % 100;
  } else {
    fyStart = (year - 1) % 100;
    fyEnd = year % 100;
  }
  const fyString = `${String(fyStart).padStart(2, "0")}-${String(fyEnd).padStart(2, "0")}`;
  const key = `invoice-${companyId}-${fyString}`;
  const counter = await Counter.findOneAndUpdate(
    { _id: key },
    {
      $inc: { nextSeq: 1 },
      $setOnInsert: { createdAt: new Date() },
    },
    { new: true, upsert: true }
  );
  const seq = String(counter.nextSeq).padStart(4, "0");
  return `${seq}-${fyString}`;
};

// Very small INR converter (supports up to 9999 crore; adds paise for decimals)
function inrToWords(n) {
  if (isNaN(n)) return "";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const numToWords = (num) => {
    if (num === 0) return "Zero";
    const two = (n) =>
      n < 20
        ? a[n]
        : `${b[Math.floor(n / 10)]}${n % 10 ? " " + a[n % 10] : ""}`.trim();
    const three = (n) => {
      let str = "";
      const h = Math.floor(n / 100);
      const rem = n % 100;
      if (h) str += a[h] + " Hundred";
      if (rem) str += (str ? " " : "") + two(rem);
      return str;
    };
    // Indian grouping: crore, lakh, thousand, hundred
    let crores = Math.floor(num / 10000000);
    num %= 10000000;
    let lakhs = Math.floor(num / 100000);
    num %= 100000;
    let thousands = Math.floor(num / 1000);
    num %= 1000;
    let hundreds = num;
    let out = [];
    if (crores) out.push(three(crores) + " Crore");
    if (lakhs) out.push(three(lakhs) + " Lakh");
    if (thousands) out.push(three(thousands) + " Thousand");
    if (hundreds) out.push(three(hundreds));
    return out.join(" ").trim();
  };
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  const rupeesWords = numToWords(rupees) + " Rupees";
  const paiseWords = paise ? " and " + numToWords(paise) + " Paise" : "";
  return (rupeesWords + paiseWords + " Only").replace(/\s+/g, " ").trim();
}

/* ------------------------------ Create Invoice ----------------------------- */
const isObjectIdLike = (v) => {
  return typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
};

const normalizeCustomerInput = (raw) => {
  if (!raw) return {};
  // if it's an object already, copy relevant fields
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return {
      _id: raw._id || undefined,
      name: raw.name || raw.displayName || "",
      gstin: raw.gstin ? String(raw.gstin).toUpperCase() : undefined,
      pan: raw.pan || undefined,
      address: raw.address || undefined,
      state: raw.state || undefined,
      stateCode:
        raw.stateCode !== undefined && raw.stateCode !== null
          ? String(raw.stateCode)
          : undefined,
      phone: raw.phone || undefined,
      email: raw.email ? String(raw.email).toLowerCase() : undefined,
    };
  }

  // if it's a plain string (probably an ObjectId), return as id
  if (typeof raw === "string") {
    return { _id: raw };
  }

  return {};
};

const createInvoice = asyncHandler(async (req, res) => {
  const {
    customer: rawCustomer,
    items,
    shipTo: shipToReq,
    ...invoiceData
  } = req.body;

  if (!req.user?.companyId) {
    throw new ApiError(400, "No company scope found on user.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(
      400,
      "At least one item is required to create an invoice."
    );
  }

  // 1) Snapshot Seller
  const sellerDoc = await Company.findOne({ _id: req.user.companyId }).lean();
  if (!sellerDoc) {
    throw new ApiError(
      400,
      "Company profile not set. Please configure seller info first."
    );
  }
  const seller = {
    companyName: sellerDoc.companyName,
    gstin: sellerDoc.gstin,
    pan: sellerDoc.pan,
    address: sellerDoc.address,
    state: sellerDoc.state,
    stateCode:
      sellerDoc.stateCode !== undefined && sellerDoc.stateCode !== null
        ? String(sellerDoc.stateCode)
        : sellerDoc.stateCode,
    phone: sellerDoc.phone,
    email: sellerDoc.email,
    bankName: sellerDoc.bankName,
    accountNumber: sellerDoc.accountNumber,
    ifsc: sellerDoc.ifsc,
    branch: sellerDoc.branch,
    name: sellerDoc.name,
  };

  // 2) Resolve / upsert Customer robustly
  const customerInput = normalizeCustomerInput(rawCustomer);

  let existingCustomer = null;

  // If input contains an _id or is an ObjectId string, try load by id (scoped to company)
  if (customerInput._id && isObjectIdLike(customerInput._id)) {
    existingCustomer = await Customer.findOne({
      _id: customerInput._id,
      companyId: req.user.companyId,
    });
  }

  // If no id match, try to find by unique identifiers (gstin / email / phone)
  if (!existingCustomer) {
    const orClauses = [];
    if (customerInput.gstin) orClauses.push({ gstin: customerInput.gstin });
    if (customerInput.email) orClauses.push({ email: customerInput.email });
    if (customerInput.phone) orClauses.push({ phone: customerInput.phone });

    if (orClauses.length > 0) {
      existingCustomer = await Customer.findOne({
        companyId: req.user.companyId,
        $or: orClauses,
      });
    }
  }

  // If still not found, create a new customer (ONLY when customerInput has object-like fields)
  if (!existingCustomer) {
    // Only attempt to create if we have at least a name (avoid creating empty records)
    const createPayload = {
      companyId: req.user.companyId,
      name:
        customerInput.name ||
        (typeof rawCustomer === "object" ? rawCustomer.name : undefined),
      gstin: customerInput.gstin || undefined,
      pan: customerInput.pan || undefined,
      address: customerInput.address || undefined,
      state: customerInput.state || undefined,
      stateCode: customerInput.stateCode || undefined,
      phone: customerInput.phone || undefined,
      email: customerInput.email || undefined,
    };

    // If there's no usable data (e.g. frontend sent only an empty string), avoid creating and leave existingCustomer null.
    const hasEnough =
      createPayload.name ||
      createPayload.gstin ||
      createPayload.email ||
      createPayload.phone;
    if (hasEnough) {
      existingCustomer = await Customer.create(createPayload);
    } else {
      // No customer info — keep existingCustomer null and continue (buyer will be built from customerInput or invoice payload)
      existingCustomer = null;
    }
  }

  // 3) Buyer & ShipTo snapshots (immutable)
  // Prefer populated existingCustomer fields, then fall back to provided customerInput/rawCustomer
  const buyerSource = existingCustomer || customerInput || {};

  const buyer = {
    name: buyerSource.name || invoiceData?.buyer?.name || "",
    gstin: (buyerSource.gstin || invoiceData?.buyer?.gstin || "")
      .toString()
      .toUpperCase(),
    pan: buyerSource.pan || invoiceData?.buyer?.pan || "",
    address: buyerSource.address || invoiceData?.buyer?.address || "",
    state: buyerSource.state || invoiceData?.buyer?.state || "",
    stateCode:
      (buyerSource.stateCode !== undefined && buyerSource.stateCode !== null
        ? String(buyerSource.stateCode)
        : invoiceData?.buyer?.stateCode !== undefined &&
            invoiceData?.buyer?.stateCode !== null
          ? String(invoiceData.buyer.stateCode)
          : "") || "",
    phone: buyerSource.phone || invoiceData?.buyer?.phone || "",
    email: (buyerSource.email || invoiceData?.buyer?.email || "").toLowerCase(),
  };

  const shipTo = {
    name: shipToReq?.name || buyer.name,
    address: shipToReq?.address || buyer.address,
    state: shipToReq?.state || buyer.state,
    stateCode:
      shipToReq?.stateCode !== undefined && shipToReq?.stateCode !== null
        ? String(shipToReq.stateCode)
        : buyer.stateCode,
    phone: shipToReq?.phone || buyer.phone,
    gstin: shipToReq?.gstin || buyer.gstin,
  };

  // 4) Build Items + Totals (use ship-to for tax split)
  let subtotal = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0;

  const mapProductPayload = (item, companyId) => ({
    companyId,
    name: item.name || item.description || "Unnamed",
    hsn: item.hsn || "",
    purchasePrice:
      typeof item.purchasePrice === "number"
        ? item.purchasePrice
        : Number(item.rate || 0),
    sellPrice:
      typeof item.sellPrice === "number"
        ? item.sellPrice
        : Number(item.rate || 0),
    gstTax:
      typeof item.gstTax === "number" ? item.gstTax : Number(item.gstRate || 0),
  });

  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      // Upsert product (scoped by company, match by name + hsn)
      let product = await Product.findOne({
        companyId: req.user.companyId,
        name: item.name || item.description,
        hsn: item.hsn || "",
      });

      if (!product) {
        product = await Product.create(
          mapProductPayload(item, req.user.companyId)
        );
      } else {
        const patch = {};
        if (product.purchasePrice == null)
          patch.purchasePrice = Number(item.rate || 0);
        if (product.sellPrice == null) patch.sellPrice = Number(item.rate || 0);
        if (product.gstTax == null) patch.gstTax = Number(item.gstRate || 0);
        if (Object.keys(patch).length) {
          await Product.updateOne(
            { _id: product._id, companyId: req.user.companyId },
            { $set: patch }
          );
          product = await Product.findById(product._id);
        }
      }

      const lineBase = Number(item.quantity || 0) * Number(item.rate || 0);
      const pct = Number(item.discountPct || 0);
      const abs = Number(item.discount || 0);
      const discountAmt = pct > 0 ? (lineBase * pct) / 100 : abs;
      const taxableValue = Math.max(0, lineBase - discountAmt);

      const gstRate = Number(
        item.gstRate ??(item.cgstRate || 0) + (item.sgstRate || 0) + (item.igstRate || 0) ??
          0
      );

      const destStateCode = shipTo?.stateCode || buyer?.stateCode || "";
      let cgstAmount = 0,
        sgstAmount = 0,
        igstAmount = 0;
      let cgstRate = 0,
        sgstRate = 0,
        igstRate = 0;

      if (
        seller.stateCode &&
        destStateCode &&
        seller.stateCode === destStateCode
      ) {
        cgstAmount = (taxableValue * gstRate) / 200;
        sgstAmount = (taxableValue * gstRate) / 200;
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
      } else {
        igstAmount = (taxableValue * gstRate) / 100;
        igstRate = gstRate;
      }

      subtotal += taxableValue;
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;

      return {
        product: product._id,
        name: item.name,
        description: item.description,
        hsn: item.hsn || "",
        quantity: Number(item.quantity || 0),
        unit: item.unit || "",
        rate: Number(item.rate || 0),
        discount: abs,
        taxableValue,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        total: taxableValue + cgstAmount + sgstAmount + igstAmount,
      };
    })
  );

  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = subtotal + totalTax;

  // 5) HSN-wise taxSummary
  const taxSummaryMap = new Map();
  for (const it of enrichedItems) {
    const key = `${it.hsn}|${it.cgstRate}|${it.sgstRate}|${it.igstRate}`;
    const prev = taxSummaryMap.get(key) || {
      description: it.description || it.name || "",
      hsn: it.hsn || "",
      taxableValue: 0,
      cgstRate: it.cgstRate || 0,
      cgstAmount: 0,
      sgstRate: it.sgstRate || 0,
      sgstAmount: 0,
      igstRate: it.igstRate || 0,
      igstAmount: 0,
      total: 0,
    };
    prev.taxableValue += it.taxableValue || 0;
    prev.cgstAmount += it.cgstAmount || 0;
    prev.sgstAmount += it.sgstAmount || 0;
    prev.igstAmount += it.igstAmount || 0;
    prev.total += it.total || 0;
    taxSummaryMap.set(key, prev);
  }
  const taxSummary = Array.from(taxSummaryMap.values());

  // 6) Invoice No
  const invoiceNo = await getNextInvoiceNo(req.user.companyId);

  // 7) Persist invoice
  const newInvoice = await Invoice.create({
    companyId: req.user.companyId,
    invoiceNo,
    invoiceType: invoiceData.invoiceType,
    invoiceDate: invoiceData.invoiceDate,
    poNo: invoiceData.poNo,
    placeOfSupply: invoiceData.placeOfSupply,
    placeOfDelivery: invoiceData.placeOfDelivery,
    dueDate: invoiceData.dueDate,
    notes: invoiceData.notes,

    seller,
    buyer,
    shipTo,

    customer: existingCustomer ? existingCustomer._id : undefined,

    items: enrichedItems,
    taxSummary,

    taxableValue: subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    totalInWords: inrToWords(Number(grandTotal.toFixed(2))),

    createdBy: req.user._id || undefined,
    createdByUid: req.user.uid,
    auditLogs: [
      { action: "create", user: req.user.uid, timestamp: new Date() },
    ],
  });

  if (!newInvoice) throw new ApiError(500, "Invoice creation failed");

  return res
    .status(201)
    .json(new ApiResponse(201, newInvoice, "Invoice created successfully"));
});
/* ----------------------------- Read / List APIs ---------------------------- */

const getInvoiceById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "Invalid invoice id");
  }
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  })
    .populate("customer")
    .populate("items.product")
    .populate("companyId");

  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice));
});

const getAllInvoices = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    customer,
    from,
    to,
  } = req.query;

  const filter = { companyId: req.user.companyId };
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;

  // allow filter by customer ObjectId (ref now exists)
  if (customer && mongoose.isValidObjectId(customer))
    filter.customer = customer;

  if (from && to) {
    const fromD = new Date(from);
    const toD = new Date(to);
    if (!isNaN(fromD) && !isNaN(toD)) {
      filter.invoiceDate = { $gte: fromD, $lte: toD };
    }
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    Invoice.countDocuments(filter),
  ]);

  res.json(new ApiResponse(200, { invoices, total }));
});

/* ----------------------------- Mutating actions ---------------------------- */

const updateInvoice = asyncHandler(async (req, res) => {
  const {
    customer,
    items,
    shipTo: shipToReq,
    buyer: buyerReq,
    ...invoiceData
  } = req.body;

  // Fetch the invoice in-scope
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  }).populate("items.product");

  if (!invoice) throw new ApiError(404, "Invoice not found");

  // --- Resolve seller snapshot (prefer existing; fallback to company) ---
  let seller = invoice.seller;
  if (!seller || !seller.stateCode) {
    const sellerDoc = await Company.findOne({ _id: req.user.companyId }).lean();
    if (!sellerDoc)
      throw new ApiError(
        400,
        "Company profile not set. Please configure seller info first."
      );
    seller = {
      companyName: sellerDoc.companyName,
      gstin: sellerDoc.gstin,
      pan: sellerDoc.pan,
      address: sellerDoc.address,
      state: sellerDoc.state,
      stateCode: sellerDoc.stateCode,
      phone: sellerDoc.phone,
      email: sellerDoc.email,
      bankName: sellerDoc.bankName,
      accountNumber: sellerDoc.accountNumber,
      ifsc: sellerDoc.ifsc,
      branch: sellerDoc.branch,
    };
  }

  // --- Snapshots to use for tax split ---
  const buyerSnap = buyerReq
    ? {
        ...invoice.buyer,
        ...buyerReq,
        gstin: buyerReq.gstin
          ? String(buyerReq.gstin).toUpperCase()
          : invoice.buyer?.gstin || "",
        email: buyerReq.email
          ? String(buyerReq.email).toLowerCase()
          : invoice.buyer?.email || "",
      }
    : invoice.buyer;

  const shipToSnap = shipToReq
    ? {
        ...invoice.shipTo,
        ...shipToReq,
      }
    : invoice.shipTo;

  // --- Helper: build product payload like in create ---
  const mapProductPayload = (item, companyId) => ({
    companyId,
    name: item.name || item.description || "Unnamed",
    hsn: item.hsn || "",
    purchasePrice:
      typeof item.purchasePrice === "number"
        ? item.purchasePrice
        : Number(item.rate || 0),
    sellPrice:
      typeof item.sellPrice === "number"
        ? item.sellPrice
        : Number(item.rate || 0),
    gstTax:
      typeof item.gstTax === "number" ? item.gstTax : Number(item.gstRate || 0),
  });

  // --- Determine the base items to recompute from ---
  // If client sent new items: use those (and upsert products).
  // Else: derive base items from existing enriched lines so we can re-split taxes if shipTo/buyer changed.
  const clientSuppliedItems = Array.isArray(items) && items.length > 0;
  const baseItems = clientSuppliedItems
    ? items.map((it) => ({
        // expected minimal fields from UI
        name: it.name || it.description,
        description: it.description,
        hsn: it.hsn || "",
        quantity: Number(it.quantity || 0),
        unit: it.unit || "",
        rate: Number(it.rate || 0),
        discount: Number(it.discount || 0),
        discountPct: Number(it.discountPct || 0),
        gstRate: Number(
          it.gstRate ??
            (Number(it.cgstRate || 0) +
              Number(it.sgstRate || 0) +
              Number(it.igstRate || 0) ||
              0)
        ),
      }))
    : invoice.items.map((it) => ({
        // derive a minimal shape from existing enriched lines
        name: it.name || it.description || it.product?.name,
        description: it.description || it.name || it.product?.name,
        hsn: it.hsn || it.product?.hsn || "",
        quantity: Number(it.quantity || 0),
        unit: it.unit || "",
        rate: Number(it.rate || 0),
        discount: Number(it.discount || 0),
        discountPct: 0,
        gstRate: Number(
          (it.gstRate != null
            ? it.gstRate
            : Number(it.cgstRate || 0) +
              Number(it.sgstRate || 0) +
              Number(it.igstRate || 0)) || 0
        ),
        // keep original product id if present (so we don't recreate)
        _productId: it.product?._id || it.product || null,
      }));

  // --- Enrich lines + compute totals/tax split ---
  let subtotal = 0,
    totalCgst = 0,
    totalSgst = 0,
    totalIgst = 0;

  const enrichedItems = await Promise.all(
    baseItems.map(async (item) => {
      // Reuse existing product if available and client didn't send items
      let product;
      if (!clientSuppliedItems && item._productId) {
        product = await Product.findOne({
          _id: item._productId,
          companyId: req.user.companyId,
        });
      }

      // Upsert product when client sent items OR no product found
      if (!product) {
        // Find by name+hsn within company
        product = await Product.findOne({
          companyId: req.user.companyId,
          name: item.name || item.description,
          hsn: item.hsn || "",
        });
        if (!product) {
          product = await Product.create(
            mapProductPayload(item, req.user.companyId)
          );
        } else {
          const patch = {};
          if (product.purchasePrice == null)
            patch.purchasePrice = Number(item.rate || 0);
          if (product.sellPrice == null)
            patch.sellPrice = Number(item.rate || 0);
          if (product.gstTax == null) patch.gstTax = Number(item.gstRate || 0);
          if (Object.keys(patch).length) {
            await Product.updateOne(
              { _id: product._id, companyId: req.user.companyId },
              { $set: patch }
            );
            product = await Product.findById(product._id);
          }
        }
      }

      const lineBase = Number(item.quantity || 0) * Number(item.rate || 0);
      const pct = Number(item.discountPct || 0);
      const abs = Number(item.discount || 0);
      const discountAmt = pct > 0 ? (lineBase * pct) / 100 : abs;
      const taxableValue = Math.max(0, lineBase - discountAmt);

      const gstRate = Number(item.gstRate || 0);
      const destStateCode = shipToSnap?.stateCode || buyerSnap?.stateCode || "";

      let cgstAmount = 0,
        sgstAmount = 0,
        igstAmount = 0;
      let cgstRate = 0,
        sgstRate = 0,
        igstRate = 0;

      if (
        seller.stateCode &&
        destStateCode &&
        String(seller.stateCode) === String(destStateCode)
      ) {
        cgstAmount = (taxableValue * gstRate) / 200;
        sgstAmount = (taxableValue * gstRate) / 200;
        cgstRate = gstRate / 2;
        sgstRate = gstRate / 2;
      } else {
        igstAmount = (taxableValue * gstRate) / 100;
        igstRate = gstRate;
      }

      subtotal += taxableValue;
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;

      return {
        product: product._id,
        name: item.name,
        description: item.description,
        hsn: item.hsn || "",
        quantity: Number(item.quantity || 0),
        unit: item.unit || "",
        rate: Number(item.rate || 0),
        discount: discountAmt,
        taxableValue,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        total: taxableValue + cgstAmount + sgstAmount + igstAmount,
      };
    })
  );

  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = subtotal + totalTax;

  // --- Rebuild HSN-wise taxSummary ---
  const taxSummaryMap = new Map();
  for (const it of enrichedItems) {
    const key = `${it.hsn}|${it.cgstRate}|${it.sgstRate}|${it.igstRate}`;
    const prev = taxSummaryMap.get(key) || {
      description: it.description || it.name || "",
      hsn: it.hsn || "",
      taxableValue: 0,
      cgstRate: it.cgstRate || 0,
      cgstAmount: 0,
      sgstRate: it.sgstRate || 0,
      sgstAmount: 0,
      igstRate: it.igstRate || 0,
      igstAmount: 0,
      total: 0,
    };
    prev.taxableValue += it.taxableValue || 0;
    prev.cgstAmount += it.cgstAmount || 0;
    prev.sgstAmount += it.sgstAmount || 0;
    prev.igstAmount += it.igstAmount || 0;
    prev.total += it.total || 0;
    taxSummaryMap.set(key, prev);
  }
  const taxSummary = Array.from(taxSummaryMap.values());

  // --- Safe assignment (do not blindly $set req.body) ---
  invoice.set({
    // metadata (only what's allowed)
    invoiceType: invoiceData.invoiceType ?? invoice.invoiceType,
    invoiceDate: invoiceData.invoiceDate ?? invoice.invoiceDate,
    poNo: invoiceData.poNo ?? invoice.poNo,
    placeOfSupply: invoiceData.placeOfSupply ?? invoice.placeOfSupply,
    placeOfDelivery: invoiceData.placeOfDelivery ?? invoice.placeOfDelivery,
    dueDate: invoiceData.dueDate ?? invoice.dueDate,
    notes: invoiceData.notes ?? invoice.notes,

    // snapshots
    seller, // keep/refresh seller snapshot
    buyer: buyerSnap,
    shipTo: shipToSnap,

    // recomputed lines & taxes
    items: enrichedItems,
    taxSummary,
    taxableValue: subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    totalInWords: inrToWords(Number(grandTotal.toFixed(2))),
  });

  // --- Customer ref must remain an ObjectId ---
  if (customer && mongoose.isValidObjectId(customer)) {
    invoice.customer = customer;
  }
  // If client accidentally sent an object here, ignore; the buyer snapshot already captured it.

  // --- Audit ---
  invoice.auditLogs.push({
    action: "update",
    user: req.user.uid,
    timestamp: new Date(),
    changes: req.body,
  });
  invoice.updatedBy = req.user._id || undefined;
  invoice.updatedByUid = req.user.uid;

  await invoice.save();

  res.json(new ApiResponse(200, invoice, "Invoice updated"));
});

const approveInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { status: "approved" } },
    { new: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice approved"));
});

const markInvoicePaid = asyncHandler(async (req, res) => {
  const allowed = ["unpaid", "partial", "paid"];
  const next = String(req.body.paymentStatus || "").toLowerCase();
  if (!allowed.includes(next)) {
    throw new ApiError(
      400,
      "paymentStatus must be one of: unpaid | partial | paid"
    );
  }
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { paymentStatus: next } },
    { new: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice marked paid"));
});

const voidInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { status: "void" } },
    { new: true }
  );
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.json(new ApiResponse(200, invoice, "Invoice voided"));
});

/* ------------------------------- PDF snapshots ------------------------------ */

const generatePdfSnapshot = asyncHandler(async (req, res) => {
  const { pdfUrl, note } = req.body;
  if (!pdfUrl) throw new ApiError(400, "pdfUrl is required");

  const invoice = await Invoice.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });

  if (!invoice) throw new ApiError(404, "Invoice not found");

  const version = (invoice.pdfSnapshots?.length || 0) + 1;
  invoice.pdfSnapshots.push({
    version,
    pdfUrl,
    generatedBy: req.user._id || undefined,
    generatedByUid: req.user.uid,
    note,
  });

  await invoice.save();

  res.json(new ApiResponse(200, invoice, "PDF snapshot added"));
});

/* ---------------------------------- Search --------------------------------- */

const searchInvoices = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) throw new ApiError(400, "Search query `q` is required.");

  // base OR conditions (invoice fields)
  const or = [
    { invoiceNo: { $regex: q, $options: "i" } },
    { poNo: { $regex: q, $options: "i" } },
    { notes: { $regex: q, $options: "i" } },
  ];

  // If query looks like an ObjectId, search by _id too
  if (/^[0-9a-fA-F]{24}$/.test(q)) {
    try {
      or.push({ _id: new mongoose.Types.ObjectId(q) });
    } catch (err) {
      console.log(err);
      
    }
  }

  // --- NEW: search customers (client name) and add matching ids ---
  // Find customers within the same tenant/company that match the query in name
  const matchingCustomers = await Customer.find({
    companyId: req.user.companyId,
    name: { $regex: q, $options: "i" },
  }).select("_id");

  if (matchingCustomers && matchingCustomers.length) {
    const ids = matchingCustomers.map((c) => c._id);
    or.push({ customer: { $in: ids } });
  }

  // Execute invoice query restricted by companyId
  const invoices = await Invoice.find({
    companyId: req.user.companyId,
    $or: or,
  })
    .populate("customer", "name gstin")
    .limit(20)
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
