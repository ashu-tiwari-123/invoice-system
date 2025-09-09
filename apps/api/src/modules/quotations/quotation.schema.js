import mongoose from "mongoose";

const customColumnSchema = new mongoose.Schema(
  {
    key: String, // e.g. "qty100" or "deliveryDate"
    label: String, // e.g. "Qty (100)" or "Delivery Date"
    type: { type: String, default: "string" }, // string, number, date
  },
  { _id: false }
);

const quotationItemSchema = new mongoose.Schema(
  {
    sno: Number,
    item: String,
    columns: mongoose.Schema.Types.Mixed,
    // Example:
    // { qty: 10, price: 50, total: 500 }
    // or { qty100: 480, qty200: 450, qty300: 400 }
  },
  { _id: false }
);

const quotationSchema = new mongoose.Schema(
  {
    quotationNo: { type: String, required: true, unique: true }, // QUO-2025-001
    date: { type: Date, default: Date.now },
    subject: String,

    customer: {
      name: String,
      gstin: String,
      address: String,
      state: String,
      stateCode: String,
      phone: String,
      email: String,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      index: true,
      required: false,
    },
    invoiceNo: {
      type: String,
      required: false,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
      required: true,
    },
    // Customizable table
    customColumns: [customColumnSchema], // defines structure
    items: [quotationItemSchema], // stores row data

    termsAndConditions: { type: [String], default: [] }, // flexible T&C list
    notes: String,

    total: Number,
    sendPerRow: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected"],
      default: "draft",
    },

    pdfSnapshots: [
      {
        version: Number,
        pdfUrl: String,
        generatedBy: String, // Firebase UID
        generatedAt: { type: Date, default: Date.now },
      },
    ],

    auditLogs: [
      {
        action: String,
        user: String, // Firebase UID
        timestamp: { type: Date, default: Date.now },
        changes: Object,
      },
    ],
  },
  { timestamps: true }
);
quotationSchema.index({ companyId: 1, quotationNo: 1 }, { unique: true });
export default mongoose.model("Quotation", quotationSchema);
