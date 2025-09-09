export function toNum(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function generateDefaultColumns() {
  return [
    { key: "qty", label: "Qty", type: "number" },
    { key: "unitPrice", label: "Unit Price", type: "number" },
  ];
}

export function computeTotals(items = []) {
  const subtotal = items.reduce((s, r) => s + toNum(r.columns?.total), 0);
  const grandTotal = subtotal;
  return { subtotal, grandTotal };
}

export function buildQuotationPayload({ meta = {}, customerId, buyer, customColumns = [], items = [], totals = {} }) {
  const payload = {
    date: meta.date,
    subject: meta.subject,
    notes: meta.notes,
    customColumns: customColumns.map(c => ({ key: c.key, label: c.label, type: c.type })),
    items: items.map(it => ({
      sno: it.sno,
      item: it.item,
      columns: it.columns || {}
    })),
    total: totals.grandTotal ?? totals.subtotal ?? 0,
  };

  if (customerId) payload.customer = customerId;
  else payload.customer = buyer;

  return payload;
}
