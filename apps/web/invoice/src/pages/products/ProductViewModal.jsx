import { useEffect, useState } from "react";
import api from "../../axiosInstance";
import { formatDate } from "../../utils/FormatUtilities";
import { formatCurrency } from "../../utils/FormatUtilities";

export default function ProductViewModal({ open, onClose, product }) {
  const [full, setFull] = useState(product);

  useEffect(() => {
    if (!open) return;
    if (product && product._id) {
      // if product passed already full, use it; else fetch
      (async () => {
        try {
          if (!product.name && product._id) {
            const res = await api.get(`/catalog/products/${product._id}`);
            setFull(res?.data?.data || product);
          } else {
            setFull(product);
          }
        } catch (err) {
          setFull(product);
        }
      })();
    } else setFull(null);
  }, [open, product]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-blue-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{full?.name || "Product details"}</h2>
            <p className="text-sm opacity-90 mt-1">Product information</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">HSN</div>
              <div className="font-medium">{full?.hsn || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">GST</div>
              <div className="font-medium">{full?.gstTax != null ? `${full.gstTax}%` : "—"}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Sell Price</div>
              <div className="font-medium">{formatCurrency(full?.sellPrice ?? 0)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Purchase Price</div>
              <div className="font-medium">{formatCurrency(full?.purchasePrice ?? 0)}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-gray-500">Status</div>
              <div className="font-medium">{full?.isActive === false ? "Inactive" : "Active"}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Added</div>
              <div className="font-medium">{formatDate(full?.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Updated</div>
              <div className="font-medium">{formatDate(full?.updatedAt)}</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}
