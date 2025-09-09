import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../axiosInstance';
import CreateQuotationModal from './QuotationFormModal'; // create analogous modal to InvoiceFormModal
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDate } from '../../utils/FormatUtilities';
import { downloadQuotationPdf } from '../../utils/DownloadPdf';

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const limit = 10;

  useEffect(() => {
    fetchQuotations();
    // close action menus on outside click
    const handleClickOutside = () => setActionMenuOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter]);

  const mapStatusForAPI = (uiStatus) => {
    if (!uiStatus) return '';
    const m = {
      draft: 'draft',
      // sent: 'sent',
      accepted: 'accepted',
      rejected: 'rejected',
    };
    return m[uiStatus] ?? uiStatus;
  };

  const applyOverdueFilter = (list) => {
    if (statusFilter !== 'overdue') return list;
    const now = new Date();
    return list.filter(q => {
      // assume quotation may have expiryDate or date + validDays; fallback to false
      const due = q?.expiryDate ? new Date(q.expiryDate) : null;
      return due && due < now && q?.status?.toLowerCase() !== 'accepted';
    });
  };

  const baseParams = (value) => {
    if (value === 'accepted') return { status: 'accepted' };
    return { status: statusFilter || undefined };
  };

  const fetchQuotations = async (opts = {}) => {
    try {
      setLoading(true);
      const page = opts.page ?? currentPage;
      const apiStatus = mapStatusForAPI(statusFilter);
      const base = baseParams(apiStatus);
      const params = {
        page,
        limit,
        ...base,
      };
      const res = await api.get('/quotations', { params });
      const { quotations: list = [], total = 0 } = res?.data?.data || {};
      const finalList = applyOverdueFilter(list);
      setQuotations(finalList);
      const totalForPager = statusFilter === 'overdue' ? finalList.length : total;
      setTotalPages(Math.max(1, Math.ceil(totalForPager / limit)));
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
  e?.preventDefault?.();
  const q = (searchQuery || "").trim();
  if (!q) {
    setCurrentPage(1);
    await fetchQuotations({ page: 1 });
    return;
  }
  try {
    setLoading(true);
    const res = await api.get("/quotations/quotations/search", { params: { q, limit: 50 } });
    const list = res?.data?.data || [];
    const finalList = applyOverdueFilter(list);
    setQuotations(finalList);
    setTotalPages(1);
    setCurrentPage(1);
  } catch (error) {
    // if backend returns 404 => no results, show empty list (no error toast)
    if (error?.response?.status === 404) {
      setQuotations([]);
      setTotalPages(1);
      setCurrentPage(1);
    } else {
      console.error("Error searching quotations:", error);
      toast.error("Search failed");
    }
  } finally {
    setLoading(false);
  }
};

  const getStatusBadgeClass = (status = '') => {
    const s = (status || '').toLowerCase();
    if (s === 'accepted') return 'bg-green-100 text-green-800';
    if (s === 'draft') return 'bg-gray-100 text-gray-800';
    if (s === 'sent') return 'bg-blue-100 text-blue-800';
    if (s === 'rejected') return 'bg-red-100 text-red-800';
    if (s === 'overdue') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearchQuery('');
    setCurrentPage(1);
    fetchQuotations({ page: 1 });
  };

  const handleApprove = async (quotationId) => {
    try {
      await api.patch(`/quotations/${quotationId}/approve`);
      toast.success('Quotation approved');
      fetchQuotations();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error approving quotation:', error);
      toast.error('Failed to approve quotation');
    }
  };

  const handleReject = async (quotationId) => {
    try {
      await api.post(`/quotations/${quotationId}/reject`);
      toast.success('Quotation rejected');
      fetchQuotations();
      setActionMenuOpen(null);
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast.error('Failed to reject quotation');
    }
  };

  const handleDuplicate = async (quotation) => {
    try {
      const payload = { ...quotation };
      delete payload._id;
      delete payload.quotationNo;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.pdfSnapshots;
      delete payload.auditLogs;
      payload.status = 'draft';
      const res = await api.post('/quotations', payload);
      const created = res?.data?.data || res?.data;
      toast.success('Quotation duplicated');
      // navigate to edit for minor changes
      window.location.href = `/quotations/${created._id}/edit`;
    } catch (error) {
      console.error('Error duplicating quotation:', error);
      toast.error('Failed to duplicate quotation');
    }
  };

  const handleMarkInvoiced = async (quotationId) => {
    const invoiceNo = prompt('Enter invoice number to link to this quotation (e.g. INV-2025-001):');
    if (!invoiceNo) return;
    try {
      await api.patch(`/quotations/${quotationId}`, { status: 'accepted', invoiceNo });
      toast.success('Invoice number linked to quotation');
      fetchQuotations();
    } catch (error) {
      console.error('Error linking invoice:', error);
      toast.error('Failed to link invoice number');
    }
  };

  const handleDownload = async (q) => {
    try {
      toast.success('Downloading quotation PDF...');
      await downloadQuotationPdf(q._id, q.quotationNo);
      setActionMenuOpen(null);
    } catch (error) {
      console.error('PDF download error', error);
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quotations</h1>
          <p className="text-xs text-gray-600 mt-0.5">Create, send and manage quotations</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors flex items-center w-full md:w-auto justify-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          New Quotation
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
                placeholder="Search quotations..."
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
              {/* <option value="sent">Sent</option> */}
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              {/* <option value="overdue">Overdue</option> */}
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
                  {/* <option value="sent">Sent</option> */}
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  {/* <option value="overdue">Overdue</option> */}
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
          <div className="text-lg font-bold text-gray-800">{quotations.length}</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-2 border-green-500">
          <div className="text-xs text-gray-600">Accepted</div>
          <div className="text-lg font-bold text-gray-800">
            {quotations.filter(q => q.status === 'accepted').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-2 border-yellow-500">
          <div className="text-xs text-gray-600">Pending</div>
          <div className="text-lg font-bold text-gray-800">
            {quotations.filter(q => q.status === 'sent' || q.status === 'draft').length}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border-l-2 border-red-500">
          <div className="text-xs text-gray-600">Overdue</div>
          <div className="text-lg font-bold text-gray-800">
            {quotations.filter(q => {
              const due = q?.expiryDate ? new Date(q.expiryDate) : null;
              const now = new Date();
              return due && due < now && q.status !== 'accepted';
            }).length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm  flex flex-col" style={{ height: "65vh" }}>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-1">No quotations found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || statusFilter ? 'Try adjusting your search or filter' : 'Get started by creating a new quotation'}
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
                + New Quotation
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
                      Quotation
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
                      Invoice
                    </th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotations.map((q) => (
                    <tr key={q._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-blue-600 hover:text-blue-800 cursor-default font-medium text-xs">
                            {q.quotationNo || `QUO-${q._id.slice(-6)}`}
                          </p>
                          <p className="text-xs text-gray-500 sm:hidden mt-0.5">
                            {formatDate(q.date)}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 hidden sm:table-cell">
                        {formatDate(q.date)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-600 hidden md:table-cell">
                        <div className="max-w-[120px] truncate" title={q.customer?.name}>
                          {q.customer?.name || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-max whitespace-nowrap ${getStatusBadgeClass(q.status)}`}>
                            {q.status || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                         {formatCurrency(q.total ?? q.computedTotal ?? 0)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                        {q.invoiceNo || '-'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            to={`/quotation-view/${q._id}`}
                            className="text-blue-600 hover:text-blue-800 p-0.5 rounded hover:bg-blue-50"
                            title="View quotation"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>

                          <button
                            onClick={() => { setEditingId(q._id); setOpen(true); }}
                            className="text-gray-600 hover:text-gray-800 p-0.5 rounded hover:bg-gray-100"
                            title="Edit quotation"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpen(actionMenuOpen === q._id ? null : q._id);
                              }}
                              className="text-gray-600 hover:text-gray-800 p-0.5 rounded hover:bg-gray-100"
                              title="More actions"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>

                            {actionMenuOpen === q._id && (
                              <div className="origin-top-right absolute right-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                  {q.status == 'accepted' || q.status == 'rejected' ?"": (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleApprove(q._id); }}
                                      className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      Approve Quotation
                                    </button>
                                  )}
                                  {q.status == 'accepted' || q.status == 'rejected' ? '' : (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReject(q._id); }}
                                      className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                      role="menuitem"
                                    >
                                      Reject Quotation
                                    </button>
                                  )}
                                  {q.status !== 'rejected' && <button
                                    onClick={(e) => { e.stopPropagation(); handleMarkInvoiced(q._id); }}
                                    className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                    role="menuitem"
                                  >
                                    Mark as Invoiced
                                  </button>}
                                  <button
                                    onClick={(e) => { downloadQuotationPdf(q._id, q.quotationNo); }}
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
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2.5 py-1 text-xs font-medium rounded ${currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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

      <CreateQuotationModal
        open={open}
        quotationId={editingId}
        onClose={() => { setOpen(false); setEditingId(null); }}
        onSaved={() => {
          toast.success(editingId ? "Quotation updated successfully" : "Quotation created successfully");
          setOpen(false);
          setEditingId(null);
          fetchQuotations();
        }}
      />
    </div>
  );
}
