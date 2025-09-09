// src/modules/quotations/QuotationPreview.jsx
import React, { useMemo } from "react";
import { formatCurrency, formatDate } from "../../utils/FormatUtilities";

const getStatusColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "accepted":
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "sent":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
};

const safeNum = (v) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const QuotationPreview = React.forwardRef(({ quotation }, ref) => {
  const q = quotation || {};

  // pick seller object if company was populated else fallback to seller key
  const seller = (q.companyId && q.companyId.seller) || q.seller || (q.company || q.companyId) || {};
  const customer = q.customer || {};

  // Compute derived values whenever the quotation object changes
  const {
    items,
    customCols,
    computedSubTotal,
    computedTaxTotal,
    computedGrandFromItems,
    displayGrandTotal,
  } = useMemo(() => {
    const itemsArr = Array.isArray(q.items) ? q.items : [];

    const cols =
      Array.isArray(q.customColumns) && q.customColumns.length
        ? q.customColumns
        : [{ key: "rate", label: "Rate", type: "number" }];

    // Helper to get numeric value for a row (priority: columns.total -> item.total -> amount -> compute qty*rate - discount)
    const getRowNumeric = (it) => {
      if (!it) return 0;
      const colsObj = it.columns || {};

      if (colsObj.total !== undefined && colsObj.total !== null && colsObj.total !== "") {
        return safeNum(colsObj.total);
      }
      if (it.total !== undefined && it.total !== null && it.total !== "") return safeNum(it.total);
      if (it.amount !== undefined && it.amount !== null && it.amount !== "") return safeNum(it.amount);

      // try reading first numeric custom column from columns
      for (const c of cols) {
        const v = colsObj[c.key];
        if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) {
          return safeNum(v);
        }
      }

      // fallback compute: qty * rate - discount
      const qty = safeNum(it.quantity ?? colsObj.qty ?? colsObj.quantity ?? 0);
      // determine rate: try first custom column key, then item.rate
      let rate = 0;
      if (cols.length && colsObj[cols[0].key] !== undefined && colsObj[cols[0].key] !== null && colsObj[cols[0].key] !== "") {
        rate = safeNum(colsObj[cols[0].key]);
      } else {
        rate = safeNum(it.rate ?? it.unitPrice ?? it.sellPrice ?? 0);
      }
      const disc = safeNum(it.discount ?? colsObj.discount ?? 0);
      return Math.max(0, qty * rate - disc);
    };

    // compute subtotals and taxes
    let sub = 0;
    let tax = 0;
    itemsArr.forEach((it) => {
      const rowVal = getRowNumeric(it);
      sub += rowVal;
      tax += safeNum(it.cgstAmount || 0) + safeNum(it.sgstAmount || 0) + safeNum(it.igstAmount || 0);
    });

    const grandFromItems = sub + tax;

    return {
      items: itemsArr,
      customCols: cols,
      computedSubTotal: sub,
      computedTaxTotal: tax,
      computedGrandFromItems: grandFromItems,
      // decide displayGrandTotal: prefer persisted q.total if valid number otherwise computed grand
      displayGrandTotal: (q.total !== undefined && q.total !== null && q.total !== "" && !Number.isNaN(Number(q.total)))
        ? Number(q.total)
        : grandFromItems,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]); // recompute whenever quotation object changes

  // Use the derived values above
  const listItems = items || [];
  const customColsList = customCols || [];

  // separate out computed totals used in UI
  const subTotal = Number((typeof computedSubTotal === "number" ? computedSubTotal : 0));
  const taxTotal = Number((typeof computedTaxTotal === "number" ? computedTaxTotal : 0));
  const grandTotal = Number((typeof displayGrandTotal === "number" ? displayGrandTotal : 0));

  return (
    <div ref={ref} className="w-full bg-white p-4 md:p-8 font-sans">
      {/* Header with logo and quotation info */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8 pb-6 border-b border-gray-100">
        <div className="mb-6 md:mb-0">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Quotation</h1>
              <p className="text-sm text-gray-500">#{q.quotationNo || `QUO-${q._id?.slice(-6) || ''}`}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(q?.status)}`}>
              {q?.status || "Draft"}
            </span>
            {q?.subject && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                {q.subject}
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500">Date Issued</p>
          <p className="text-lg font-semibold text-gray-900">{formatDate(q.date || q.createdAt)}</p>
          {q?.validTill && (
            <>
              <p className="text-sm text-gray-500 mt-2">Valid Until</p>
              <p className="text-md font-medium text-gray-900">{formatDate(q.validTill)}</p>
            </>
          )}
        </div>
      </div>

      {/* Company and Customer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-5 rounded-xl">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">From</h3>
          <div className="space-y-2">
            <p className="font-bold text-gray-900 text-lg">{seller?.name || "—"}</p>
            {seller?.address && <p className="text-sm text-gray-600">{seller.address}</p>}
            <div className="flex flex-col gap-1 mt-3">
              {seller?.gstin && <p className="text-xs text-gray-500"><span className="font-medium">GSTIN:</span> {seller.gstin}</p>}
              {seller?.phone && <p className="text-xs text-gray-500"><span className="font-medium">Phone:</span> {seller.phone}</p>}
              {seller?.email && <p className="text-xs text-gray-500"><span className="font-medium">Email:</span> {seller.email}</p>}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 p-5 rounded-xl">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bill To</h3>
          <div className="space-y-2">
            <p className="font-bold text-gray-900 text-lg">{customer?.name || "—"}</p>
            {customer?.address && <p className="text-sm text-gray-600">{customer.address}</p>}
            <div className="flex flex-col gap-1 mt-3">
              {customer?.gstin && <p className="text-xs text-gray-500"><span className="font-medium">GSTIN:</span> {customer.gstin}</p>}
              {customer?.phone && <p className="text-xs text-gray-500"><span className="font-medium">Phone:</span> {customer.phone}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Reference Information */}
      {q?.reference && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p className="text-sm text-gray-600"><span className="font-medium">Reference:</span> {q.reference}</p>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="mb-8 overflow-x-auto rounded-xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item & Description</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">HSN/SAC</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Rate</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Discount</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {listItems.length > 0 ? listItems.map((item, index) => {
              const desc = item.description || item.item || item.name || "—";
              const hsn = item.hsn || (item.columns && (item.columns.hsn || item.columns.HSN)) || "—";
              const qty = safeNum(item.quantity ?? (item.columns && (item.columns.qty ?? item.columns.quantity)) ?? 0);

              // rate: prefer first custom column from columns if numeric, else fallback item.rate
              let rateVal = 0;
              if (item.columns && customColsList.length) {
                const v = item.columns[customColsList[0].key];
                rateVal = (v !== undefined && v !== null && v !== "") ? safeNum(v) : safeNum(item.rate ?? 0);
              } else {
                rateVal = safeNum(item.rate ?? 0);
              }

              const discountVal = safeNum(item.discount ?? (item.columns && item.columns.discount) ?? 0);

              // amount: use explicit columns.total if present, otherwise compute
              const amountVal = (item.columns && item.columns.total !== undefined && item.columns.total !== null && item.columns.total !== "")
                ? safeNum(item.columns.total)
                : Math.max(0, qty * rateVal - discountVal);

              return (
                <tr key={item._id ?? index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-normal">
                    <div className="text-sm font-medium text-gray-900">{desc}</div>
                    <div className="text-xs text-gray-500 sm:hidden mt-1">{hsn}</div>
                    <div className="text-xs text-gray-500 md:hidden mt-1">
                      {discountVal ? `Discount: ${formatCurrency(discountVal)}` : ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{hsn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{qty || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(rateVal)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right hidden md:table-cell">{discountVal ? formatCurrency(discountVal) : "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(amountVal)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p>No items added to this quotation</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Notes and Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {q?.notes && (
          <div className="p-5 bg-gray-50 rounded-xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path>
              </svg>
              Notes
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{q.notes}</p>
          </div>
        )}
        
        <div className="bg-gray-50 p-5 rounded-xl">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>

            {taxTotal > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{formatCurrency(taxTotal)}</span>
                </div>
                <div className="pl-4 text-xs text-gray-500 space-y-1">
                  {listItems.some(item => safeNum(item.cgstAmount) > 0) && (
                    <div className="flex justify-between"><span>CGST</span><span>{formatCurrency(listItems.reduce((s, it) => s + safeNum(it.cgstAmount), 0))}</span></div>
                  )}
                  {listItems.some(item => safeNum(item.sgstAmount) > 0) && (
                    <div className="flex justify-between"><span>SGST</span><span>{formatCurrency(listItems.reduce((s, it) => s + safeNum(it.sgstAmount), 0))}</span></div>
                  )}
                  {listItems.some(item => safeNum(item.igstAmount) > 0) && (
                    <div className="flex justify-between"><span>IGST</span><span>{formatCurrency(listItems.reduce((s, it) => s + safeNum(it.igstAmount), 0))}</span></div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-800 text-base">Total Amount</span>
                <span className="font-bold text-xl text-blue-600">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="text-right mt-1">
                <p className="text-xs text-gray-500">Tax included</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-xs text-gray-500">Thank you for your business</p>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
            {seller?.address || "—"}
          </div>
        </div>
      </div>
    </div>
  );
});

QuotationPreview.displayName = "QuotationPreview";

export default QuotationPreview;