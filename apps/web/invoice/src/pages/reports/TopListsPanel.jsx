// TopListsPanel.jsx
import { useEffect, useState } from "react";
import { fetchTopCustomers, fetchTopProducts } from "./ReportsApi";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../utils/FormatUtilities";

export default function TopListsPanel({ params }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [cRes, pRes] = await Promise.all([
        fetchTopCustomers({ from: params.from, to: params.to, limit: 10 }),
        fetchTopProducts({ from: params.from, to: params.to, limit: 10 }),
      ]);
      setCustomers(cRes.data?.data?.topCustomers ?? []);
      setProducts(pRes.data?.data?.topProducts ?? []);
    } catch (err) {
      console.error("Failed to fetch top lists", err);
      toast.error("Failed to load top lists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [params.from, params.to]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-medium mb-2">Top Customers</h3>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-2">
          {customers.length === 0 && <div className="text-sm text-gray-500">No data</div>}
          {customers.map(c => (
            <div key={String(c._id)} className="flex items-center justify-between p-2 border rounded">
              <div className="text-sm">{c.name || "—"}</div>
              <div className="text-sm font-semibold">{formatCurrency(c.totalRevenue)}</div>
            </div>
          ))}
        </div>
      )}

      <hr className="my-3" />
      <h3 className="text-lg font-medium mb-2">Top Products</h3>
      {loading ? <div>Loading...</div> : (
        <div className="space-y-2">
          {products.length === 0 && <div className="text-sm text-gray-500">No data</div>}
          {products.map(p => (
            <div key={String(p._id)} className="flex items-center justify-between p-2 border rounded">
              <div className="text-sm">{p.name || "—"}</div>
              <div className="text-sm font-semibold">{formatCurrency(p.revenue)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
