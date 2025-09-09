import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hsn: {
      type: String,
      trim: true,
      index: true,
    },
    purchasePrice: {
      type: Number,
      min: 0,
    },
    sellPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    gstTax: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes
productSchema.index({ companyId: 1, name: 1 }, { unique: true });
productSchema.index({ companyId: 1, hsn: 1 });

// Only fetch active products
productSchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

export default mongoose.model("Product", productSchema);
