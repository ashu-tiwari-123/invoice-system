import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../axiosInstance';
import CreateInvoiceModal from './InvoiceFormModal';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/FormatUtilities';
import { downloadServerPdf } from '../../utils/DownloadPdf';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const limit = 10;

  useEffect(() => {
    fetchInvoices();
  }, [currentPage, statusFilter]);


  useEffect(() => {
    const handleClickOutside = () => {
      setActionMenuOpen(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const mapStatusForAPI = (uiStatus) => {
    if (!uiStatus) return '';
    const m = {
      draft: 'draft',
      approved: 'approved',
      paid: 'paid',
      overdue: 'overdue',
    };
    return m[uiStatus] ?? uiStatus;
  };

  const applyOverdueFilter = (list) => {
    if (statusFilter !== 'overdue') return list;
    const now = new Date();
    return list.filter(inv => {
      const due = inv?.dueDate ? new Date(inv.dueDate) : null;
      return (
        due &&
        due < now &&
        inv?.paymentStatus?.toLowerCase?.() !== 'paid' &&
        inv?.status?.toLowerCase?.() !== 'void'
      );
    });
  };
  const baseParams = (value) => {
    if (value === 'paid') {
      return { paymentStatus: 'paid' };
    } else {
      return { status: statusFilter }
    }
  }
  const fetchInvoices = async (opts = {}) => {
    try {
      setLoading(true);
      const page = opts.page ?? currentPage;
      const apiStatus = mapStatusForAPI(statusFilter);
      let base = baseParams(apiStatus);
      const params = {
        page,
        limit,
        ...base,
      };

      const res = await api.get('/invoices', { params });
      const { invoices: list = [], total = 0 } = res?.data?.data || {};
      const finalList = applyOverdueFilter(list);
      setInvoices(finalList);
      const totalForPager = statusFilter === 'overdue' ? finalList.length : total;
      setTotalPages(Math.max(1, Math.ceil(totalForPager / limit)));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault?.();

    const q = (searchQuery || '').trim();
    if (!q) {
      setCurrentPage(1);
      await fetchInvoices({ page: 1 });
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/invoices/search', { params: { q } });
      const list = res?.data?.data || [];
      const finalList = applyOverdueFilter(list);

      setInvoices(finalList);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error searching invoices:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'paid') return 'bg-green-100 text-green-800';
    if (s === 'draft') return 'bg-gray-100 text-gray-800';
    if (s === 'approved') return 'bg-blue-100 text-blue-800';
    if (s === 'void') return 'bg-red-100 text-red-800';
    if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (s === 'overdue') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getPaymentStatusBadgeClass = (status = '') => {
    const s = status.toLowerCase();
    if (s === 'paid') return 'bg-green-100 text-green-800';
    if (s === 'partial') return 'bg-blue-100 text-blue-800';
    if (s === 'unpaid') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setCurrentPage(1);
    fetchInvoices({ page: 1 });
  };

  const handleStatusUpdate = async (invoiceId, newStatus) => {
    try {
      await api.patch(`/invoices/${invoiceId}/approve`);
      toast.success(`Invoice marked as ${newStatus}`);
      fetchInvoices();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const handleInvoiceVoid = async (invoiceId, newStatus) => {
    try {
      await api.patch(`/invoices/${invoiceId}/void`);
      toast.success(`Invoice marked as ${newStatus}`);
      fetchInvoices();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  };

  const handlePaymentUpdate = async (invoiceId, paymentStatus) => {
    try {
      await api.patch(`/invoices/${invoiceId}/mark-paid`, { paymentStatus });
      toast.success(`Payment status updated to ${paymentStatus}`);
      fetchInvoices();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status');
    }
  };

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Invoices</h1>
          <p className="text-xs text-gray-600 mt-0.5">Manage and track your invoices</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center w-full md:w-auto justify-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Invoice
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md transition-colors flex items-center text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
              </button>
            </form>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            {(searchQuery || statusFilter) && (
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-2 border-blue-500">
          <div className="text-xs text-gray-600">Total</div>
          <div className="text-lg font-bold text-gray-800">{(invoices.length * totalPages) || 0}</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-2 border-green-500">
          <div className="text-xs text-gray-600">Paid</div>
          <div className="text-lg font-bold text-gray-800">
            {invoices.filter(i => i.paymentStatus === 'paid').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-2 border-yellow-500">
          <div className="text-xs text-gray-600">Pending</div>
          <div className="text-lg font-bold text-gray-800">
            {invoices.filter(i => i.paymentStatus === 'unpaid' || i.paymentStatus === 'partial').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-2 border-red-500">
          <div className="text-xs text-gray-600">Overdue</div>
          <div className="text-lg font-bold text-gray-800">
            {invoices.filter(i => {
              const due = i?.dueDate ? new Date(i.dueDate) : null;
              const now = new Date();
              return due && due < now && i.paymentStatus !== 'paid';
            }).length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm  flex flex-col" style={{ height: "65vh" }}>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No invoices found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || statusFilter ? 'Try adjusting your search or filter' : 'Get started by creating a new invoice'}
            </p>
            {(searchQuery || statusFilter) ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                + New Invoice
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-grow">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">
                      Invoice
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell sticky top-0 bg-gray-50">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell sticky top-0 bg-gray-50">
                      Client
                    </th>
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">
                      Amount
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>
                          <p
                            // to={`/invoices/${invoice._id}`}
                            className="text-blue-600 hover:text-blue-800 cursor-default font-medium text-xs"
                          >
                            {invoice.invoiceNo || `INV-${invoice._id.slice(-6)}`}
                          </p>
                          <p className="text-xs text-gray-500 sm:hidden mt-0.5">
                            {formatDate(invoice.invoiceDate)}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 hidden sm:table-cell">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 hidden md:table-cell">
                        <div className="max-w-[120px] truncate" title={invoice.buyer?.name}>
                          {invoice.buyer?.name || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-max whitespace-nowrap ${getStatusBadgeClass(invoice.status)}`}>
                            {invoice.status || '—'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-max whitespace-nowrap ${getPaymentStatusBadgeClass(invoice.paymentStatus)}`}>
                            {invoice.paymentStatus || 'unpaid'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                        {formatCurrency(invoice.grandTotal)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            to={`/invoices-view/${invoice._id}`}
                            className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50"
                            title="View invoice"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => { setEditingId(invoice._id); setOpen(true); }}
                            className="text-gray-600 hover:text-gray-800 p-0.5 rounded hover:bg-gray-100"
                            title="Edit invoice"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpen(actionMenuOpen === invoice._id ? null : invoice._id);
                              }}
                              className="text-gray-600 hover:text-gray-800 p-0.5 rounded hover:bg-gray-100"
                              title="More actions"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>

                            {actionMenuOpen === invoice._id && (
                              <div className="origin-top-right absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                  {invoice.status == 'approved' || invoice.status == 'void' ? "" : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusUpdate(invoice._id, 'approved');
                                      }}
                                      className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      Approve Invoice
                                    </button>
                                  )}
                                  {invoice.status !== 'approved' || invoice.paymentStatus == "paid" ? " " : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePaymentUpdate(invoice._id, 'paid');
                                      }}
                                      className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      Mark as Paid
                                    </button>
                                  )}
                                  {invoice.status == 'approved' || invoice.status == 'void' ? "" : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInvoiceVoid(invoice._id, 'void');
                                      }}
                                      className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      Void Invoice
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast.success('Downloading invoice...');
                                      downloadServerPdf(invoice._id, invoice.invoiceNo);
                                      setActionMenuOpen(null);
                                    }}
                                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    Download PDF
                                  </button>
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

            {totalPages > 1 && (
              <div className="bg-white px-3 py-2 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex flex-col sm:flex-row justify-between items-center gap-2">
                  <div className="text-xs text-gray-700">
                    Page <span className="font-medium">{currentPage}</span> of{' '}
                    <span className="font-medium">{totalPages}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2.5 py-1 text-xs font-medium rounded ${currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2.5 py-1 text-xs font-medium rounded ${currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <CreateInvoiceModal
        open={open}
        invoiceId={editingId}
        onClose={() => {
          setOpen(false);
          setEditingId(null);
        }}
        onSaved={() => {
          toast.success(editingId ? "Invoice updated successfully" : "Invoice created successfully");
          setOpen(false);
          setEditingId(null);
          fetchInvoices();
        }}
      />
    </div>
  );
}