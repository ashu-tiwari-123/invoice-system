import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Delivery", "Commission", "Rent", "Salary", "Utilities", "Other"],
      required: true,
    },
    description: { type: String },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    linkedInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }, // optional
    createdBy: String,
  },
  { timestamps: true }
);

export default mongoose.model("Expense", expenseSchema);
