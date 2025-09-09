import Product from "./product.schema.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/apiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";

// Create product
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create({
    ...req.body,
    companyId: req.user.companyId,
  });
  if (!product) throw new ApiError(500, "Failed to create product");
  return res.status(201).json(new ApiResponse(201, product, "Product created"));
});

// Get single product
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    companyId: req.user.companyId,
  });
  if (!product) throw new ApiError(404, "Product not found");
  return res.status(200).json(new ApiResponse(200, product));
});

// Get paginated + filtered products
const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
    ...filters
  } = req.query;

  const filterQuery = { companyId: req.user.companyId };

  if (filters.name) filterQuery.name = { $regex: filters.name, $options: "i" };
  if (filters.hsn) filterQuery.hsn = { $regex: filters.hsn, $options: "i" };

  const products = await Product.find(filterQuery)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 });

  const total = await Product.countDocuments(filterQuery);

  return res.status(200).json(
    new ApiResponse(200, {
      products,
      total,
      page: Number(page),
      limit: Number(limit),
    })
  );
});

// Update product
const updateProduct = asyncHandler(async (req, res) => {
  const updated = await Product.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updated) throw new ApiError(404, "Product not found");
  return res.status(200).json(new ApiResponse(200, updated, "Product updated"));
});

// Soft delete product
const deleteProduct = asyncHandler(async (req, res) => {
  const deleted = await Product.findOneAndUpdate(
    { _id: req.params.id, companyId: req.user.companyId },
    { $set: { isActive: false } }, // soft delete
    { new: true }
  );
  if (!deleted) throw new ApiError(404, "Product not found");
  return res.status(200).json(new ApiResponse(200, deleted, "Product deleted"));
});

// Search products (for autocomplete in quotations/invoices)
const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(200).json(new ApiResponse(200, []));

  const regex = { $regex: q, $options: "i" };

  const products = await Product.find({
    companyId: req.user.companyId,
    $or: [{ name: regex }, { hsn: regex }],
  })
    .limit(20)
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Search results fetched."));
});

export {
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
};
