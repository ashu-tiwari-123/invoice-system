import { useEffect, useState } from "react";
import api from "../../axiosInstance";
import { formatCurrency, formatDate } from "../../utils/FormatUtilities";
import { FiX, FiCalendar, FiFileText, FiTag, FiExternalLink, FiInfo } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";

export default function ExpenseViewModal({ open, onClose, expense }) {
  const [full, setFull] = useState(expense);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!expense) return;
    
    setLoading(true);
    (async () => {
      try {
        if (!expense.type || expense?.description === undefined) {
          const res = await api.get(`/expenses/${expense._id}`);
          setFull(res?.data?.data || expense);
        } else {
          setFull(expense);
        }
      } catch (err) {
        console.warn("Failed to load expense", err);
        setFull(expense);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, expense]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 transition-opacity duration-300" onClick={onClose} />
      
      <div 
        className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-95 opacity-0"
        style={{ 
          animation: 'modalEnter 0.3s ease-out forwards',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-blue-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FaRupeeSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Expense Details</h2>
              <p className="text-sm opacity-90 mt-1">{full?.type || "Expense Information"}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200" 
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Amount Card */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-blue-800">
                  <FaRupeeSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Amount</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(full?.amount)}
                </div>
              </div>
            </div>

            {/* Type and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <FiTag className="w-4 h-4" />
                  <span className="text-xs font-medium">TYPE</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {full?.type || "—"}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <FiCalendar className="w-4 h-4" />
                  <span className="text-xs font-medium">DATE</span>
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {formatDate(full?.date) || "—"}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <FiFileText className="w-4 h-4" />
                <span className="text-xs font-medium">DESCRIPTION</span>
              </div>
              <div className={`text-sm ${full?.description ? "text-gray-800" : "text-gray-400"}`}>
                {full?.description || "No description provided"}
              </div>
            </div>

            {/* Linked Invoice */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-2 text-gray-600 mb-2">
                <FiExternalLink className="w-4 h-4" />
                <span className="text-xs font-medium">LINKED INVOICE</span>
              </div>
              <div className="text-sm">
                {full?.linkedInvoiceId ? (
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-600 font-medium truncate">
                      {typeof full.linkedInvoiceId === 'object' 
                        ? full.linkedInvoiceId.invoiceNo || full.linkedInvoiceId._id 
                        : full.linkedInvoiceId
                      }
                    </span>
                    <Link to={`/invoices-view/${full.linkedInvoiceId._id}`} className="text-indigo-500 hover:text-indigo-700 text-xs font-medium flex items-center">
                      View Invoice
                      <FiExternalLink className="ml-1 w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  <span className="text-gray-400">No invoice linked</span>
                )}
              </div>
            </div>

            {/* Additional Info */}
            {full?._id && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center space-x-2 text-gray-600 mb-2">
                  <FiInfo className="w-4 h-4" />
                  <span className="text-xs font-medium">EXPENSE ID</span>
                </div>
                <div className="text-xs font-mono text-gray-500 break-all">
                  {full._id}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes modalEnter {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}