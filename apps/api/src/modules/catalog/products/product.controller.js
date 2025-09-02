import Product from "./product.schema.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/apiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";

const createProduct = asyncHandler(async (req, res) => {
  const newProduct = await Product.create(req.body);
  if (!newProduct) {
    throw new ApiError(500, "Something went wrong while creating the product.");
  }
  return res
    .status(201)
    .json(new ApiResponse(201, newProduct, "Product created successfully."));
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product fetched successfully."));
});

const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    name,
    hsn,
  } = req.query;

  const filterQuery = { isActive: true };
  if (name) filterQuery.name = { $regex: name, $options: "i" };
  if (hsn) filterQuery.hsn = { $regex: hsn, $options: "i" };

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 },
  };

  const products = await Product.find(filterQuery)
    .sort(options.sort)
    .skip((options.page - 1) * options.limit)
    .limit(options.limit);

  const totalProducts = await Product.countDocuments(filterQuery);

  const response = {
    docs: products,
    totalDocs: totalProducts,
    limit: options.limit,
    page: options.page,
    totalPages: Math.ceil(totalProducts / options.limit),
  };

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Products retrieved successfully."));
});

const updateProduct = asyncHandler(async (req, res) => {
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!updatedProduct) {
    throw new ApiError(404, "Product not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedProduct, "Product updated successfully.")
    );
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false } },
    { new: true }
  );
  if (!product) {
    throw new ApiError(404, "Product not found.");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { id: product._id },
        "Product disabled successfully."
      )
    );
});

const searchProducts = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    throw new ApiError(400, "Search query 'q' is required.");
  }

  const searchQuery = { $regex: q, $options: "i" };

  const products = await Product.find({
    $or: [{ name: searchQuery }, { hsn: searchQuery }],
  })
    .limit(10)
    .select("_id name sellPrice gstTax hsn");

  if (!products.length) {
    return res.status(200).json(new ApiResponse(200, [], "No products found."));
  }

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
