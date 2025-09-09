import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    vendor: {
      name: String,
      gstin: String,
      contact: String,
    },
    description: String, // e.g. "Base product", "Laser engraving"
    amount: { type: Number, required: true },
  },

  { _id: false }
);

const purchaseRecordSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    // src/modules/purchase/purchase.schema.js
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
      required: true,
    },

    purchases: [purchaseSchema],
    totalPurchaseCost: { type: Number, default: 0 },
    createdBy: String, // Firebase UID
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("PurchaseRecord", purchaseRecordSchema);
