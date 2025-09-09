import { useEffect, useMemo, useState, useRef } from "react";
import api from "../../axiosInstance";
import { Input, Label, Textarea } from "../../utils/FormUtils";
import { StateSelect } from "../../utils/StateDropwdown";
import CustomColumnsModal from "./CustomColumnModal";
import { formatCurrency } from "../../utils/FormatUtilities";
import {
  generateDefaultColumns,
  computeTotals,
  buildQuotationPayload,
  toNum
} from "../../utils/quotationUtils";

const DEFAULT_COLUMNS = generateDefaultColumns();

export default function QuotationFormModal({ open, onClose, onSaved, quotationId }) {
  const isEdit = Boolean(quotationId);
  const dialogRef = useRef(null);
  const mounted = useRef(false);

  const [seller, setSeller] = useState(null);
  const [quotationMeta, setQuotationMeta] = useState({ date: new Date().toISOString().slice(0, 10), subject: "", notes: "" });

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [buyer, setBuyer] = useState({ name: "", stateCode: "" });
  const [customerId, setCustomerId] = useState(null);
  const selectedCustomerIdRef = useRef(null);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const customerInputFocusedRef = useRef(false);

  const [customColumns, setCustomColumns] = useState(DEFAULT_COLUMNS);
  const [items, setItems] = useState([{ sno: 1, item: "", columns: { [DEFAULT_COLUMNS[0].key]: 0, [DEFAULT_COLUMNS[1].key]: 0, total: 0 } }]);

  const [colsModalOpen, setColsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [productSuggestions, setProductSuggestions] = useState({});
  const productSearchTimers = useRef({});

  const [termsText, setTermsText] = useState("");
  const [sendPerRow, setSendPerRow] = useState(true); // single checkbox option

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get("/company");
        if (!mounted.current) return;
        setSeller(res?.data?.data || null);
      } catch (e) { console.warn("Failed to load company profile", e); }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setQuotationMeta({ date: new Date().toISOString().slice(0, 10), subject: "", notes: "" });
      setCustomColumns(DEFAULT_COLUMNS);
      setItems([{ sno: 1, item: "", columns: { [DEFAULT_COLUMNS[0].key]: 0, [DEFAULT_COLUMNS[1].key]: 0, total: 0 } }]);
      setBuyer({ name: "", stateCode: "" });
      setCustomerId(null);
      setCustomerQuery("");
      setCustomerOptions([]);
      setShowCustomerList(false);
      setProductSuggestions({});
      setErrors({});
      setTermsText("");
      setSendPerRow(true);
      selectedCustomerIdRef.current = null;
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/quotations/${quotationId}`);
        const q = res?.data?.data;
        if (!mounted.current) return;

        setQuotationMeta({
          date: q?.date ? (new Date(q.date).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
          subject: q?.subject || "",
          notes: q?.notes || "",
        });

        setBuyer(q?.customer || { name: "", stateCode: "" });
        setCustomerId(q?.customer?._id || null);
        selectedCustomerIdRef.current = q?.customer?._id || null;
        setCustomerQuery(q?.customer?.name || "");

        const cols = (q?.customColumns && q.customColumns.length) ? q.customColumns : DEFAULT_COLUMNS;
        setCustomColumns(cols);

        const mapped = (q?.items || []).map((it, idx) => {
          const columns = it.columns || {};
          columns.total = Number(columns.total ?? 0);
          return { sno: it.sno ?? (idx + 1), item: it.item ?? it.name ?? it.description ?? "", columns };
        });
        if (mapped.length) setItems(mapped);
        else setItems([{ sno: 1, item: "", columns: { ...cols.reduce((a, c) => ((a[c.key] = 0), a), {}), total: 0 } }]);

        if (q?.termsAndConditions) {
          if (Array.isArray(q.termsAndConditions)) setTermsText(q.termsAndConditions.join("\n"));
          else if (typeof q.termsAndConditions === "string") setTermsText(q.termsAndConditions.split(/\r?\n/).map(s => s.replace(/^\d+\.\s*/, "")).join("\n"));
        } else setTermsText("");

        // prefer explicit server flag; else infer from persisted total presence
        if (typeof q?.sendPerRow === "boolean") setSendPerRow(Boolean(q.sendPerRow));
        else setSendPerRow(!(typeof q?.total === "number"));

      } catch (err) {
        console.error("Failed to load quotation for edit:", err);
      }
    })();
  }, [open, isEdit, quotationId]);

  // customer search debounce
  useEffect(() => {
    if (!open) return;
    const q = (customerQuery || "").trim();
    if (customerId && selectedCustomerIdRef.current === customerId && q === (buyer?.name || "").trim()) {
      setCustomerOptions([]); setShowCustomerList(false); setSearchingCustomers(false); return;
    }
    if (!q) { setCustomerOptions([]); setShowCustomerList(false); setSearchingCustomers(false); return; }

    const t = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const res = await api.get("/catalog/customers/search", { params: { q, limit: 8 } });
        if (!mounted.current) return;
        setCustomerOptions(res?.data?.data || []); setShowCustomerList(true);
      } catch (e) {
        console.warn("Customer search failed", e);
        setCustomerOptions([]); setShowCustomerList(false);
      } finally { if (mounted.current) setSearchingCustomers(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [customerQuery, open, customerId, buyer?.name]);

  // helpers (make sure these exist once)
  function onCustomerInputChange(v) {
    setCustomerQuery(v);
    if (customerId && v.trim() !== (buyer?.name || "").trim()) {
      setCustomerId(null);
      selectedCustomerIdRef.current = null;
    }
  }
  function onCustomerInputBlur() {
    setTimeout(() => {
      customerInputFocusedRef.current = false;
      setShowCustomerList(false);
    }, 150);
  }
  function onCustomerInputFocus() {
    customerInputFocusedRef.current = true;
    if (customerOptions.length) setShowCustomerList(true);
  }

  async function doProductSearchForRow(idx, q) {
    if (productSearchTimers.current[idx]) clearTimeout(productSearchTimers.current[idx]);
    if (!q || q.trim().length < 1) { setProductSuggestions(s => ({ ...s, [idx]: [] })); return; }
    productSearchTimers.current[idx] = setTimeout(async () => {
      try {
        const res = await api.get("/catalog/products/search", { params: { q: q.trim(), limit: 8 } });
        if (!mounted.current) return;
        setProductSuggestions(s => ({ ...s, [idx]: res?.data?.data || [] }));
      } catch (err) {
        console.warn("Product search failed for row", idx, err);
        setProductSuggestions(s => ({ ...s, [idx]: [] }));
      }
    }, 300);
  }

  function pickCustomer(c) {
    if (!c) return;
    const next = {
      name: c?.name || "",
      gstin: c?.gstin || "",
      address: c?.address || "",
      state: c?.state || "",
      stateCode: c?.stateCode !== undefined && c?.stateCode !== null ? String(c.stateCode) : "",
      phone: c?.phone || "",
      email: c?.email || "",
    };
    setBuyer(next);
    setCustomerId(c?._id || null);
    selectedCustomerIdRef.current = c?._id || null;
    setCustomerQuery(next.name || "");
    setShowCustomerList(false);
    setCustomerOptions([]);
  }

  function onDescriptionChange(idx, text) {
    setItems((arr) => {
      const copy = [...arr];
      copy[idx] = { ...copy[idx], item: text };
      return copy;
    });
    doProductSearchForRow(idx, text);
  }

  function pickProductForRow(idx, p) {
    setItems((arr) => {
      const copy = [...arr];
      copy[idx] = copy[idx] || { sno: idx + 1, item: "", columns: {} };
      const firstNumKey = customColumns.find(c => c.type === "number")?.key;
      const priceKey = firstNumKey ?? customColumns[1]?.key ?? null;
      const newCols = { ...(copy[idx].columns || {}) };
      if (priceKey) newCols[priceKey] = toNum(p?.sellPrice ?? p?.price ?? 0);
      copy[idx].item = p?.name || copy[idx].item;
      copy[idx].columns = newCols;
      return copy;
    });
    setProductSuggestions((s) => ({ ...s, [idx]: [] }));
  }

  function setItemCell(rowIdx, key, value) {
    setItems((arr) => {
      const copy = [...arr];
      copy[rowIdx] = copy[rowIdx] || { sno: rowIdx + 1, item: "", columns: {} };
      copy[rowIdx].columns = { ...(copy[rowIdx].columns || {}), [key]: value };
      const c = copy[rowIdx].columns;
      const qty = toNum(c.qty ?? c.quantity ?? c.QTY ?? 0);
      const price = toNum(c.price ?? c.rate ?? c.unitPrice ?? c.sellPrice ?? 0);
      if (qty > 0 || price > 0) c.total = Number((qty * price - (toNum(c.discount) || 0)).toFixed(2));
      copy[rowIdx].columns = c;
      return copy;
    });
  }

  function addRow() {
    setItems((arr) => {
      const newCols = customColumns.reduce((acc, c) => { acc[c.key] = 0; return acc; }, {});
      newCols.total = 0;
      return [...arr, { sno: arr.length + 1, item: "", columns: newCols }];
    });
  }
  function removeRow(i) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
    setProductSuggestions((s) => { const copy = { ...s }; delete copy[i]; return copy; });
  }

  useEffect(() => {
    setItems((arr) => arr.map((r, idx) => {
      const cols = { ...(r.columns || {}) };
      customColumns.forEach(c => { if (cols[c.key] === undefined) cols[c.key] = 0; });
      if (cols.total === undefined) cols.total = 0;
      return { ...r, columns: cols, sno: r.sno ?? (idx + 1) };
    }));
  }, [customColumns]);

  const totals = useMemo(() => computeTotals(items), [items]);

  function validate() {
    const e = {};
    if (!buyer.name?.trim()) e.buyerName = "Buyer name is required";
    if (!items.length) e.items = "Add at least one item";
    const badItemIndex = items.findIndex((it) => !it.item?.trim() || toNum(it.columns?.total) <= 0);
    if (badItemIndex >= 0) e.itemsRow = `Check item #${badItemIndex + 1}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

async function submit(e) {
  e?.preventDefault?.();
  if (!validate()) { dialogRef.current?.focus?.(); return; }
  setSaving(true);
  let saved = null;

  try {
    // prepare terms
    const termsLines = (termsText || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // build base payload from builder
    let payload = buildQuotationPayload({
      meta: quotationMeta,
      customerId,
      buyer,
      customColumns, // UI columns
      items,
      totals
    });

    payload.termsAndConditions = termsLines;
    payload.sendPerRow = Boolean(sendPerRow);

    payload.items = (items || []).map(it => ({
      ...it,
      columns: { ...(it.columns || {}), total: Number(it.columns?.total || 0) }
    }));

    let colsToSend = Array.isArray(customColumns) ? [...customColumns] : [];
    const hasTotalCol = colsToSend.some(c => c.key === "total");
    if (sendPerRow && !hasTotalCol) {
      colsToSend.push({ key: "total", label: "Total", type: "number" });
    } else if (!sendPerRow && hasTotalCol) {
      colsToSend = colsToSend.filter(c => c.key !== "total");
    }
    payload.customColumns = colsToSend;

    if (isEdit) {
      const res = await api.patch(`/quotations/${quotationId}`, payload);
      saved = res?.data?.data;
    } else {
      const res = await api.post("/quotations", payload);
      saved = res?.data?.data;
    }

    onSaved?.(saved);
    onClose?.();

    if (!isEdit) {
      setQuotationMeta({ date: new Date().toISOString().slice(0, 10), subject: "", notes: "" });
      setCustomColumns(DEFAULT_COLUMNS);
      setItems([{ sno: 1, item: "", columns: { [DEFAULT_COLUMNS[0].key]: 0, [DEFAULT_COLUMNS[1].key]: 0, total: 0 } }]);
      setBuyer({ name: "", stateCode: "" });
      setCustomerId(null);
      setCustomerQuery("");
      setCustomerOptions([]);
      setProductSuggestions({});
      setErrors({});
      setTermsText("");
      setSendPerRow(true);
      selectedCustomerIdRef.current = null;
    }
  } catch (err) {
    console.error("Save quotation failed:", err);
    setErrors((ex) => ({ ...ex, submit: err?.response?.data?.message || err.message }));
  } finally {
    if (mounted.current) setSaving(false);
  }
}


  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} className="relative z-10 w-full max-w-6xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] focus:outline-none" tabIndex={-1}>
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{isEdit ? "Edit Quotation" : "Create Quotation"}</h2>
              <p className="text-sm opacity-90 mt-1">Seller State Code: <span className="font-medium">{seller?.stateCode || "—"}</span></p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                    {errors.buyerName && <li>{errors.buyerName}</li>}
                    {errors.items && <li>{errors.items}</li>}
                    {errors.itemsRow && <li>{errors.itemsRow}</li>}
                    {errors.submit && <li>{errors.submit}</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* --- Quotation Details & sendPerRow checkbox --- */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Quotation Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label>Subject</Label>
                  <Input value={quotationMeta.subject || ""} onChange={(v) => setQuotationMeta(m => ({ ...m, subject: v }))} placeholder="Quotation subject" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={quotationMeta.date || ""} onChange={(v) => setQuotationMeta(m => ({ ...m, date: v }))} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={quotationMeta.notes || ""} onChange={(v) => setQuotationMeta(m => ({ ...m, notes: v }))} placeholder="Short note" />
                </div>

                <div className="md:col-span-4">
                  <Label>Custom Table Columns</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {customColumns.map(c => <div key={c.key} className="px-2 py-1 bg-gray-100 rounded text-xs">{c.label}</div>)}
                    </div>
                    <button className="ml-auto px-3 py-1 border rounded text-sm" onClick={() => setColsModalOpen(true)}>Edit Columns</button>
                    <button className="px-3 py-1 border rounded text-sm" onClick={() => setCustomColumns(generateDefaultColumns())}>Reset</button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={sendPerRow} onChange={(e) => setSendPerRow(Boolean(e.target.checked))} />
                      <span>Send per-row totals (include "total" column)</span>
                    </label>
                    <div className="text-xs text-gray-500">If unchecked, grand total will be sent and persisted.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer and Items blocks (unchanged layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">Customer</h3>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Label>Customer Search</Label>
                    <div className="relative">
                      <Input
                        value={customerQuery}
                        onChange={(v) => onCustomerInputChange(v)}
                        placeholder="Search customer by name, email, or phone"
                        onFocus={onCustomerInputFocus}
                        onBlur={onCustomerInputBlur}
                        className="pr-10"
                      />
                      {searchingCustomers && (
                        <div className="absolute right-3 top-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>

                    {showCustomerList && customerOptions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {customerOptions.map((c) => (
                          <button key={c._id} type="button" className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0" onClick={() => pickCustomer(c)}>
                            <div className="font-medium text-gray-900">{c.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {c.email && <span>{c.email}</span>}
                              {c.phone && <span>{c.email ? ' • ' : ''}{c.phone}</span>}
                              {c.gstin && <span className="block mt-1">GSTIN: {c.gstin}</span>}
                              {c.state && <span className="block mt-1">{c.state} ({c.stateCode})</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Name</Label>
                      <Input value={buyer.name || ""} onChange={(v) => setBuyer(b => ({ ...b, name: v }))} placeholder="Customer name" />
                    </div>
                    <div>
                      <Label>GSTIN</Label>
                      <Input value={buyer.gstin || ""} onChange={(v) => setBuyer(b => ({ ...b, gstin: v.toUpperCase() }))} placeholder="GSTIN" />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={buyer.phone || ""} onChange={(v) => setBuyer(b => ({ ...b, phone: v }))} placeholder="Phone" />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Textarea rows={2} value={buyer.address || ""} onChange={(v) => setBuyer(b => ({ ...b, address: v }))} />
                    </div>
                    <div>
                      <Label>State</Label>
                      <StateSelect state={buyer.state || ""} onStateChange={(st) => setBuyer(b => ({ ...b, state: st?.name || "", stateCode: st?.code ? String(st.code) : "" }))} />
                    </div>
                    <div>
                      <Label>State Code</Label>
                      <Input value={buyer.stateCode || ""} readOnly className="bg-gray-50" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">Items</h3>
                  <button type="button" className="px-3 py-1 border rounded text-sm" onClick={addRow}>+ Add Item</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 font-medium">SNo</th>
                        <th className="px-3 py-2 font-medium">Item</th>
                        {customColumns.map(c => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2">{r.sno || idx + 1}</td>
                          <td className="px-3 py-2">
                            <Input value={r.item} onChange={(v) => onDescriptionChange(idx, v)} className="w-full" />
                            {productSuggestions[idx] && productSuggestions[idx].length > 0 && (
                              <div className="absolute z-50 bg-white border border-gray-200 rounded-lg mt-1 max-h-60 overflow-y-auto">
                                {productSuggestions[idx].map(p => (
                                  <button key={p._id} type="button" className="w-full text-left p-3 hover:bg-blue-50" onClick={() => pickProductForRow(idx, p)}>
                                    <div className="font-medium text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.hsn ? `HSN: ${p.hsn}` : ""} {p.sellPrice ? ` • ${formatCurrency(p.sellPrice)}` : ""}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {customColumns.map((c) => (
                            <td key={c.key} className="px-3 py-2">
                              {c.type === "date" ? (
                                <Input type="date" value={r.columns?.[c.key] || ""} onChange={(v) => setItemCell(idx, c.key, v)} />
                              ) : (
                                <Input value={r.columns?.[c.key] ?? ""} onChange={(v) => setItemCell(idx, c.key, v)} />
                              )}
                            </td>
                          ))}

                          <td className="px-3 py-2 text-right">{formatCurrency(Number(r.columns?.total || 0))}</td>
                          <td className="px-3 py-2">
                            <button type="button" className="text-red-600" onClick={() => removeRow(idx)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div />
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between text-sm text-gray-600">
                      <div>Grand Total</div>
                      <div className="font-semibold">{formatCurrency(totals.grandTotal)}</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Terms & Conditions</h3>
              <p className="text-xs text-gray-500 mb-2">Enter each term on a new line. We'll send them to backend as an array of strings.</p>
              <Textarea rows={4} value={termsText} onChange={(v) => setTermsText(v)} placeholder={"Payment within 30 days\nDelivery within 7 days"} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">{isEdit ? "Editing existing quotation" : "Creating new quotation"}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="button" disabled={saving} onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{saving ? "Saving..." : (isEdit ? "Save Changes" : "Create Quotation")}</button>
          </div>
        </div>
      </div>

      <CustomColumnsModal open={colsModalOpen} columns={customColumns} onClose={() => setColsModalOpen(false)} onSave={(cols) => { setCustomColumns(cols); setColsModalOpen(false); }} />
    </div>
  );
}
