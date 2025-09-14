import { useEffect, useRef, useState } from "react";
import api from "../axiosInstance";

/**
 * InvoiceSelect
 * Props:
 *  - value: either invoice id string or invoice object (/_id or { _id, invoiceNo, customer })
 *  - onChange: receives selected invoice object OR null
 *  - placeholder: optional
 */
export default function InvoiceSelect({ value, onChange, placeholder = "Search invoice by number..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // when `value` is an object, reflect its invoiceNo in the input
    if (value && typeof value === "object") {
      setQuery(value.invoiceNo || value._id || "");
    } else if (value && typeof value === "string") {
      // if it's an id only, option: leave input empty or keep id
      setQuery("");
    } else {
      setQuery("");
    }
  }, [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    const q = (query || "").trim();
    if (!q) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        // adjust endpoint if your invoices search endpoint differs
        const res = await api.get("/invoices", { params: { q, limit: 8 } });
        // backend may return { data: { invoices, meta } } or list directly
        const payload = res?.data?.data;
        const list = Array.isArray(payload) ? payload : (payload?.invoices ?? payload ?? []);
        setResults(list);
        setOpen(true);
      } catch (err) {
        console.warn("Invoice search failed", err);
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  const pick = (inv) => {
    setQuery(inv.invoiceNo || inv._id);
    setOpen(false);
    setResults([]);
    onChange?.(inv);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        className="w-full px-2 py-1 border rounded text-sm"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          // if user types freely, clear selected value
          if (typeof value === "object") onChange?.(null);
        }}
        onFocus={() => { if (results.length) setOpen(true); }}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 w-full bg-white border mt-1 rounded shadow max-h-56 overflow-y-auto">
          {results.map((inv) => (
            <button
              key={inv._id || inv.invoiceNo}
              type="button"
              onClick={() => pick(inv)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50"
            >
              <div className="font-medium">{inv.invoiceNo || inv._id}</div>
              <div className="text-xs text-gray-500">{inv.customer?.name || inv.customerName || ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
