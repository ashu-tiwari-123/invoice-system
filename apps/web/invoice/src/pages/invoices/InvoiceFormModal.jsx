import { useEffect, useMemo, useState, useRef } from "react";
import api from "../../axiosInstance";
import { toNum, normCode, formatCurrency } from "../../utils/FormatUtilities";
import { cls, Field, Input, Label, Select, Textarea, TotalCard } from './../../utils/FormUtils';
import { StateSelect } from "../../utils/StateDropwdown";

const GST_OPTIONS = ["0", "5", "12", "18", "28"];

export default function InvoiceModal({ open, onClose, onSaved, invoiceId }) {
  const isEdit = Boolean(invoiceId);
  const initialItems = [{ description: "", hsn: "", quantity: 1, unit: "pcs", rate: 0, discount: 0, gstRate: 0 }];

  const [seller, setSeller] = useState(null);
  const [buyer, setBuyer] = useState({ name: "", stateCode: "" });
  const [shipTo, setShipTo] = useState({});
  const [meta, setMeta] = useState({
    invoiceType: "Original for Buyer",
    invoiceDate: new Date().toISOString().slice(0, 10),
    poNo: "",
    placeOfDelivery: "",
    notes: "",
  });
  const [items, setItems] = useState(initialItems);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const dialogRef = useRef(null);

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [customerId, setCustomerId] = useState(null);

  const selectedCustomerIdRef = useRef(null);
  const customerInputFocusedRef = useRef(false);

  const [productSuggestions, setProductSuggestions] = useState({});
  const productSearchTimers = useRef({});

  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get("/company");
        if (!mounted.current) return;
        setSeller(res?.data?.data || null);
      } catch (e) {
        console.warn("Failed to load company profile", e);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (!isEdit) {
      setBuyer({ name: "", stateCode: "" });
      setShipTo({});
      setMeta({
        invoiceType: "Original for Buyer",
        invoiceDate: new Date().toISOString().slice(0, 10),
        poNo: "",
        placeOfDelivery: "",
        notes: "",
      });
      setItems(initialItems);
      setCustomerId(null);
      setCustomerQuery("");
      setCustomerOptions([]);
      setShowCustomerList(false);
      setProductSuggestions({});
      setErrors({});
      selectedCustomerIdRef.current = null;
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/invoices/${invoiceId}`);
        const inv = res?.data?.data;
        if (!mounted.current) return;

        setBuyer(inv?.buyer || { name: "", stateCode: "" });
        setShipTo(inv?.shipTo || {});
        setCustomerId(inv?.customer || null);
        selectedCustomerIdRef.current = inv?.customer || null;

        setMeta({
          invoiceType: inv?.invoiceType || "Original for Buyer",
          invoiceDate: inv?.invoiceDate ? inv.invoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
          poNo: inv?.poNo || "",
          placeOfDelivery: inv?.placeOfDelivery || "",
          notes: inv?.notes || "",
        });

        const mapped = (inv?.items || []).map((it) => ({
          description: it.description || it.product?.name || "",
          hsn: it.hsn || it.product?.hsn || "",
          quantity: toNum(it.quantity),
          unit: it.unit || "pcs",
          rate: toNum(it.rate),
          discount: toNum(it.discount),
          gstRate: toNum(it.gstRate ?? (toNum(it.cgstRate) + toNum(it.sgstRate) + toNum(it.igstRate))),
        }));

        setItems(mapped.length ? mapped : initialItems);
        setCustomerQuery(inv?.buyer?.name || "");
      } catch (e) {
        console.error("Failed to load invoice for edit:", e);
      }
    })();
  }, [open, isEdit, invoiceId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const totals = useMemo(() => {
    const destCode = normCode(shipTo?.stateCode || buyer?.stateCode);
    const sellerCode = normCode(seller?.stateCode);
    const sameState = sellerCode && destCode && sellerCode === destCode;

    return items.reduce((acc, it) => {
      const qty = toNum(it.quantity);
      const rate = toNum(it.rate);
      const discount = toNum(it.discount);
      const gstRate = toNum(it.gstRate);
      const taxable = Math.max(0, qty * rate - discount);

      let cgst = 0, sgst = 0, igst = 0;
      if (gstRate > 0 && taxable > 0) {
        if (sameState) {
          const half = (gstRate / 200) * taxable;
          cgst = half; sgst = half;
        } else {
          igst = (gstRate / 100) * taxable;
        }
      }

      acc.subtotal += taxable;
      acc.totalCgst += cgst;
      acc.totalSgst += sgst;
      acc.totalIgst += igst;
      return acc;
    }, { subtotal: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0 });
  }, [items, buyer?.stateCode, shipTo?.stateCode, seller?.stateCode]);

  const grandTotal = useMemo(
    () => totals.subtotal + totals.totalCgst + totals.totalSgst + totals.totalIgst,
    [totals]
  );

  useEffect(() => {
    if (!open) return;
    const q = (customerQuery || "").trim();

    if (customerId && selectedCustomerIdRef.current === customerId && q === (buyer?.name || "").trim()) {
      setCustomerOptions([]);
      setShowCustomerList(false);
      setSearchingCustomers(false);
      return;
    }

    if (!q) {
      setCustomerOptions([]);
      setShowCustomerList(false);
      setSearchingCustomers(false);
      return;
    }

    const t = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const res = await api.get("/catalog/customers/search", { params: { q, limit: 8 } });
        if (!mounted.current) return;
        setCustomerOptions(res?.data?.data || []);
        setShowCustomerList(true);
      } catch (e) {
        console.warn("Customer search failed (non-blocking)", e);
        setCustomerOptions([]);
        setShowCustomerList(false);
      } finally {
        if (mounted.current) setSearchingCustomers(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [customerQuery, open, customerId, buyer?.name]);

  function pickCustomer(c) {
    if (!c) return;
    const next = {
      name: c?.name || "",
      gstin: c?.gstin || "",
      pan: c?.pan || "",
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

  function setItem(idx, patch) {
    setItems((arr) => {
      const copy = [...arr];
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  }
  function addRow() {
    setItems((arr) => [...arr, { description: "", hsn: "", quantity: 1, unit: "pcs", rate: 0, discount: 0, gstRate: 0 }]);
  }
  function removeRow(i) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
    setProductSuggestions((s) => {
      const copy = { ...s };
      delete copy[i];
      return copy;
    });
  }

  async function doProductSearchForRow(idx, q) {
    if (productSearchTimers.current[idx]) clearTimeout(productSearchTimers.current[idx]);

    if (!q || q.trim().length < 1) {
      setProductSuggestions((s) => ({ ...s, [idx]: [] }));
      return;
    }

    productSearchTimers.current[idx] = setTimeout(async () => {
      try {
        const res = await api.get("/catalog/products/search", { params: { q: q.trim(), limit: 8 } });
        if (!mounted.current) return;
        setProductSuggestions((s) => ({ ...s, [idx]: res?.data?.data || [] }));
      } catch (err) {
        console.warn("Product search failed for row", idx, err);
        setProductSuggestions((s) => ({ ...s, [idx]: [] }));
      }
    }, 300);
  }

  function onDescriptionChange(idx, text) {
    setItem(idx, { description: text });
    doProductSearchForRow(idx, text);
  }

  function pickProductForRow(idx, p) {
    setItem(idx, {
      description: p?.name || "",
      hsn: p?.hsn || "",
      rate: toNum(p?.sellPrice ?? p?.sell_price ?? p?.price ?? 0),
      gstRate: toNum(p?.gstTax ?? 0),
    });
    setProductSuggestions((s) => ({ ...s, [idx]: [] }));
  }

  function validate() {
    const e = {};
    if (!buyer.name?.trim()) e.buyerName = "Buyer name is required";
    if (!String(buyer.stateCode || "").trim() && !String(shipTo?.stateCode || "").trim()) {
      e.buyerStateCode = "State code required (Buyer or Ship-To)";
    }
    if (!items.length) e.items = "Add at least one item";
    const badItemIndex = items.findIndex(
      (it) => toNum(it.quantity) <= 0 || toNum(it.rate) < 0 || !it.description?.trim()
    );
    if (badItemIndex >= 0) e.itemsRow = `Check item #${badItemIndex + 1}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildItemsForPayload() {
    return items.map((it) => ({
      description: it.description,
      hsn: it.hsn,
      quantity: toNum(it.quantity),
      unit: it.unit,
      rate: toNum(it.rate),
      discount: toNum(it.discount),
      gstRate: toNum(it.gstRate),
      name: it.description,
      purchasePrice: toNum(it.rate),
      sellPrice: toNum(it.rate),
      gstTax: toNum(it.gstRate),
    }));
  }

  async function submit(e, { approve } = { approve: false }) {
    e?.preventDefault?.();
    if (!validate()) { dialogRef.current?.focus?.(); return; }

    setSaving(true);
    try {
      const payload = {
        invoiceType: meta.invoiceType,
        invoiceDate: meta.invoiceDate,
        placeOfDelivery: meta.placeOfDelivery || undefined,
        notes: meta.notes,
        poNo: meta.poNo,
        buyer,
        shipTo,
        items: buildItemsForPayload(),
      };
      if (customerId) {
        payload.customer = customerId;
      } else if (!isEdit) {
        payload.customer = buyer;
      }

      let saved;
      if (isEdit) {
        const res = await api.patch(`/invoices/${invoiceId}`, payload);
        saved = res?.data?.data;
      } else {
        const res = await api.post("/invoices", payload);
        saved = res?.data?.data;
      }
      if (approve && (!isEdit || saved?.status === "draft")) {
        try {
          const res = await api.post(`/invoices/${saved._id}/approve`);
          saved = res?.data?.data || saved;
          saved.status = "approved";
        } catch (err) {
          console.warn("Approve failed:", err);
        }
      }

      onSaved?.(saved);
      onClose?.();
      if (!isEdit) {
        setBuyer({ name: "", stateCode: "" });
        setShipTo({});
        setItems(initialItems);
        setMeta((m) => ({ ...m, poNo: "", notes: "", placeOfDelivery: "" }));
        setErrors({});
        setCustomerId(null);
        setCustomerQuery("");
        setCustomerOptions([]);
        setProductSuggestions({});
        selectedCustomerIdRef.current = null;
      }
    } catch (err) {
      console.error("Save invoice failed:", err);
      setErrors((ex) => ({ ...ex, submit: err?.response?.data?.message || err.message }));
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-6xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] focus:outline-none"
        tabIndex={-1}
      >
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{isEdit ? "Edit Invoice" : "Create Invoice"}</h2>
              <p className="text-sm opacity-90 mt-1">Seller State Code: <span className="font-medium">{seller?.stateCode || "—"}</span></p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                    {errors.buyerName && <li>{errors.buyerName}</li>}
                    {errors.buyerStateCode && <li>{errors.buyerStateCode}</li>}
                    {errors.items && <li>{errors.items}</li>}
                    {errors.itemsRow && <li>{errors.itemsRow}</li>}
                    {errors.submit && <li>{errors.submit}</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Invoice Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label>Invoice Type</Label>
                  <Select
                    value={meta.invoiceType}
                    onChange={(v) => setMeta((m) => ({ ...m, invoiceType: v }))}
                    options={["Proforma Invoice", "Delivery Challan", "Original for Buyer", "Duplicate for Transporter"]}
                  />
                </div>
                <div>
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    value={meta.invoiceDate || ""}
                    onChange={(v) => setMeta((m) => ({ ...m, invoiceDate: v }))}
                  />
                </div>
                <div>
                  <Label>PO Number</Label>
                  <Input
                    value={meta.poNo || ""}
                    onChange={(v) => setMeta((m) => ({ ...m, poNo: v }))}
                    placeholder="PO-123"
                  />
                </div>
                <div>
                  <Label>Place of Delivery</Label>
                  <StateSelect
                    state={meta.placeOfDelivery || ""}
                    onStateChange={(st) => setMeta((m) => ({ ...m, placeOfDelivery: st?.name || "" }))}
                    compact
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <Label>Notes</Label>
                  <Textarea
                    rows={2}
                    value={meta.notes || ""}
                    onChange={(v) => setMeta((m) => ({ ...m, notes: v }))}
                    placeholder="Thanks for your business."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">Buyer Information</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Required</span>
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
                          <button
                            key={c._id}
                            type="button"
                            className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                            onClick={() => pickCustomer(c)}
                          >
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
                      <Input
                        value={buyer.name || ""}
                        onChange={(v) => setBuyer((b) => ({ ...b, name: v }))}
                        placeholder="Customer name"
                      />
                    </div>

                    <div>
                      <Label>GSTIN</Label>
                      <Input
                        value={buyer.gstin || ""}
                        onChange={(v) => setBuyer((b) => ({ ...b, gstin: v.toUpperCase() }))}
                        placeholder="GSTIN number"
                      />
                    </div>

                    <div>
                      <Label>PAN</Label>
                      <Input
                        value={buyer.pan || ""}
                        onChange={(v) => setBuyer((b) => ({ ...b, pan: v.toUpperCase() }))}
                        placeholder="PAN number"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Textarea
                        rows={2}
                        value={buyer.address || ""}
                        onChange={(v) => setBuyer((b) => ({ ...b, address: v }))}
                        placeholder="Full address"
                      />
                    </div>

                    <div>
                      <Label>State</Label>
                      <StateSelect
                        state={buyer.state || ""}
                        onStateChange={(st) => setBuyer((b) => ({ ...b, state: st?.name || "", stateCode: st?.code ? String(st.code) : "" }))}
                      />
                    </div>

                    <div>
                      <Label>State Code</Label>
                      <Input
                        value={buyer.stateCode || ""}
                        readOnly
                        placeholder="Auto-filled"
                        className="bg-gray-50"
                      />
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={buyer.phone || ""}
                        onChange={(v) => setBuyer((b) => ({ ...b, phone: v }))}
                        placeholder="Phone number"
                      />
                    </div>

                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={buyer.email || ""}
                        onChange={(v) => setBuyer((b) => ({ ...b, email: v.toLowerCase() }))}
                        placeholder="Email address"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center justify-between mb-4 pb-2 border-b">
                  <h3 className="text-lg font-semibold text-gray-800">Ship To Information</h3>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    onClick={() => {
                      setShipTo({
                        name: buyer.name || "",
                        address: buyer.address || "",
                        state: buyer.state || "",
                        stateCode: buyer.stateCode || "",
                        phone: buyer.phone || "",
                        gstin: buyer.gstin || ""
                      });
                    }}
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Copy from Buyer
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label>Name</Label>
                      <Input
                        value={shipTo.name || ""}
                        onChange={(v) => setShipTo((s) => ({ ...s, name: v }))}
                        placeholder="Shipping name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <Textarea
                        rows={2}
                        value={shipTo.address || ""}
                        onChange={(v) => setShipTo((s) => ({ ...s, address: v }))}
                        placeholder="Shipping address"
                      />
                    </div>

                    <div>
                      <Label>GSTIN</Label>
                      <Input
                        value={shipTo.gstin || ""}
                        onChange={(v) => setShipTo((s) => ({ ...s, gstin: v.toUpperCase() }))}
                        placeholder="GSTIN number"
                      />
                    </div>

                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={shipTo.phone || ""}
                        onChange={(v) => setShipTo((s) => ({ ...s, phone: v }))}
                        placeholder="Phone number"
                      />
                    </div>

                    <div>
                      <Label>State</Label>
                      <StateSelect
                        state={shipTo.state || ""}
                        onStateChange={(st) => setShipTo((s) => ({ ...s, state: st?.name || "", stateCode: st?.code ? String(st.code) : "" }))}
                      />
                    </div>

                    <div>
                      <Label>State Code</Label>
                      <Input
                        value={shipTo.stateCode || ""}
                        readOnly
                        placeholder="Auto-filled"
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Items & Services</h3>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
                  onClick={addRow}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </button>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium">HSN</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                      <th className="px-4 py-3 font-medium">Rate</th>
                      <th className="px-4 py-3 font-medium">Discount</th>
                      <th className="px-4 py-3 font-medium">GST %</th>
                      <th className="px-4 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 relative">
                          <Input
                            value={it.description}
                            onChange={(v) => onDescriptionChange(idx, v)}
                            placeholder="Item name / description"
                            className="w-full"
                          />
                          {productSuggestions[idx] && productSuggestions[idx].length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 z-50 bg-white border-2 border-blue-200 rounded-lg shadow-xl">
                              <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                                <div className="text-xs font-medium text-blue-800 flex items-center">
                                  <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                  </svg>
                                  Product Suggestions
                                </div>
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                {productSuggestions[idx] && productSuggestions[idx].length > 0 && (
                                  <div className="absolute left-0 right-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                                    <div className="max-h-60 overflow-y-auto">
                                      {productSuggestions[idx].map((p) => (
                                        <button
                                          key={p._id}
                                          type="button"
                                          className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-start"
                                          onClick={() => pickProductForRow(idx, p)}
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">{p.name}</div>
                                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                                              {p.hsn && (
                                                <span className="bg-gray-100 px-2 py-0.5 rounded">HSN: {p.hsn}</span>
                                              )}
                                              {p.sellPrice && (
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                  Price: {formatCurrency(p.sellPrice)}
                                                </span>
                                              )}
                                              {p.gstTax && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                                  GST: {p.gstTax}%
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <svg
                                            className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0 mt-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                          </svg>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            className="w-20"
                            value={it.hsn || ""}
                            onChange={(v) => setItem(idx, { hsn: v })}
                            placeholder="HSN"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-16"
                            value={it.quantity}
                            onChange={(v) => setItem(idx, { quantity: toNum(v) })}
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            className="w-16"
                            value={it.unit}
                            onChange={(v) => setItem(idx, { unit: v })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20"
                            value={it.rate}
                            onChange={(v) => setItem(idx, { rate: toNum(v) })}
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            className="w-20"
                            value={it.discount}
                            onChange={(v) => setItem(idx, { discount: toNum(v) })}
                            min="0"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Select
                            className="w-20"
                            value={String(it.gstRate ?? 0)}
                            onChange={(v) => setItem(idx, { gstRate: toNum(v) })}
                            options={GST_OPTIONS}
                            renderOption={(o) => `${o}%`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                            onClick={() => removeRow(idx)}
                            aria-label="Remove item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-4 md:hidden">
                {items.map((it, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-gray-700">Item #{idx + 1}</div>
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-800"
                        onClick={() => removeRow(idx)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={it.description}
                          onChange={(v) => onDescriptionChange(idx, v)}
                          placeholder="Item name / description"
                        />
                        {productSuggestions[idx] && productSuggestions[idx].length > 0 && (
                          <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-40 overflow-y-auto">
                            {productSuggestions[idx].map((p) => (
                              <button
                                key={p._id}
                                type="button"
                                className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                onClick={() => pickProductForRow(idx, p)}
                              >
                                <div className="font-medium text-gray-900">{p.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {p.hsn && <span>HSN: {p.hsn}</span>}
                                  {p.sellPrice && <span className="ml-2">• Price: {formatCurrency(p.sellPrice)}</span>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>HSN</Label>
                          <Input
                            value={it.hsn || ""}
                            onChange={(v) => setItem(idx, { hsn: v })}
                            placeholder="HSN"
                          />
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <Input
                            value={it.unit}
                            onChange={(v) => setItem(idx, { unit: v })}
                          />
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            value={it.quantity}
                            onChange={(v) => setItem(idx, { quantity: toNum(v) })}
                          />
                        </div>
                        <div>
                          <Label>Rate</Label>
                          <Input
                            type="number"
                            value={it.rate}
                            onChange={(v) => setItem(idx, { rate: toNum(v) })}
                          />
                        </div>
                        <div>
                          <Label>Discount</Label>
                          <Input
                            type="number"
                            value={it.discount}
                            onChange={(v) => setItem(idx, { discount: toNum(v) })}
                          />
                        </div>
                        <div>
                          <Label>GST %</Label>
                          <Select
                            value={String(it.gstRate ?? 0)}
                            onChange={(v) => setItem(idx, { gstRate: toNum(v) })}
                            options={GST_OPTIONS}
                            renderOption={(o) => `${o}%`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <div className="text-sm text-blue-700 font-medium mb-1">Taxable Amount</div>
                  <div className="text-xl font-bold text-blue-900">{formatCurrency(totals.subtotal)}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                  <div className="text-sm text-green-700 font-medium mb-1">CGST</div>
                  <div className="text-xl font-bold text-green-900">{formatCurrency(totals.totalCgst)}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <div className="text-sm text-purple-700 font-medium mb-1">SGST</div>
                  <div className="text-xl font-bold text-purple-900">{formatCurrency(totals.totalSgst)}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                  <div className="text-sm text-orange-700 font-medium mb-1">IGST</div>
                  <div className="text-xl font-bold text-orange-900">{formatCurrency(totals.totalIgst)}</div>
                </div>
                <div className="md:col-span-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold text-gray-800">Grand Total</div>
                    <div className="text-2xl font-bold text-blue-700">{formatCurrency(grandTotal)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">
            {isEdit ? "Editing existing invoice" : "Creating new invoice"}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => submit(e, { approve: false })}
              className="px-5 py-2.5 border border-blue-600 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Save as Draft"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => submit(e, { approve: true })}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save & Approve
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}