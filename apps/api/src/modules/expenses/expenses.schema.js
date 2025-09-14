import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String },
    user: { type: String },
    at: { type: Date, default: Date.now },
    note: { type: String },
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["Delivery", "Commission", "Rent", "Salary", "Utilities", "Other"],
      required: true,
      trim: true,
    },

    description: { type: String, trim: true, default: "" },

    amount: { type: Number, required: true, min: 0 },

    date: { type: Date, default: Date.now },

    // optional link to invoice
    linkedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice", index: true },

    createdBy: { type: String, default: "system" },

    isDeleted: { type: Boolean, default: false, index: true },

    auditLogs: { type: [auditLogSchema], default: [] },
  },
  { timestamps: true }
);

// helpful compound index for common queries
expenseSchema.index({ companyId: 1, date: -1 });
expenseSchema.index({ companyId: 1, type: 1 });

export default mongoose.model("Expense", expenseSchema);
