import Customer from "./customer.schema.js";
import ApiError from "../../../utils/ApiError.js";
import ApiResponse from "../../../utils/apiResponse.js";
import asyncHandler from "../../../utils/asyncHandler.js";

const createCustomer = asyncHandler(async (req, res) => {
  const newCustomer = await Customer.create(req.body);

  if (!newCustomer) {
    throw new ApiError(
      500,
      "Something went wrong while creating the customer."
    );
  }

  return res
    .status(201)
    .json(new ApiResponse(201, newCustomer, "Customer created successfully."));
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, customer, "Customer fetched successfully."));
});

const getAllCustomers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    ...filters
  } = req.query;

  const filterQuery = { isActive: true, ...filters };
  // Build a regex search for text fields
  if (filters.name) filterQuery.name = { $regex: filters.name, $options: "i" };
  if (filters.email)
    filterQuery.email = { $regex: filters.email, $options: "i" };
  if (filters.phone) filterQuery.phone = filters.phone;
  if (filters.gstin) filterQuery.gstin = filters.gstin.toUpperCase();

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 },
  };

  // You might need to install 'mongoose-paginate-v2' for this to work
  // const customers = await Customer.paginate(filterQuery, options);
  // For now, using standard Mongoose:
  const customers = await Customer.find(filterQuery)
    .sort(options.sort)
    .skip((options.page - 1) * options.limit)
    .limit(options.limit);

  const totalCustomers = await Customer.countDocuments(filterQuery);

  const response = {
    docs: customers,
    totalDocs: totalCustomers,
    limit: options.limit,
    page: options.page,
    totalPages: Math.ceil(totalCustomers / options.limit),
  };

  return res
    .status(200)
    .json(new ApiResponse(200, response, "Customers retrieved successfully."));
});

const updateCustomer = asyncHandler(async (req, res) => {
  const updatedCustomer = await Customer.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!updatedCustomer) {
    throw new ApiError(404, "Customer not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedCustomer, "Customer updated successfully.")
    );
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false } },
    { new: true }
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { id: customer._id },
        "Customer disabled successfully."
      )
    );
});

const searchCustomers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) {
    throw new ApiError(400, "Search query 'q' is required.");
  }

  const searchQuery = { $regex: q, $options: "i" };

  const customers = await Customer.find({
    $or: [
      { name: searchQuery },
      { email: searchQuery },
      { phone: searchQuery },
    ],
  })
    .limit(10) // Limit results for autocomplete
    .select("_id name email gstin"); // Only send necessary data

  if (!customers.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No customers found."));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, customers, "Search results fetched."));
});

export {
  createCustomer,
  getCustomerById,
  getAllCustomers,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
};
