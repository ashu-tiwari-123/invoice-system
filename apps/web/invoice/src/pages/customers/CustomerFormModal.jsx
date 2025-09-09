import { useEffect, useRef, useState } from "react";
import api from "../../axiosInstance";
import { Input, Label, Textarea } from "../../utils/FormUtils";
import { StateSelect } from "../../utils/StateDropwdown";

const EMPTY = {
  name: "",
  address: "",
  gstin: "",
  pan: "",
  state: "",
  stateCode: "",
  pincode: "",
  phone: "",
  email: "",
};

export default function CustomerFormModal({ open, onClose, onSaved, customerId }) {
  const isEdit = Boolean(customerId);
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
    if (!isEdit) {
      setData(EMPTY);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/catalog/customers/${customerId}`);
        if (!mounted.current) return;
        const c = res?.data?.data || {};
        setData({
          name: c.name || "",
          address: c.address || "",
          gstin: c.gstin || "",
          pan: c.pan || "",
          state: c.state || "",
          stateCode: c.stateCode !== undefined && c.stateCode !== null ? String(c.stateCode) : "",
          pincode: c.pincode || "",
          phone: c.phone || "",
          email: c.email || "",
        });
      } catch (err) {
        console.error("Failed to load customer:", err);
        setErrors({ submit: err?.response?.data?.message || "Failed to load customer" });
      } finally {
        if (mounted.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customerId]);

  function setField(k, v) {
    setData((s) => ({ ...s, [k]: v }));
  }

  function validate() {
    const e = {};
    if (!data.name?.trim()) e.name = "Name is required";
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) e.email = "Invalid email";
    if (data.phone && !/^[0-9+\-\s]{6,20}$/.test(data.phone)) e.phone = "Invalid phone";
    if (data.gstin && data.gstin.trim().length !== 0 && data.gstin.trim().length !== 15) {
      e.gstin = "GSTIN should be 15 characters if provided";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save(e) {
    e?.preventDefault?.();
    if (!validate()) {
      dialogRef.current?.focus?.();
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...data,
        email: data.email ? data.email.toLowerCase() : undefined,
        gstin: data.gstin ? data.gstin.toUpperCase() : undefined,
        pan: data.pan ? data.pan.toUpperCase() : undefined,
        stateCode: data.stateCode ? String(data.stateCode) : undefined,
      };

      let res;
      if (isEdit) {
        res = await api.patch(`/catalog/customers/${customerId}`, payload);
      } else {
        res = await api.post(`/catalog/customers`, payload);
      }
      const saved = res?.data?.data || res?.data;
      onSaved?.(saved);
      onClose?.();
      // reset locally only on create
      if (!isEdit && mounted.current) setData(EMPTY);
    } catch (err) {
      console.error("Save customer failed:", err);
      // try to extract friendly backend messages
      const serverMsg = err?.response?.data?.message;
      const serverErrors = err?.response?.data?.errors; // if your backend returns field errors
      if (serverErrors && typeof serverErrors === "object") {
        setErrors((prev) => ({ ...prev, ...serverErrors }));
      } else if (serverMsg) {
        // common duplicate messages e.g. "Customer with this phone already exists in your company"
        setErrors((prev) => ({ ...prev, submit: serverMsg }));
      } else {
        setErrors((prev) => ({ ...prev, submit: err?.message || "Failed to save customer" }));
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} tabIndex={-1} className="relative z-10 w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] focus:outline-none">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">{isEdit ? "Edit Customer" : "New Customer"}</h2>
              <p className="text-sm opacity-90 mt-1">Add or update a customer (scoped to your company)</p>
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
                  <h3 className="text-sm font-medium text-red-800">Please fix the following:</h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                    {errors.name && <li>{errors.name}</li>}
                    {errors.email && <li>{errors.email}</li>}
                    {errors.phone && <li>{errors.phone}</li>}
                    {errors.gstin && <li>{errors.gstin}</li>}
                    {errors.submit && <li>{errors.submit}</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Name *</Label>
                <Input value={data.name} onChange={(v) => setField("name", v)} placeholder="Customer name" />
              </div>

              <div>
                <Label>Phone</Label>
                <Input value={data.phone} onChange={(v) => setField("phone", v)} placeholder="Phone number" />
              </div>

              <div>
                <Label>Email</Label>
                <Input value={data.email} onChange={(v) => setField("email", v)} placeholder="Email address" />
              </div>

              <div>
                <Label>GSTIN</Label>
                <Input value={data.gstin} onChange={(v) => setField("gstin", v.toUpperCase())} placeholder="GSTIN (15 chars)" />
              </div>

              <div>
                <Label>PAN</Label>
                <Input value={data.pan} onChange={(v) => setField("pan", v.toUpperCase())} placeholder="PAN" />
              </div>

              <div>
                <Label>State</Label>
                <StateSelect state={data.state || ""} onStateChange={(st) => setField("state", st?.name || "")} />
              </div>

              <div>
                <Label>State Code</Label>
                <Input value={data.stateCode || ""} onChange={(v) => setField("stateCode", v)} placeholder="State code" />
              </div>

              <div>
                <Label>Pincode</Label>
                <Input value={data.pincode} onChange={(v) => setField("pincode", v)} placeholder="Pincode" />
              </div>

              <div className="md:col-span-2">
                <Label>Address</Label>
                <Textarea rows={3} value={data.address} onChange={(v) => setField("address", v)} placeholder="Customer address" />
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-gray-500">{isEdit ? "Editing customer" : "Creating customer"}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
            <button type="button" disabled={saving} onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">
              {saving ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Create Customer")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
