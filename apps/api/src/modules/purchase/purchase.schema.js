import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    vendor: {
      name: { type: String, trim: true },
      gstin: { type: String, trim: true },
      contact: { type: String, trim: true },
    },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseRecordSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
      required: true,
    },
    purchases: [purchaseSchema],
    totalPurchaseCost: { type: Number, default: 0 },
    createdBy: { type: String, default: "system" }, // Firebase UID or system
    isDeleted: { type: Boolean, default: false },
    auditLogs: [
      {
        action: String,
        user: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const PurchaseRecord = mongoose.model("PurchaseRecord", purchaseRecordSchema);
export default PurchaseRecord;
