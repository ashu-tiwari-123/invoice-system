import { useEffect, useRef, useState } from "react";
import api from "../axiosInstance";


export default function VendorSelect({ value, onChange, placeholder = "Vendor name..." }) {
  const [q, setQ] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapper = useRef();

  useEffect(() => {
    const onDoc = (e) => { if (!wrapper.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (!q || q.trim().length < 1) { setResults([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get("/catalog/customers/search", { params: { q: q.trim(), limit: 8 } });
        setResults(res?.data?.data || []);
        setOpen(true);
      } catch (err) {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const handlePick = (c) => {
    setQ(c.name || "");
    setOpen(false);
    setResults([]);
    onChange?.(c);
  };

  return (
    <div className="relative" ref={wrapper}>
      <input
        type="text"
        className="w-full px-2 py-1 border rounded text-sm"
        placeholder={placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); onChange?.(e.target.value); }}
        onFocus={() => { if (results.length) setOpen(true); }}
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 w-full bg-white border mt-1 rounded shadow max-h-48 overflow-y-auto">
          {results.map((c) => (
            <button key={c._id} type="button" onClick={() => handlePick(c)} className="w-full text-left px-3 py-2 hover:bg-blue-50">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.email || c.phone || c.gstin || ""}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
