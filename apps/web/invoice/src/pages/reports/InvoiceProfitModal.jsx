// InvoiceProfitModal.jsx
import { useEffect } from "react";
import { FiX, FiTrendingUp, FiTrendingDown, FiDollarSign, FiPercent, FiPackage } from "react-icons/fi";
import { formatCurrency } from "../../utils/FormatUtilities";

export default function InvoiceProfitModal({ open, onClose, data }) {
  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-95 opacity-0 animate-modal-in">
        <style jsx>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-modal-in {
            animation: modalIn 0.3s ease-out forwards;
          }
        `}</style>
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-blue-500 text-white flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-white/10 rounded-lg mr-3">
              <FiDollarSign className="text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Invoice Profit Analysis</h2>
              <p className="text-xs opacity-90 mt-1">
                {data ? `Invoice #${data.invoiceNo || data.invoiceId}` : 'Loading details...'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {!data ? (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <div className="animate-pulse w-8 h-8 bg-blue-400 rounded-full"></div>
              </div>
              <p className="text-gray-600">Loading invoice details...</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-blue-700">Revenue</div>
                    <FiTrendingUp className="text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-blue-800 mt-2">
                    {formatCurrency(data.revenue)}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Net: {formatCurrency(data.revenueNetOfTax)}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-lg border border-red-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-red-700">Costs</div>
                    <FiTrendingDown className="text-red-500" />
                  </div>
                  <div className="text-2xl font-bold text-red-800 mt-2">
                    {formatCurrency(data.purchaseCost + data.directExpenses)}
                  </div>
                  <div className="text-xs text-red-600 mt-1">
                    COGS + Expenses
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg border ${
                  data.netProfit >= 0 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100' 
                    : 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-medium ${
                      data.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      Net Profit
                    </div>
                    {data.netProfit >= 0 ? (
                      <FiTrendingUp className="text-green-500" />
                    ) : (
                      <FiTrendingDown className="text-red-500" />
                    )}
                  </div>
                  <div className={`text-2xl font-bold mt-2 ${
                    data.netProfit >= 0 ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {formatCurrency(data.netProfit)}
                  </div>
                  <div className={`text-xs mt-1 ${
                    data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {data.revenue ? `${((data.netProfit / data.revenue) * 100).toFixed(1)}% margin` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Detailed Breakdown</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Income Section */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 flex items-center">
                    <FiTrendingUp className="mr-2 text-green-500" />
                    Income
                  </h4>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Gross Revenue</span>
                    <span className="font-medium">{formatCurrency(data.revenue)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Tax Collected</span>
                    <span className="font-medium text-blue-600">{formatCurrency(data.taxCollected)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-sm text-green-700">Net Revenue</span>
                    <span className="font-medium text-green-700">{formatCurrency(data.revenueNetOfTax)}</span>
                  </div>
                </div>

                {/* Costs Section */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 flex items-center">
                    <FiTrendingDown className="mr-2 text-red-500" />
                    Costs & Deductions
                  </h4>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Purchase / COGS</span>
                    <span className="font-medium text-red-600">{formatCurrency(data.purchaseCost)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Direct Expenses</span>
                    <span className="font-medium text-red-600">{formatCurrency(data.directExpenses)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Invoice Discount</span>
                    <span className="font-medium text-amber-600">{formatCurrency(data.invoiceDiscount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Returns/Adjustments</span>
                    <span className="font-medium text-amber-600">{formatCurrency(data.returnsAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Overhead Allocation</span>
                    <span className="font-medium text-amber-600">{formatCurrency(data.overheadAlloc)}</span>
                  </div>
                </div>
              </div>

              {/* Profit Summary */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                <h4 className="font-semibold text-indigo-800 mb-3 flex items-center">
                  <FiDollarSign className="mr-2" />
                  Profit Summary
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                    <span className="text-sm text-indigo-700">Gross Profit</span>
                    <span className="font-medium">{formatCurrency(data.grossProfit)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-indigo-100">
                    <span className="text-sm text-indigo-700">Operating Profit</span>
                    <span className="font-medium">{formatCurrency(data.operatingProfit)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-semibold text-indigo-900">Net Profit</span>
                    <span className={`text-lg font-bold ${
                      data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(data.netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}