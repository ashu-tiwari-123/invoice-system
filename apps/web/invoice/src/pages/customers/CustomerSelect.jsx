import { useState, useEffect, useRef } from "react";
import api from "../../axiosInstance";

export default function CustomerSelect({ value, onChange, placeholder = "Select customer...", limit = 10 }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    if (!q) { setResults([]); return; }
    const t = setTimeout(() => search(q), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const search = async (qstr) => {
    try {
      setLoading(true);
      const res = await api.get("/customers/search", { params: { q: qstr, limit } });
      setResults(res?.data?.data || []);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (c) => {
    onChange?.(c);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border rounded text-sm"
        />
        {value && (
          <button type="button" onClick={() => { setQ(""); onChange?.(null); }} className="text-xs text-gray-500">Clear</button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 w-full bg-white border mt-1 rounded shadow max-h-60 overflow-auto">
          {loading ? <div className="p-2 text-xs text-gray-500">Loading...</div> :
            results.length === 0 ? <div className="p-2 text-xs text-gray-500">No results</div> :
              results.map((c) => (
                <div key={c._id} onClick={() => handleSelect(c)} className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.phone || c.email || c.gstin}</div>
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}
