// src/components/Quotations/CustomColumnsModal.jsx
import React, { useEffect, useState } from "react";
import { generateDefaultColumns } from "../../utils/quotationUtils.jsx";

function makeId() {
  return `c_${Math.random().toString(36).slice(2, 9)}`;
}

export default function CustomColumnsModal({ open, onClose, columns = [], onSave }) {
  const [local, setLocal] = useState([]);

  useEffect(() => {
    setLocal(
      (columns || []).map((c) => ({
        id: c.id || makeId(),
        key: c.key || "",
        label: c.label || "",
        type: c.type || "string",
      }))
    );
  }, [columns]);

  if (!open) return null;

  function add() {
    setLocal((prev) => [...prev, { id: makeId(), key: `col_${prev.length + 1}`, label: "New column", type: "string" }]);
  }

  function remove(i) {
    setLocal((prev) => prev.filter((_, idx) => idx !== i));
  }

  function update(i, field, value) {
    setLocal((prev) => {
      const cp = [...prev];
      cp[i] = { ...cp[i], [field]: value };
      return cp;
    });
  }

  function handleReset() {
    const defs = generateDefaultColumns();
    setLocal(defs.map((c) => ({ id: makeId(), ...c })));
  }

  function handleSave() {
    // strip internal id before returning
    const out = local.map(({ id, ...rest }) => ({ ...rest }));
    onSave?.(out);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-lg p-4 shadow-lg max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-semibold mb-3">Custom Columns</h3>

        <div className="space-y-2">
          {local.map((c, idx) => (
            <div key={c.id} className="flex gap-2 items-center">
              <input
                value={c.key}
                onChange={(e) => update(idx, "key", e.target.value)}
                className="px-2 py-1 border rounded w-28"
              />
              <input
                value={c.label}
                onChange={(e) => update(idx, "label", e.target.value)}
                className="px-2 py-1 border rounded flex-1"
              />
              <select
                value={c.type}
                onChange={(e) => update(idx, "type", e.target.value)}
                className="px-2 py-1 border rounded"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="date">date</option>
              </select>
              <button className="px-2 py-1 border rounded text-red-600" onClick={() => remove(idx)}>
                Delete
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-between items-center">
          <div>
            <button className="px-3 py-1 border rounded mr-2" onClick={handleReset}>
              Reset
            </button>
            <button className="px-3 py-1 border rounded" onClick={add}>
              Add column
            </button>
          </div>
          <div className="space-x-2">
            <button className="px-3 py-1 border rounded" onClick={onClose}>
              Cancel
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
