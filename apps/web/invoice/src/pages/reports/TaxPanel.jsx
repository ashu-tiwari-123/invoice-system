// TaxPanel.jsx
import { useEffect, useState } from "react";
import { fetchTax } from "./ReportsApi";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../utils/FormatUtilities";
import { FiDollarSign, FiFileText, FiPieChart, FiTrendingUp, FiCreditCard } from "react-icons/fi";

export default function TaxPanel({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchTax({ from: params.from, to: params.to });
      setData(res.data?.data ?? null);
    } catch (err) {
      console.error("Failed to fetch tax", err);
      toast.error("Failed to load tax report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [params.from, params.to]);

  // Calculate total tax
  const totalTax = data ? (data.totals?.cgst || 0) + (data.totals?.sgst || 0) + (data.totals?.igst || 0) : 0;

  return (
    <div className="bg-white rounded-xl h-[100%] shadow-md p-6 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">Tax Summary</h3>
          <p className="text-sm text-gray-500">Tax liabilities for the selected period</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Tax</div>
          <div className="text-xl font-bold text-blue-600 flex items-center justify-end gap-1">
            <FiDollarSign size={18} />
            {formatCurrency(totalTax)}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
          <p className="text-gray-500">Loading tax data...</p>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-lg">
          <FiFileText size={32} className="mx-auto mb-3 opacity-50" />
          <p>No tax data available for the selected period</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* CGST Card */}
          <div className="p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-blue-50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">CGST</div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiCreditCard size={18} className="text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totals?.cgst ?? 0)}</div>
            <div className="flex items-center mt-2">
              <FiTrendingUp size={16} className="text-blue-500 mr-1" />
              <span className="text-xs text-blue-600">Central GST</span>
            </div>
          </div>

          {/* SGST Card */}
          <div className="p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-green-50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">SGST</div>
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCreditCard size={18} className="text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totals?.sgst ?? 0)}</div>
            <div className="flex items-center mt-2">
              <FiTrendingUp size={16} className="text-green-500 mr-1" />
              <span className="text-xs text-green-600">State GST</span>
            </div>
          </div>

          {/* IGST Card */}
          <div className="p-5 rounded-xl border border-gray-100 bg-gradient-to-br from-white to-purple-50 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-500">IGST</div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiCreditCard size={18} className="text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-800">{formatCurrency(data.totals?.igst ?? 0)}</div>
            <div className="flex items-center mt-2">
              <FiTrendingUp size={16} className="text-purple-500 mr-1" />
              <span className="text-xs text-purple-600">Integrated GST</span>
            </div>
          </div>
        </div>
      )}

      {/* Tax Breakdown Section */}
      {data && data.breakdown && data.breakdown.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <FiPieChart size={16} className="text-blue-500" />
              Tax Breakdown
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CGST</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SGST</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">IGST</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.breakdown.slice(0, 5).map((item, index) => {
                    const itemTotalTax = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {item.date ? new Date(item.date).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.invoiceNo || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(item.cgst || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(item.sgst || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(item.igst || 0)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(itemTotalTax)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {data.breakdown.length > 5 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="6" className="px-4 py-3 text-xs text-gray-500 text-center">
                        Showing 5 of {data.breakdown.length} transactions
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tax Distribution Visualization (if we have data) */}
      {data && totalTax > 0 && (
        <div className="mt-6">
          <div className="text-sm font-medium text-gray-700 mb-3">Tax Distribution</div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${((data.totals?.cgst || 0) / totalTax) * 100}%` }}
              title={`CGST: ${formatCurrency(data.totals?.cgst || 0)}`}
            ></div>
            <div 
              className="h-full bg-green-500" 
              style={{ width: `${((data.totals?.sgst || 0) / totalTax) * 100}%` }}
              title={`SGST: ${formatCurrency(data.totals?.sgst || 0)}`}
            ></div>
            <div 
              className="h-full bg-purple-500" 
              style={{ width: `${((data.totals?.igst || 0) / totalTax) * 100}%` }}
              title={`IGST: ${formatCurrency(data.totals?.igst || 0)}`}
            ></div>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-4 mt-3 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
              <span>CGST: {((data.totals?.cgst || 0) / totalTax * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
              <span>SGST: {((data.totals?.sgst || 0) / totalTax * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
              <span>IGST: {((data.totals?.igst || 0) / totalTax * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}