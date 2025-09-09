import { useEffect, useRef, useState } from "react";
import api from "../../axiosInstance";
import { Input, Label, Textarea } from "../../utils/FormUtils";
import { toast } from "react-hot-toast";

const EMPTY = {
  name: "",
  hsn: "",
  purchasePrice: "",
  sellPrice: "",
  gstTax: "",
  isActive: true,
};

export default function ProductFormModal({ open, onClose, onSaved, productId }) {
  const isEdit = Boolean(productId);
  const mounted = useRef(false);
  const dialogRef = useRef(null);
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!isEdit) { setData(EMPTY); return; }

    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/catalog/products/${productId}`);
        if (!mounted.current) return;
        const p = res?.data?.data || {};
        setData({
          name: p.name || "",
          hsn: p.hsn || "",
          purchasePrice: p.purchasePrice ?? "",
          sellPrice: p.sellPrice ?? "",
          gstTax: p.gstTax ?? "",
          isActive: p.isActive !== false,
        });
      } catch (err) {
        console.error("Failed to load product:", err);
        setErrors({ submit: err?.response?.data?.message || "Failed to load product" });
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId]);

  function setField(k, v) { setData(s => ({ ...s, [k]: v })); }

  function validate() {
    const e = {};
    if (!data.name?.trim()) e.name = "Name is required";
    if (!data.sellPrice && data.sellPrice !== 0) e.sellPrice = "Sell price is required";
    if (data.sellPrice && isNaN(Number(data.sellPrice))) e.sellPrice = "Sell price must be numeric";
    if (data.purchasePrice && isNaN(Number(data.purchasePrice))) e.purchasePrice = "Purchase price must be numeric";
    if (data.gstTax !== "" && (isNaN(Number(data.gstTax)) || Number(data.gstTax) < 0 || Number(data.gstTax) > 100)) e.gstTax = "GST must be 0-100";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(e) {
    e?.preventDefault?.();
    if (!validate()) { dialogRef.current?.focus?.(); return; }
    setSaving(true); setErrors({});
    try {
      const payload = {
        name: data.name,
        hsn: data.hsn || undefined,
        purchasePrice: data.purchasePrice !== "" ? Number(data.purchasePrice) : undefined,
        sellPrice: data.sellPrice !== "" ? Number(data.sellPrice) : undefined,
        gstTax: data.gstTax !== "" ? Number(data.gstTax) : undefined,
        isActive: data.isActive !== false,
      };

      let res;
      if (isEdit) res = await api.patch(`/catalog/products/${productId}`, payload);
      else res = await api.post("/catalog/products", payload);

      const saved = res?.data?.data || res?.data;
      onSaved?.(saved);
      onClose?.();
      if (!isEdit && mounted.current) setData(EMPTY);
    } catch (err) {
      console.error("Save product failed:", err);
      const serverMsg = err?.response?.data?.message;
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") setErrors(prev => ({ ...prev, ...serverErrors }));
      else if (serverMsg) setErrors(prev => ({ ...prev, submit: serverMsg }));
      else setErrors(prev => ({ ...prev, submit: err?.message || "Failed to save product" }));
      toast.error(errors.submit || serverMsg || "Failed to save product");
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} tabIndex={-1} className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] focus:outline-none">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{isEdit ? "Edit Product" : "New Product"}</h2>
              <p className="text-sm opacity-90 mt-1">Add or update product details</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {errors.submit ? <div>{errors.submit}</div> : (
                  <ul className="list-disc list-inside space-y-1">
                    {errors.name && <li>{errors.name}</li>}
                    {errors.sellPrice && <li>{errors.sellPrice}</li>}
                    {errors.purchasePrice && <li>{errors.purchasePrice}</li>}
                    {errors.gstTax && <li>{errors.gstTax}</li>}
                  </ul>
                )}
              </div>
            </div>
          )}

          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Name *</Label>
                <Input value={data.name} onChange={(v) => setField("name", v)} placeholder="Product name" />
              </div>

              <div>
                <Label>HSN</Label>
                <Input value={data.hsn} onChange={(v) => setField("hsn", v)} placeholder="HSN code" />
              </div>

              <div>
                <Label>GST (%)</Label>
                <Input value={data.gstTax} onChange={(v) => setField("gstTax", v)} placeholder="GST percent (e.g. 18)" />
              </div>

              <div>
                <Label>Sell Price *</Label>
                <Input value={data.sellPrice} onChange={(v) => setField("sellPrice", v)} placeholder="Selling price" />
              </div>

              <div>
                <Label>Purchase Price</Label>
                <Input value={data.purchasePrice} onChange={(v) => setField("purchasePrice", v)} placeholder="Purchase price (optional)" />
              </div>

              <div>
                <Label>Active</Label>
                <div className="mt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={data.isActive !== false} onChange={(e) => setField("isActive", e.target.checked)} />
                    <span>Product is active</span>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">{isEdit ? "Editing product" : "Creating product"}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="button" disabled={saving} onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">
              {saving ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Product")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
