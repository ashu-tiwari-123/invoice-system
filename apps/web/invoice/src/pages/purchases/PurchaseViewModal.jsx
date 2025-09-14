import { useEffect, useState } from "react";
import api from "../../axiosInstance";
import { formatCurrency, formatDate } from "../../utils/FormatUtilities";

export default function PurchaseViewModal({ open, onClose, record }) {
  const [full, setFull] = useState(record);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!record) return;
    
    setLoading(true);
    (async () => {
      try {
        if (!record.purchases || !record.purchases.length) {
          const res = await api.get(`/purchases/${record._id}`);
          setFull(res?.data?.data || record);
        } else {
          setFull(record);
        }
      } catch (err) {
        console.error("Failed to load purchase details:", err);
        setFull(record);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, record]);

  if (!open) return null;

  const totalAmount = full?.totalPurchaseCost ?? (full?.purchases || []).reduce((s, p) => s + (p.amount || 0), 0);
  const itemsCount = full?.purchases?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Purchase Details</h2>
            <p className="text-sm opacity-90 mt-1">
              Invoice: {full?.invoiceId?.invoiceNo || full?.invoiceId || "—"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-white/10 transition-colors" 
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Total Value</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-100 p-2 rounded-lg">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Items</p>
                      <p className="text-lg font-semibold text-gray-900">{itemsCount}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-purple-100 p-2 rounded-lg">
                      <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2极5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Created On</p>
                      <p className="text-sm font-semibold text-gray-900">{formatDate(full?.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Invoice Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Invoice Number</p>
                    <p className="text-sm font-medium text-gray-900">
                      {full?.invoiceId?.invoiceNo || full?.invoiceId || "—"}
                    </p>
                  </div>
                  {full?.invoiceId?.customer?.name && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Customer</p>
                      <p className="text-sm font-medium text-gray-900">{full.invoiceId.customer.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase Items */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Purchase Items ({itemsCount})
                </h3>

                {itemsCount === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-16" />
                    </svg>
                    <p>No purchase items found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-700 bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Vendor</th>
                          <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Description</th>
                          <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(full?.purchases || []).map((p, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{p.vendor?.name || "—"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-gray-700">{p.description || "—"}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {formatCurrency(p.amount ?? 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="2" className="px-4 py-3 text-right font-medium text-gray-700">
                            Total:
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(totalAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}