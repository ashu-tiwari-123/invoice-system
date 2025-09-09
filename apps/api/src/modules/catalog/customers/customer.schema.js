// src/modules/catalog/customers/customer.schema.js
import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true },
    gstin: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    }, // globally unique
    pan: { type: String, sparse: true, uppercase: true, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    stateCode: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for uniqueness
customerSchema.index(
  { companyId: 1, email: 1 },
  { unique: true, sparse: true }
);
customerSchema.index(
  { companyId: 1, phone: 1 },
  { unique: true, sparse: true }
);

// Text search
customerSchema.index({ name: "text", email: "text", phone: "text" });

// Auto-filter inactive
customerSchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

export default mongoose.model("Customer", customerSchema);
