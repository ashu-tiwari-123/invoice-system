import Company from "./company.schema.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

// Create or update company profile
const upsertCompany = asyncHandler(async (req, res) => {
  const updateData = req.body;

  const company = await Company.findOneAndUpdate({}, updateData, {
    new: true,
    upsert: true,
  });

  res.json(new ApiResponse(200, company, "Company profile saved/updated"));
});

// Get company profile
const getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOne({});
  if (!company) throw new ApiError(404, "Company profile not found");

  res.json(new ApiResponse(200, company, "Company profile fetched"));
});

export { upsertCompany, getCompany };
