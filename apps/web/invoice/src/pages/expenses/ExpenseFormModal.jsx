import { useEffect, useRef, useState } from "react";
import api from "../../axiosInstance";
import { Input, Label, Select, Textarea } from "../../utils/FormUtils";
import { toast } from "react-hot-toast";
import InvoiceSelect from "../../components/InvoiceSelect";

const TYPES = ["Delivery", "Commission", "Rent", "Salary", "Utilities", "Other"];

export default function ExpenseFormModal({ open, onClose, onSaved, expenseId }) {
  const isEdit = Boolean(expenseId);
  const mounted = useRef(false);
  const dialogRef = useRef(null);

  const [form, setForm] = useState({
    type: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    linkedInvoice: null, // will hold invoice object when selected
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (!isEdit) {
      setForm({ type: "", description: "", amount: "", date: new Date().toISOString().slice(0, 10), linkedInvoice: null });
      return;
    }

    (async () => {
      try {
        setLoading(true);
        // use catalog path used elsewhere
        const res = await api.get(`/expenses/${expenseId}`);
        const ex = res?.data?.data;
        if (!mounted.current) return;
        setForm({
          type: ex?.type || "",
          description: ex?.description || "",
          amount: ex?.amount ?? "",
          date: ex?.date ? new Date(ex.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          linkedInvoice: ex?.linkedInvoiceId ? (typeof ex.linkedInvoiceId === "object" ? ex.linkedInvoiceId : { _id: ex.linkedInvoiceId }) : null,
        });
      } catch (err) {
        console.error("Failed to load expense", err);
        toast.error("Failed to load expense");
      } finally { if (mounted.current) setLoading(false); }
    })();
  }, [open, expenseId, isEdit]);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function validate() {
    const e = {};
    if (!form.type) e.type = "Type is required";
    if (form.amount === "" || Number(form.amount) <= 0) e.amount = "Amount must be > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e?.preventDefault?.();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        description: form.description,
        amount: Number(form.amount),
        date: form.date ? new Date(form.date) : new Date(),
        // send ObjectId string when invoice selected, otherwise undefined
        linkedInvoiceId: form.linkedInvoice && form.linkedInvoice._id ? form.linkedInvoice._id : undefined,
      };
      let res;
      if (isEdit) res = await api.put(`/expenses/${expenseId}`, payload);
      else res = await api.post("/expenses", payload);
      onSaved?.(res?.data?.data);
      toast.success(isEdit ? "Expense updated" : "Expense created");
    } catch (err) {
      console.error("Save failed:", err);
      const message = err?.response?.data?.message || err.message || "Save failed";
      toast.error(message);
      setErrors(prev => ({ ...prev, submit: message }));
    } finally { if (mounted.current) setSaving(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={dialogRef} className="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 to-blue-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{isEdit ? "Edit Expense" : "New Expense"}</h2>
            <p className="text-sm opacity-90 mt-1">Record an expense and optionally link to an invoice</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-white/10" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6">
          {errors.submit && <div className="mb-4 text-sm text-red-600">{errors.submit}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type }  options={[ "", ...TYPES ]} onChange={(v) => setField("type", v)}>
                <option value="">Select type</option>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              {errors.type && <div className="text-xs text-red-600 mt-1">{errors.type}</div>}
            </div>

            <div>
              <Label>Amount</Label>
              <Input value={form.amount} onChange={(v) => setField("amount", v)} placeholder="0.00" />
              {errors.amount && <div className="text-xs text-red-600 mt-1">{errors.amount}</div>}
            </div>

            <div className="md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(v) => setField("description", v)} placeholder="Optional notes" />
            </div>

            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(v) => setField("date", v)} />
            </div>

            <div>
              <Label>Linked Invoice (optional)</Label>
              <InvoiceSelect
                value={form.linkedInvoice}
                onChange={(invObj) => setField("linkedInvoice", invObj || null)}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60">{saving ? "Saving..." : (isEdit ? "Save changes" : "Create")}</button>
        </div>
      </div>
    </div>
  );
}
