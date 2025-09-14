// ProfitLossPanel.jsx
import { useEffect, useState } from "react";
import { fetchOverallPL, fetchInvoiceDetailed } from "./ReportsApi";
import { formatCurrency } from "../../utils/FormatUtilities";
import { toast } from "react-hot-toast";
import InvoiceProfitModal from "./InvoiceProfitModal";
import { FiDollarSign, FiShoppingCart, FiPieChart, FiSearch, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

export default function ProfitLossPanel({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchOverallPL({ from: params.from, to: params.to });
      setData(res.data?.data ?? null);
    } catch (err) {
      console.error("Failed to load P&L", err);
      toast.error("Failed to load profit & loss");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [params.from, params.to, params.customer, params.status]);

  const openInvoice = async () => {
    if (!invoiceId) return toast.error("Enter invoice id");
    try {
      toast.loading("Loading invoice...", { id: "inv" });
      const res = await fetchInvoiceDetailed(invoiceId);
      setInvoiceDetail(res.data?.data);
      setInvoiceModalOpen(true);
      toast.dismiss("inv");
    } catch (err) {
      console.error("Failed to load invoice detail", err);
      toast.error("Invoice not found or request failed");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Profit & Loss Overview</h3>
          <p className="text-sm text-gray-500">Financial summary for selected period</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
          <p className="text-gray-500">Loading financial data...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
          <FiPieChart size={32} className="mx-auto mb-3 opacity-50" />
          <p>No financial data available for the selected period</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Revenue Card */}
          <div className="p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-blue-50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Revenue</div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiDollarSign size={18} className="text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.revenue)}</div>
            <div className="flex items-center mt-2">
              <FiTrendingUp size={16} className="text-green-500 mr-1" />
              <span className="text-xs text-green-600">Primary income</span>
            </div>
          </div>

          {/* Purchases Card */}
          <div className="p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-amber-50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Purchases (COGS)</div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <FiShoppingCart size={18} className="text-amber-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalPurchase)}</div>
            <div className="flex items-center mt-2">
              <FiTrendingDown size={16} className="text-amber-500 mr-1" />
              <span className="text-xs text-amber-600">Cost of goods sold</span>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-rose-50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">Expenses</div>
              <div className="p-2 bg-rose-100 rounded-lg">
                <FiTrendingDown size={18} className="text-rose-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totalExpense)}</div>
            <div className="flex items-center mt-2">
              <FiTrendingDown size={16} className="text-rose-500 mr-1" />
              <span className="text-xs text-rose-600">Operational costs</span>
            </div>
          </div>

          {/* Net Profit Card */}
          <div className="md:col-span-3 mt-2 p-6 rounded-xl border border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div className="mb-3 sm:mb-0">
                <div className="text-sm font-medium text-gray-600">Net Profit</div>
                <div className="text-xs text-gray-500">After all deductions</div>
              </div>
              <div className={`text-2xl font-bold ${data.profit >= 0 ? "text-green-600" : "text-red-600"} flex items-center`}>
                {data.profit >= 0 ? (
                  <FiTrendingUp size={24} className="mr-2" />
                ) : (
                  <FiTrendingDown size={24} className="mr-2" />
                )}
                {formatCurrency(data.profit)}
              </div>
            </div>
            <div className="mt-4 bg-gray-200 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${data.profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.abs(data.profit) / (data.revenue || 1) * 100)}%` }}
              ></div>
            </div>
            <div className="mt-2 text-xs text-gray-500 flex justify-between">
              <span>Profit Margin</span>
              <span>{data.revenue ? ((data.profit / data.revenue) * 100).toFixed(2) : 0}%</span>
            </div>
          </div>
        </div>
      )}

      <InvoiceProfitModal open={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} data={invoiceDetail} />
    </div>
  );
}