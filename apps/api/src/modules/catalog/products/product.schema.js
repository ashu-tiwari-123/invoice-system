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
      required: true,
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
  },
  { timestamps: true }
);

productSchema.index({ name: 1, hsn: 1 });

productSchema.pre(/^find/, function (next) {
  this.where({ isActive: { $ne: false } });
  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;
