import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    pan: {
      type: String,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      index: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

customerSchema.index({ name: 1, phone: 1 });

customerSchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

export default mongoose.model("Customer", customerSchema);
