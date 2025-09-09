import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../axiosInstance";
import ProductFormModal from "./ProductFormModal";
import ProductViewModal from "./ProductViewModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { toast } from "react-hot-toast";
import { formatDate } from "../../utils/FormatUtilities";
import { formatCurrency } from "../../utils/FormatUtilities";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const limit = 10;

  useEffect(() => {
    fetchProducts();
    const handleClickOutside = () => setActionMenuOpen(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const fetchProducts = async (opts = {}) => {
    try {
      setLoading(true);
      const page = opts.page ?? currentPage;
      const res = await api.get("/catalog/products", {
        params: { page, limit, search: searchQuery || undefined },
      });
      // backend returns { products, total, page, limit } in data or array fallback
      const data = res?.data?.data || {};
      const list = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : data.products ?? data);
      const total = res?.data?.meta?.total ?? data.total ?? (Array.isArray(list) ? list.length : 0);
      setProducts(list || []);
      setTotalCount(Number(total || 0));
      setTotalPages(Math.max(1, Math.ceil((Number(total || 0)) / limit)));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    const q = (searchQuery || "").trim();
    setCurrentPage(1);
    if (!q) {
      fetchProducts({ page: 1 });
      return;
    }
    try {
      setLoading(true);
      const res = await api.get("/catalog/products/search", { params: { q } }).catch(() => null);
      const list = res?.data?.data ?? [];
      setProducts(list);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
    fetchProducts({ page: 1 });
  };

  // Deactivate (soft delete) — calling same pattern as your customers frontend (/delete/:id)
  const handleDeactivate = async (id) => {
    try {
      // path mirrors customers flow: PATCH /catalog/products/delete/:id
      await api.patch(`/catalog/products/delete/${id}`);
      toast.success("Product deactivated successfully");
      fetchProducts();
      setDeactivateModalOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error deactivating product:", error);
      toast.error("Could not deactivate product");
    }
  };

  const openDeactivateModal = (product) => {
    setSelectedProduct(product);
    setDeactivateModalOpen(true);
    setActionMenuOpen(null);
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-b-lg">
        <div className="flex-1 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to{" "}
            <span className="font-medium">{Math.min(currentPage * limit, totalCount)}</span> of{" "}
            <span className="font-medium">{totalCount}</span> results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              Previous
            </button>
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum ? "z-10 bg-blue-600 text-white focus:z-20" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="px-2 py-2 text-gray-500">...</span>}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className=" p-4 md:p-6 ">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your product catalog, prices, HSN and tax</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg border border-gray-300 p-1">
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:text-gray-700"}`} title="Grid view">
                {/* grid icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-md ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:text-gray-700"}`} title="List view">
                {/* list icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>

            <button onClick={() => { setOpen(true); setEditingId(null); }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 6.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" /></svg>
              New Product
            </button>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search products by name, HSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors w-full md:w-auto">Search</button>
            <button type="button" onClick={handleClearSearch} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors w-full md:w-auto">Clear</button>
          </div>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{totalCount}</h2>
              <p className="text-sm text-gray-600">Total Products</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3v4h6v-4c0-1.657-1.343-3-3-3z" /></svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{products.filter(p => p.isActive !== false).length}</h2>
              <p className="text-sm text-gray-600">Active Products</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-lg">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8" /></svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{products.filter(p => p.hsn).length}</h2>
              <p className="text-sm text-gray-600">With HSN</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 p-3 rounded-lg">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3v4h6v-4c0-1.657-1.343-3-3-3z" /></svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900">{products.filter(p => p.sellPrice != null).length}</h2>
              <p className="text-sm text-gray-600">Priced Products</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 px-4">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery ? "Try adjusting your search query." : "Get started by creating your first product."}
            </p>
            <button onClick={() => { setOpen(true); setEditingId(null); }} className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 6.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" /></svg>
              New Product
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <div key={product._id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/products/${product._id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                          {product.name || "Unnamed Product"}
                        </Link>
                        <p className="text-xs text-gray-500 mt-1">Added: {formatDate(product.createdAt)}</p>
                      </div>
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === product._id ? null : product._id); }} className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200 transition-colors" title="More actions">
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>

                        {actionMenuOpen === product._id && (
                          <div className="origin-top-right absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical">
                              <button onClick={(e) => { e.preventDefault(); setViewingProduct(product); setActionMenuOpen(null); }} className="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">View details</button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingId(product._id); setOpen(true); setActionMenuOpen(null); }} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Edit</button>
                              <button onClick={(e) => { e.stopPropagation(); openDeactivateModal(product); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Deactivate</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                      <div><strong>HSN:</strong> {product.hsn || "—"}</div>
                      <div><strong>Sell:</strong> {formatCurrency(product.sellPrice ?? 0)}</div>
                      <div><strong>Purchase:</strong> {formatCurrency(product.purchasePrice ?? 0)}</div>
                      <div><strong>GST:</strong> {product.gstTax != null ? `${product.gstTax}%` : "—"}</div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {product.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                      <Link to="#" onClick={(e) => { e.preventDefault(); setViewingProduct(product); setActionMenuOpen(null); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                        View details
                        <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <Pagination />
          </>
        ) : (
          <>
            <div className="overflow-y-auto flex-grow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">HSN</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sell Price</th>
                    {/* <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Purchase Price</th> */}
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase hidden md:table-cell tracking-wider">Added</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>
                          <Link className="text-blue-600 hover:text-blue-800 font-medium text-sm">{product.name}</Link>
                          <p className="text-xs text-gray-500 sm:hidden mt-0.5">{product.hsn || "HSN not provided"}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">{product.hsn || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">{formatCurrency(product.sellPrice ?? 0)}</td>
                      {/* <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600 hidden md:table-cell">{formatCurrency(product.purchasePrice ?? 0)}</td> */}
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-600">{product.gstTax != null ? `${product.gstTax}%` : "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-gray-600 hidden sm:table-cell">{formatDate(product.createdAt)}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <Link to="#" onClick={(e) => { e.preventDefault(); setViewingProduct(product); setActionMenuOpen(null); }}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </Link>

                          <div className="relative inline-block text-left">
                            <button onClick={(e) => { e.stopPropagation(); setActionMenuOpen(actionMenuOpen === product._id ? null : product._id); }} className="text-gray-600 hover:text-gray-800 p-0.5 rounded hover:bg-gray-100" title="More actions">
                              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                            </button>

                            {actionMenuOpen === product._id && (
                              <div className="origin-top-right absolute right-0 mt-1 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                  <button onClick={(e) => { e.stopPropagation(); setEditingId(product._id); setOpen(true); setActionMenuOpen(null); }} className="block w-full text-left px-3 py-1 text-xs text-gray-700 hover:bg-gray-100">Edit</button>
                                  <button onClick={(e) => { e.stopPropagation(); openDeactivateModal(product); }} className="block w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-gray-100">Deactivate</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination />
          </>
        )}
      </div>

      <ProductFormModal
        open={open}
        productId={editingId}
        onClose={() => { setOpen(false); setEditingId(null); }}
        onSaved={() => {
          toast.success(editingId ? "Product updated successfully" : "Product created successfully");
          setOpen(false);
          setEditingId(null);
          fetchProducts();
        }}
      />

      <ConfirmationModal
        isOpen={deactivateModalOpen}
        onClose={() => { setDeactivateModalOpen(false); setSelectedProduct(null); }}
        onConfirm={() => handleDeactivate(selectedProduct?._id)}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate ${selectedProduct?.name}? This action cannot be undone.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="danger"
      />

      <ProductViewModal
        open={!!viewingProduct}
        onClose={() => setViewingProduct(null)}
        product={viewingProduct}
      />
    </div>
  );
}
