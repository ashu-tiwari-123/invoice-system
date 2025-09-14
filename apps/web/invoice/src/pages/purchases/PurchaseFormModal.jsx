import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../axiosInstance";
import { Input, Label, Textarea } from "../../utils/FormUtils";
import { formatCurrency } from "../../utils/FormatUtilities";
import { toast } from "react-hot-toast";
import { HiSearch } from "react-icons/hi";

const EMPTY_ROW = () => ({ sno: 1, vendorName: "", description: "", amount: 0 });

export default function PurchaseFormModal({ open, onClose, onSaved, purchaseId }) {
  const isEdit = Boolean(purchaseId);
  const mounted = useRef(false);
  const dialogRef = useRef(null);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!isEdit) {
      setRows([EMPTY_ROW()]);
      setSelectedInvoice(null);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/purchases/${purchaseId}`);
        const rec = res?.data?.data;
        if (!mounted.current) return;

        setSelectedInvoice(rec?.invoiceId || null);
        setRows((rec?.purchases || []).map((p, idx) => ({ sno: idx + 1, vendorName: p.vendor?.name || "", description: p.description || "", amount: Number(p.amount || 0) })) || [EMPTY_ROW()]);
      } catch (err) {
        console.error("Failed to load purchase:", err);
        setErrors({ submit: "Failed to load purchase" });
      } finally { if (mounted.current) setLoading(false); }
    })();
  }, [open, purchaseId, isEdit]);

  // invoice search (simple, required when linking to invoice)
  useEffect(() => {
    if (!open) return;
    const q = (invoiceSearch || "").trim();
    if (!q) { setInvoiceOptions([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/invoices", { params: { q, limit: 10 } });
        setInvoiceOptions(res?.data?.data?.invoices || res?.data?.data || []);
      } catch (err) {
        setInvoiceOptions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [invoiceSearch, open]);

  function addRow() {
    setRows(r => {
      const next = [...r];
      next.push({ ...EMPTY_ROW(), sno: r.length + 1 });
      return next;
    });
  }
  function removeRow(i) {
    setRows(r => r.filter((_, idx) => idx !== i));
  }
  function setRow(i, key, value) {
    setRows(r => {
      const copy = [...r];
      copy[i] = { ...copy[i], [key]: key === "amount" ? Number(value || 0) : value };
      return copy;
    });
  }

  const totals = useMemo(() => {
    const subtotal = rows.reduce((s, row) => s + Number(row.amount || 0), 0);
    return { subtotal };
  }, [rows]);

  function validate() {
    const e = {};
    if (!selectedInvoice?.invoiceNo && !selectedInvoice?._id) e.invoice = "Please select an invoice";
    if (!rows.length) e.rows = "Add at least one purchase row";
    const bad = rows.findIndex(r => !r.vendorName?.trim() || Number(r.amount) <= 0 || !r.description?.trim());
    if (bad >= 0) e.rowsRow = `Check row #${bad + 1}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e?.preventDefault?.();
    if (!validate()) { dialogRef.current?.focus?.(); return; }
    setSaving(true);
    try {
      const payload = {
        invoiceId: selectedInvoice?._id || selectedInvoice?.invoiceNo,
        purchases: rows.map(r => ({
          vendor: { name: r.vendorName },
          description: r.description,
          amount: Number(r.amount || 0),
        })),
      };

      let res;
      if (isEdit) res = await api.put(`/purchases/${purchaseId}`, payload);
      else res = await api.post("/purchases", payload);

      const saved = res?.data?.data || res?.data;
      onSaved?.(saved);
      onClose?.();
      toast.success(isEdit ? "Purchase updated" : "Purchase created");
    } catch (err) {
      console.error("Save purchase failed:", err);
      setErrors(prev => ({ ...prev, submit: err?.response?.data?.message || err.message || "Save failed" }));
      toast.error("Failed to save purchase");
    } finally { if (mounted.current) setSaving(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div ref={dialogRef} className="relative z-10 w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 to-blue-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{isEdit ? "Edit Purchase" : "New Purchase"}</h2>
            <p className="text-sm opacity-90 mt-1">Link purchases to an invoice and record vendor costs</p>
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
              {Object.keys(errors).length > 0 && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="font-medium flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Please fix the following issues:
                  </div>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {errors.invoice && <li>{errors.invoice}</li>}
                    {errors.rows && <li>{errors.rows}</li>}
                    {errors.rowsRow && <li>{errors.rowsRow}</li>}
                    {errors.submit && <li>{errors.submit}</li>}
                  </ul>
                </div>
              )}

              {/* Invoice Selection */}
              <div className="bg-white rounded-xl p-5 mb-6 shadow-sm border border-gray-200">
                <Label className="block text-sm font-medium text-gray-700 mb-2">Invoice Selection</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <HiSearch/>
                  </div>
                  <input
                    type="text"
                    value={invoiceSearch || (selectedInvoice?.invoiceNo || "")}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search invoice by number..."
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {selectedInvoice && (
                    <div className="absolute right-2 top-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoice(null);
                          setInvoiceSearch("");
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                {invoiceOptions.length > 0 && invoiceSearch && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {invoiceOptions.map(inv => (
                      <button
                        key={inv._id || inv.invoiceNo}
                        type="button"
                        onClick={() => { 
                          setSelectedInvoice(inv); 
                          setInvoiceSearch(""); 
                          setInvoiceOptions([]); 
                        }}
                        className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{inv.invoiceNo || inv._id}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {inv.customer?.name || inv.customerName || "No customer name"}
                        </div>
                        {inv.createdAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            Created: {new Date(inv.createdAt).toLocaleDateString()}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {selectedInvoice && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-800">Selected Invoice</div>
                        <div className="text-sm text-blue-600">{selectedInvoice.invoiceNo || selectedInvoice._id}</div>
                        {selectedInvoice.customer?.name && (
                          <div className="text-xs text-blue-500 mt-1">Customer: {selectedInvoice.customer.name}</div>
                        )}
                      </div>
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        Selected
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Purchase Items */}
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Purchase Items</h3>
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors mt-2 sm:mt-0"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-700 bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Vendor</th>
                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Description</th>
                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-right">Amount</th>
                        <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 align-top text-gray-600 font-medium">{r.sno || idx + 1}</td>
                          <td className="px-4 py-3 align-top">
                            <input 
                              value={r.vendorName} 
                              onChange={(e) => setRow(idx, "vendorName", e.target.value)} 
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <input
                              value={r.description}
                              onChange={(e) => setRow(idx, "description", e.target.value)}
                              placeholder="Item description"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                                ₹
                              </span>
                              <input
                                type="number"
                                value={r.amount}
                                onChange={(e) => setRow(idx, "amount", e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(idx)}
                              className="text-red-600 hover:text-red-800 p-1 rounded-md hover:bg-red-50 transition-colors"
                              title="Remove item"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1极-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="3" className="px-4 py-3 text-right font-medium text-gray-700">
                          Subtotal:
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(totals.subtotal)}
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-500 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {isEdit ? "Editing purchase record" : "Creating purchase record"}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors w-full sm:w-auto flex items-center justify-center"
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Purchase"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}