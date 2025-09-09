import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gstin: { type: String, required: true, unique: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // 👈 link company to a user
    pan: String,
    address: String,
    state: String,
    stateCode: String,
    phone: String,
    email: String,
    bankName: String,
    accountNumber: String,
    ifsc: String,
    branch: String,
  },
  { timestamps: true }
);

export default mongoose.model("Company", companySchema);
