import { useEffect, useRef, useState } from "react";
import api from "../../axiosInstance";
import ExpenseFormModal from "./ExpenseFormModal";
import ExpenseViewModal from "./ExpenseViewModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { toast } from "react-hot-toast";
import { formatDate, formatCurrency } from "../../utils/FormatUtilities";

export default function Expenses() {
  const mounted = useRef(false);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState(null);

  const [viewMode, setViewMode] = useState("grid"); // 'list' or 'grid'
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  useEffect(() => {
    mounted.current = true;
    fetchExpenses();
    const handler = (e) => {
      // close open action menus on global click
      setActionMenuOpen(null);
    };
    document.addEventListener("click", handler);
    return () => {
      mounted.current = false;
      document.removeEventListener("click", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, typeFilter, dateFrom, dateTo]);

  const buildParams = (opts = {}) => {
    const page = opts.page ?? currentPage;
    const params = { page, limit };
    if (searchQuery?.trim()) params.q = searchQuery.trim();
    if (typeFilter) params.type = typeFilter;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    return params;
  };

  const normalizeListFromResponse = (resData) => {
    // Backend may return:
    // 1) { expenses: [...], meta: {...} }
    // 2) an array directly
    // 3) { data: [...] } (unlikely but safe)
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData.expenses)) return resData.expenses;
    if (Array.isArray(resData.data)) return resData.data;
    // fallback: if resData itself looks like paged shape with nested expenses
    if (resData?.data && Array.isArray(resData.data.expenses)) return resData.data.expenses;
    return [];
  };

  const fetchExpenses = async (opts = {}) => {
    try {
      setLoading(true);
      // NOTE: use catalog path consistent with backend
      const res = await api.get("/expenses", { params: buildParams(opts) });
      const payload = res?.data?.data ?? res?.data ?? {};
      const list = normalizeListFromResponse(payload);
      // defensive: ensure array
      const safeList = Array.isArray(list) ? list : [];
      if (!mounted.current) return;
      setExpenses(safeList);

      // meta parsing
      const meta = payload?.meta ?? {};
      setTotalCount(meta.total ?? safeList.length);
      setTotalPages(Math.max(1, Math.ceil((meta.total ?? safeList.length) / limit)));
      setGrandTotal(meta.grandTotal ?? 0);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
      toast.error("Failed to fetch expenses");
      if (mounted.current) {
        setExpenses([]);
        setTotalCount(0);
        setTotalPages(1);
        setGrandTotal(0);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    setCurrentPage(1);
    await fetchExpenses({ page: 1 });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
    fetchExpenses({ page: 1 });
  };

  const openDelete = (rec) => {
    setSelectedForDelete(rec);
    setConfirmOpen(true);
    setActionMenuOpen(null);
  };

  const handleDelete = async (id) => {
    try {
      // backend expects DELETE /expenses/:id (soft delete implemented server-side)
      await api.delete(`/expenses/${id}`);
      toast.success("Expense deleted");
      setConfirmOpen(false);
      setSelectedForDelete(null);
      fetchExpenses();
    } catch (err) {
      console.error("Delete failed", err);
      toast.error("Failed to delete expense");
    }
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 rounded-b-lg">
        <div className="flex-1 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * limit + 1}</span> to <span className="font-medium">{Math.min(currentPage * limit, totalCount)}</span> of <span className="font-medium">{totalCount}</span> results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"}`}
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
                    className={`relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${currentPage === pageNum ? "z-10 bg-blue-600 text-white focus:z-20" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"}`}
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
              className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  const getTypeBadgeClass = (type) => {
    const typeColors = {
      Delivery: "bg-blue-100 text-blue-800",
      Commission: "bg-purple-100 text-purple-800",
      Rent: "bg-orange-100 text-orange-800",
      Salary: "bg-green-100 text-green-800",
      Utilities: "bg-yellow-100 text-yellow-800",
      Other: "bg-gray-100 text-gray-800"
    };
    return typeColors[type] || "bg-gray-100 text-gray-800";
  };

  // safe renderer for invoice cell (avoid rendering object)
  const invoiceDisplay = (linkedInvoice) => {
    if (!linkedInvoice) return "—";
    // linkedInvoice might be an ObjectId string, an invoice object, or nested { _id, invoiceNo }
    if (typeof linkedInvoice === "string") return linkedInvoice;
    if (typeof linkedInvoice === "object") {
      return linkedInvoice.invoiceNo || linkedInvoice._id || "—";
    }
    return "—";
  };

  return (
    <div className="">
  {/* Header */}
  <div className="mb-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="text-sm text-gray-600 mt-1">Track business expenses, link to invoices</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex bg-white rounded-lg border border-gray-300 p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 md:block hidden rounded-md ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            title="List view"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
            title="Grid view"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h6v6H4zM14 6h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
            </svg>
          </button>
        </div>

        <button
          onClick={() => setOpenForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
          New Expense
        </button>
      </div>
    </div>
  </div>

  {/* Search Panel */}
  <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
    <div className="flex flex-col md:flex-row gap-3">
      <div className="flex-1 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" />
          </svg>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md transition-colors flex items-center text-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L11 13.414V17a1 1 0 01-.293.707l-2 2A1 1 0 017 19v-5.586L3.293 7.293A1 1 0 013 6V4z" />
            </svg>
          </button>
        </form>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="">All Types</option>
          <option value="Delivery">Delivery</option>
          <option value="Commission">Commission</option>
          <option value="Rent">Rent</option>
          <option value="Salary">Salary</option>
          <option value="Utilities">Utilities</option>
          <option value="Other">Other</option>
        </select>
        {(searchQuery || typeFilter || dateFrom || dateTo) && (
          <button
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700 text-sm whitespace-nowrap"
            title="Clear filters"
          >
            Clear
          </button>
        )}
      </div>
    </div>

    {showFilters && (
      <div className="mt-3 pt-3 border-t border-gray-200 md:hidden">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Types</option>
              <option value="Delivery">Delivery</option>
              <option value="Commission">Commission</option>
              <option value="Rent">Rent</option>
              <option value="Salary">Salary</option>
              <option value="Utilities">Utilities</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-3 rounded-md transition-colors text-sm border border-gray-300"
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Stats Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-blue-500">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-blue-100 p-3 rounded-lg">
          <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h6v6M9 7h6" />
          </svg>
        </div>
        <div className="ml-4">
          <h2 className="text-lg font-semibold text-gray-900">{totalCount}</h2>
          <p className="text-sm text-gray-600">Total Expenses</p>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-green-500">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-green-100 p-3 rounded-lg">
          <svg className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0-8L8 12m4-4 4 4" />
          </svg>
        </div>
        <div className="ml-4">
          <h2 className="text-lg font-semibold text-gray-900">{formatCurrency(grandTotal)}</h2>
          <p className="text-sm text-gray-600">Total Amount</p>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 border-yellow-500">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-yellow-100 p-3 rounded-lg">
          <svg className="h-6 w-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0-8L8 12m4-4 4 4" />
          </svg>
        </div>
        <div className="ml-4">
          <h2 className="text-lg font-semibold text-gray-900">{expenses.length}</h2>
          <p className="text-sm text-gray-600">Showing</p>
        </div>
      </div>
    </div>
  </div>

  {/* Content Container */}
  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
    {loading ? (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    ) : expenses.length === 0 ? (
      <div className="text-center py-12 px-4">
        <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m0-8L8 12m4-4 4 4" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
        <p className="text-gray-500 mb-6">Get started by creating your first expense.</p>
        <button onClick={() => setOpenForm(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
          + New Expense
        </button>
      </div>
    ) : viewMode === "grid" ? (
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenses.map((ex) => (
          <div key={ex._id} className="bg-gray-50 rounded-lg p-4 border hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className={`text-sm font-semibold ${getTypeBadgeClass(ex.type)}`}>{ex.type}</div>
                <div className="text-xs text-gray-500 mt-1">{ex.description || "—"}</div>
              </div>
              <div className="text-sm font-semibold">{formatCurrency(ex.amount ?? 0)}</div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Invoice: {invoiceDisplay(ex.linkedInvoiceId ?? ex.linkedInvoice)}
            </div>

            <div className="mt-3 flex justify-between items-center">
              <div className="text-xs text-gray-400">{formatDate(ex.date)}</div>
              <div className="flex gap-2">
                <button onClick={() => setViewing(ex)} className="text-blue-600 text-sm hover:text-blue-800">View</button>
                <button onClick={() => { setEditingId(ex._id); setOpenForm(true); }} className="text-gray-600 text-sm hover:text-gray-800">Edit</button>
                <button onClick={() => openDelete(ex)} className="text-red-600 text-sm hover:text-red-800">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="overflow-x-auto md:block hidden">
        {/* Desktop Table */}
        <table className="min-w-full divide-y divide-gray-200 hidden md:table">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((ex) => (
              <tr key={ex._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(ex.type)}`}>
                    {ex.type || "—"}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 max-w-[240px] truncate" title={ex.description}>
                  {ex.description || "—"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {formatCurrency(ex.amount ?? 0)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {invoiceDisplay(ex.linkedInvoiceId ?? ex.linkedInvoice)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(ex.date)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => setViewing(ex)} 
                      className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                      title="View"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => { setEditingId(ex._id); setOpenForm(true); }} 
                      className="text-gray-600 hover:text-gray-800 p-1 rounded transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => openDelete(ex)} 
                      className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Cards (visible on small screens) */}
        <div className="md:hidden divide-y divide-gray-200">
          {expenses.map((ex) => (
            <div key={ex._id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(ex.type)}`}>
                  {ex.type || "—"}
                </span>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(ex.amount ?? 0)}
                </div>
              </div>
              
              <div className="mb-2">
                <div className="text-xs text-gray-500 mb-1">Description</div>
                <div className="text-sm text-gray-700 truncate">{ex.description || "—"}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Invoice</div>
                  <div className="text-sm">{invoiceDisplay(ex.linkedInvoiceId ?? ex.linkedInvoice)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Date</div>
                  <div className="text-sm text-gray-600">{formatDate(ex.date)}</div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2 border-t border-gray-100">
                <button 
                  onClick={() => setViewing(ex)} 
                  className="text-blue-600 text-sm font-medium hover:text-blue-800"
                >
                  View
                </button>
                <button 
                  onClick={() => { setEditingId(ex._id); setOpenForm(true); }} 
                  className="text-gray-600 text-sm font-medium hover:text-gray-800"
                >
                  Edit
                </button>
                <button 
                  onClick={() => openDelete(ex)} 
                  className="text-red-600 text-sm font-medium hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Pagination */}
    {totalPages > 1 && <Pagination />}
  </div>

  <ExpenseFormModal
    open={openForm}
    expenseId={editingId}
    onClose={() => { setOpenForm(false); setEditingId(null); }}
    onSaved={() => { toast.success(editingId ? "Expense updated" : "Expense created"); setOpenForm(false); setEditingId(null); fetchExpenses(); }}
  />

  <ExpenseViewModal open={!!viewing} expense={viewing} onClose={() => setViewing(null)} />

  <ConfirmationModal
    isOpen={confirmOpen}
    onClose={() => { setConfirmOpen(false); setSelectedForDelete(null); }}
    onConfirm={() => handleDelete(selectedForDelete?._id)}
    title="Delete Expense"
    message={`Are you sure you want to delete this expense (${selectedForDelete?.type || ""})?`}
    confirmText="Delete"
    cancelText="Cancel"
    variant="danger"
  />
</div>
  );
}
