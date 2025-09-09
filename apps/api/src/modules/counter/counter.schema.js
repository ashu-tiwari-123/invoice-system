import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g., "invoice-2025"
    nextSeq: { type: Number, default: 1 }, // sequence number
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
  },
  { versionKey: false } // don’t need __v field
);

export default mongoose.model("Counter", counterSchema);
