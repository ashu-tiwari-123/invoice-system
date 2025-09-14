// SalesPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchSalesSummary, fetchSales } from "./ReportsApi";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency } from "../../utils/FormatUtilities";
import { toast } from "react-hot-toast";
import { FiTrendingUp, FiCalendar, FiDollarSign, FiFileText, FiUser, FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function SalesPanel({ params }) {
  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [page, setPage] = useState(1);
  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10 });
  const [loadingList, setLoadingList] = useState(false);

  const loadSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await fetchSalesSummary({ from: params.from, to: params.to, groupBy: params.groupBy });
      const series = res.data?.data?.series ?? res.data?.data?.series ?? [];
      const mapped = (series || []).map((s) => {
        const id = s._id || {};
        const label = params.groupBy === "day" ? `${id.year}-${String(id.month).padStart(2,"0")}-${String(id.day).padStart(2,"0")}` :
                      params.groupBy === "year" ? `${id.year}` : `${id.year}-${String(id.month).padStart(2,"0")}`;
        return { label, revenue: s.revenue || 0, count: s.count || 0 };
      });
      setSummary(mapped);
    } catch (err) {
      console.error("Failed to fetch sales summary", err);
      toast.error("Failed to load sales chart");
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadInvoices = async (p = 1) => {
    try {
      setLoadingList(true);
      const res = await fetchSales({ page: p, limit: 10, from: params.from, to: params.to, customerId: params.customer, status: params.status });
      const data = res.data?.data ?? {};
      setInvoices(data.invoices || []);
      setMeta(data.meta || { total: 0, page: 1, limit: 10 });
      setPage(data.meta?.page ?? p);
    } catch (err) {
      console.error("Failed to fetch invoices", err);
      toast.error("Failed to load sales");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { 
    loadSummary(); 
    loadInvoices(1); 
  }, [params.from, params.to, params.groupBy, params.customer, params.status]);

  const totalRevenue = useMemo(() => summary.reduce((s, x) => s + (x.revenue || 0), 0), [summary]);
  const topPeriods = useMemo(() => 
    summary.slice().sort((a,b)=>b.revenue-a.revenue).slice(0,5), 
    [summary]
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Sales Overview</h3>
          <p className="text-sm text-gray-500">Revenue trends and invoice details</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Period Revenue</div>
          <div className="text-xl font-bold text-blue-600 flex items-center justify-end gap-1">
            <FiDollarSign size={18} />
            {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Chart and Top Periods */}
        <div className="space-y-6">
          {/* Chart Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <FiTrendingUp size={16} className="text-blue-500" />
                Revenue Trend
              </div>
              <div className="text-xs text-gray-500">
                Grouped by: {params.groupBy || 'month'}
              </div>
            </div>
            
            {loadingSummary ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : summary.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <FiTrendingUp size={32} className="mb-2 opacity-50" />
                <p>No sales data available</p>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value), 'Revenue']}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#4f46e5" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: '#4f46e5' }} 
                      activeDot={{ r: 6, fill: '#4f46e5' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Periods Section */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <FiCalendar size={16} className="text-blue-500" />
              Top Performing Periods
            </div>
            
            {loadingSummary ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="animate-pulse flex justify-between p-2">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : topPeriods.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 py-8">
                <p>No period data available</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {topPeriods.map((s, index) => (
                  <div key={s.label} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-medium mr-3">
                        {index + 1}
                      </div>
                      <div className="text-sm font-medium text-gray-700">{s.label}</div>
                    </div>
                    <div className="text-sm font-semibold text-blue-600">{formatCurrency(s.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Recent Invoices */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FiFileText size={16} className="text-blue-500" />
              Recent Invoices
            </div>
            <div className="text-xs text-gray-500">
              Showing {invoices.length} of {meta.total} invoices
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loadingList ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-4 py-4">
                        <div className="animate-pulse flex space-x-4">
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-4 gap-4">
                              <div className="h-3 bg-gray-300 rounded col-span-1"></div>
                              <div className="h-3 bg-gray-300 rounded col-span-1"></div>
                              <div className="h-3 bg-gray-300 rounded col-span-1"></div>
                              <div className="h-3 bg-gray-300 rounded col-span-1"></div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      <FiFileText size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No invoices found</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {inv.invoiceNo || inv._id}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div className="flex items-center">
                          <FiUser size={14} className="mr-1 text-gray-400" />
                          {inv.customer?.name || inv.customerName || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(inv.grandTotal ?? inv.total ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 mt-4 rounded-b-xl">
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(meta.page - 1) * meta.limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(meta.page * meta.limit, meta.total)}</span> of{' '}
                  <span className="font-medium">{meta.total}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => { const p = Math.max(1, page-1); loadInvoices(p); }}
                    disabled={page<=1}
                    className={`relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${page<=1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <FiChevronLeft size={16} />
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    {page}
                  </span>
                  <button
                    onClick={() => { loadInvoices(page+1); }}
                    disabled={page * meta.limit >= meta.total}
                    className={`relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${page * meta.limit >= meta.total ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <FiChevronRight size={16} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}