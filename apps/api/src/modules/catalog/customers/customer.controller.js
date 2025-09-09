// src/modules/catalog/customers/customer.controller.js
import Customer from "./customer.schema.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/apiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";

const createCustomer = asyncHandler(async (req, res) => {
  const { email, phone, gstin } = req.body;
  if (email) {
    const exists = await Customer.findOne({ companyId: req.user.companyId, email: email.toLowerCase() });
    if (exists) throw new ApiError(400, "Customer with this email already exists in your company");
  }
  if (phone) {
    const exists = await Customer.findOne({ companyId: req.user.companyId, phone });
    if (exists) throw new ApiError(400, "Customer with this phone already exists in your company");
  }
  if (gstin) {
    const exists = await Customer.findOne({ gstin: gstin.toUpperCase() });
    if (exists) throw new ApiError(400, "Customer with this GSTIN already exists");
  }

  const newCustomer = await Customer.create({
    ...req.body,
    companyId: req.user.companyId,
  });

  return res.status(201).json(new ApiResponse(201, newCustomer, "Customer created"));
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  return res.status(200).json(new ApiResponse(200, customer));
});

// 🔹 List with filters
const getAllCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc", ...filters } = req.query;
  const filterQuery = { companyId: req.user.companyId };

  if (filters.name)  filterQuery.name  = { $regex: filters.name, $options: "i" };
  if (filters.email) filterQuery.email = { $regex: filters.email, $options: "i" };
  if (filters.phone) filterQuery.phone = filters.phone;
  if (filters.gstin) filterQuery.gstin = filters.gstin.toUpperCase();

  const customers = await Customer.find(filterQuery)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });

  return res.status(200).json(new ApiResponse(200, customers));
});

// 🔹 Update
const updateCustomer = asyncHandler(async (req, res) => {
  const { email, phone, gstin } = req.body;

  // Check duplicates (excluding self)
  if (email) {
    const exists = await Customer.findOne({
      _id: { $ne: req.params.id },
      companyId: req.user.companyId,
      email: email.toLowerCase(),
    });
    if (exists) throw new ApiError(400, "Another customer with this email exists in your company");
  }
  if (phone) {
    const exists = await Customer.findOne({
      _id: { $ne: req.params.id },
      companyId: req.user.companyId,
      phone,
    });
    if (exists) throw new ApiError(400, "Another customer with this phone exists in your company");
  }
  if (gstin) {
    const exists = await Customer.findOne({
      _id: { $ne: req.params.id },
      gstin: gstin.toUpperCase(),
    });
    if (exists) throw new ApiError(400, "Another customer with this GSTIN already exists");
  }

  const updated = await Customer.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!updated) throw new ApiError(404, "Customer not found");
  return res.status(200).json(new ApiResponse(200, updated, "Customer updated"));
});

// 🔹 Soft Delete
const deleteCustomer = asyncHandler(async (req, res) => {
  const updated = await Customer.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { isActive: false } },
    { new: true }
  );
  if (!updated) throw new ApiError(404, "Customer not found");
  return res.status(200).json(new ApiResponse(200, updated, "Customer deactivated"));
});

// 🔹 Search (autocomplete for invoice/quotation forms)
const searchCustomers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(200).json(new ApiResponse(200, []));

  const regex = { $regex: q, $options: "i" };

  const customers = await Customer.find({
    companyId: req.user.companyId,
    $or: [{ name: regex }, { email: regex }, { phone: regex }, { gstin: regex }],
  })
    .limit(20)
    .sort({ createdAt: -1 });

  return res.status(200).json(new ApiResponse(200, customers, "Search results fetched"));
});

export {
  createCustomer,
  getCustomerById,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
};
