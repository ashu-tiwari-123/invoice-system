import Company from "./company.schema.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import User from "../users/user.schema.js";


const upsertCompany = asyncHandler(async (req, res) => {
  const updateData = req.body;
  const userId = req.user._id;

  const company = await Company.findOneAndUpdate(
    { owner: userId },                  
    { ...updateData, owner: userId },
    { new: true, upsert: true }
  );
  await User.updateOne(
    { _id: userId },
    { $set: { companyId: company._id } }
  );

  res.status(200).json(new ApiResponse(200, company, "Company saved & linked"));
});

const getCompany = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const company = await Company.findOne({ owner: userId });
  if (!company) {
    return res.json(new ApiResponse(200, { exists: false }, "No company yet"));
  }
  return res.json(new ApiResponse(200, { exists: true, ...company.toObject() }, "Company profile fetched"));
});


export { upsertCompany, getCompany };
