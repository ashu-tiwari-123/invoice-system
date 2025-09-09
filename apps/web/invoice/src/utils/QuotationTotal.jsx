// src/utils/quotationTotals.js
export function adjustColumnsForTotals(customColumns = [], totalsMode = "perRow") {
  const hasTotalCol = customColumns.some((c) => c.key === "total");
  if ((totalsMode === "perRow" || totalsMode === "both") && !hasTotalCol) {
    return [...customColumns, { key: "total", label: "Total", type: "number" }];
  } else if ((totalsMode === "grand" || totalsMode === "none") && hasTotalCol) {
    return customColumns.filter((c) => c.key !== "total");
  }
  return [...customColumns];
}

export function prepareItemsForMode(items = [], totalsMode = "perRow") {
  return (items || []).map((it) => {
    const columns = { ...(it.columns || {}) };
    if (totalsMode === "perRow" || totalsMode === "both") {
      columns.total = Number(columns.total || 0);
    } else {
      if (columns.hasOwnProperty("total")) delete columns.total;
    }
    return { ...it, columns };
  });
}

export function preparePayloadWithTotals({
  basePayload = {},
  items = [],
  customColumns = [],
  totals = { grandTotal: 0 },
  totalsMode = "perRow",
  termsLines = [],
}) {
  const colsToSend = adjustColumnsForTotals(customColumns, totalsMode);
  const itemsToSend = prepareItemsForMode(items, totalsMode);

  const payload = {
    ...basePayload,
    customColumns: colsToSend,
    items: itemsToSend,
    totalsMode,
  };

  if (Array.isArray(termsLines)) payload.termsAndConditions = termsLines;
  else payload.termsAndConditions = [];

  if (totalsMode === "grand" || totalsMode === "both") {
    payload.total = Number(totals.grandTotal || 0);
  } else {
    if (payload.hasOwnProperty("total")) delete payload.total;
  }

  return payload;
}
