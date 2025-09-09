import { useEffect, useMemo, useState } from "react";
import { cls } from "./FormUtils";

const IN_STATES = [
    { code: "01", name: "Jammu & Kashmir" },
    { code: "02", name: "Himachal Pradesh" },
    { code: "03", name: "Punjab" },
    { code: "04", name: "Chandigarh" },
    { code: "05", name: "Uttarakhand" },
    { code: "06", name: "Haryana" },
    { code: "07", name: "Delhi" },
    { code: "08", name: "Rajasthan" },
    { code: "09", name: "Uttar Pradesh" },
    { code: "10", name: "Bihar" },
    { code: "11", name: "Sikkim" },
    { code: "12", name: "Arunachal Pradesh" },
    { code: "13", name: "Nagaland" },
    { code: "14", name: "Manipur" },
    { code: "15", name: "Mizoram" },
    { code: "16", name: "Tripura" },
    { code: "17", name: "Meghalaya" },
    { code: "18", name: "Assam" },
    { code: "19", name: "West Bengal" },
    { code: "20", name: "Jharkhand" },
    { code: "21", name: "Odisha" },
    { code: "22", name: "Chhattisgarh" },
    { code: "23", name: "Madhya Pradesh" },
    { code: "24", name: "Gujarat" },
    { code: "25", name: "Daman & Diu" },
    { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
    { code: "27", name: "Maharashtra" },
    { code: "28", name: "Andhra Pradesh (Old)" },
    { code: "29", name: "Karnataka" },
    { code: "30", name: "Goa" },
    { code: "31", name: "Lakshadweep" },
    { code: "32", name: "Kerala" },
    { code: "33", name: "Tamil Nadu" },
    { code: "34", name: "Puducherry" },
    { code: "35", name: "Andaman & Nicobar Islands" },
    { code: "36", name: "Telangana" },
    { code: "37", name: "Andhra Pradesh" },
    { code: "38", name: "Ladakh" },
];

export const StateSelect = ({ state, onStateChange, compact = false }) => {
    const [query, setQuery] = useState(state || "");
    const [open, setOpen] = useState(false);

    useEffect(() => { setQuery(state || ""); }, [state]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return IN_STATES;
        return IN_STATES.filter((s) => s.name.toLowerCase().includes(q) || s.code.includes(q));
    }, [query]);

    function choose(s) {
        onStateChange?.(s || null);
        setQuery(s?.name || "");
        setOpen(false);
    }
    const getStateByName = (name) => {
        if (!name) return null;
        const n = String(name).trim().toLowerCase();
        return IN_STATES.find((s) => s.name.toLowerCase() === n) || null;
    };
    return (
        <div className="relative">
            <input
                className={cls("w-full border rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] border-[var(--color-border)]", compact && "text-sm")}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                    const st = getStateByName(e.target.value);
                    if (st) onStateChange?.(st);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Select state"
            />
            {open && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border bg-white shadow-md">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                    ) : (
                        filtered.map((s) => (
                            <button key={s.code} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm" onClick={() => choose(s)}>
                                <div className="font-medium">{s.name}</div>
                                <div className="text-xs text-gray-500">Code: {s.code}</div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
