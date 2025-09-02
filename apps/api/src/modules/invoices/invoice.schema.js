import mongoose from "mongoose";

const taxBreakupSchema = new mongoose.Schema(
  {
    description: String,
    hsn: String,
    taxableValue: Number,
    cgstRate: Number,
    cgstAmount: Number,
    sgstRate: Number,
    sgstAmount: Number,
    igstRate: Number,
    igstAmount: Number,
    total: Number,
  },
  { _id: false }
);

const pdfSnapshotSchema = new mongoose.Schema(
  {
    version: Number,
    pdfUrl: String,
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    generatedAt: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    // 🔹 Seller Info
    seller: {
      companyName: String,
      gstin: String,
      pan: String,
      address: String,
      state: String,
      stateCode: String,
      phone: String,
      email: String,
      bankName: String,
      accountNumber: String,
      ifsc: String,
      branch: String,
    },

    // 🔹 Invoice Metadata
    invoiceNo: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, default: Date.now },
    invoiceType: {
      type: String,
      enum: [
        "Tax Invoice",
        "Proforma Invoice",
        "Delivery Challan",
        "Original for Buyer",
        "Duplicate for Transporter",
      ],
      default: "Tax Invoice",
    },
    poNo: String,
    placeOfSupply: String,
    placeOfDelivery: String,
    dueDate: Date,
    notes: String,

    // 🔹 Buyer Info
    buyer: {
      name: String,
      gstin: String,
      pan: String,
      address: String,
      state: String,
      stateCode: String,
      phone: String,
      email: String,
    },

    // 🔹 Ship To Info
    shipTo: {
      name: String,
      address: String,
      state: String,
      stateCode: String,
      phone: String,
    },

    // 🔹 Items
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        description: String,
        hsn: String,
        quantity: Number,
        unit: String,
        rate: Number,
        discount: { type: Number, default: 0 },
        taxableValue: Number,
        cgstRate: Number,
        cgstAmount: Number,
        sgstRate: Number,
        sgstAmount: Number,
        igstRate: Number,
        igstAmount: Number,
        total: Number,
      },
    ],

    // 🔹 Tax Summary
    taxSummary: [taxBreakupSchema],

    // 🔹 Totals
    taxableValue: Number,
    totalCgst: Number,
    totalSgst: Number,
    totalIgst: Number,
    totalTax: Number,
    grandTotal: Number,
    totalInWords: String,

    // 🔹 Status & Audit
    status: {
      type: String,
      enum: ["draft", "approved", "paid", "void"],
      default: "draft",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    pdfSnapshots: [pdfSnapshotSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    auditLogs: [
      {
        action: String,
        user: String, // store Firebase UID directly
        timestamp: { type: Date, default: Date.now },
        changes: Object,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
