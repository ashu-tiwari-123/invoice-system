import React, { useMemo } from "react";
import { formatCurrency, formatDate } from "../../utils/FormatUtilities";

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "overdue":
      return "bg-red-100 text-red-800";
    case "draft":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
};

const InvoicePreview = React.forwardRef(({ invoice }, ref) => {
  const seller = invoice?.seller || {};
  const buyer = invoice?.buyer || {};
  const items = Array.isArray(invoice?.items) ? invoice.items : [];
  
  const { subTotal, taxTotal, grandTotal } = useMemo(() => {
    const subTotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity || 0);
      const rate = Number(item.rate || 0);
      const discount = Number(item.discount || 0);
      return sum + (qty * rate - discount);
    }, 0);
    
    const taxTotal = items.reduce((sum, item) => {
      const cgst = Number(item.cgstAmount || 0);
      const sgst = Number(item.sgstAmount || 0);
      const igst = Number(item.igstAmount || 0);
      return sum + cgst + sgst + igst;
    }, 0);
    
    const grandTotal = subTotal + taxTotal;
    
    return { subTotal, taxTotal, grandTotal };
  }, [items]);

  return (
    <div ref={ref} className="w-full bg-white p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-gray-200">
        <div className="mb-4 md:mb-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            {invoice?.invoiceNo || `INV-${invoice?._id?.slice(-6) || ''}`}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(invoice?.invoiceDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice?.status)}`}>
            {invoice?.status || "Draft"}
          </span>
          {invoice?.invoiceType && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {invoice.invoiceType}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">From</h3>
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{seller.name || "—"}</p>
            {seller.address && (
              <p className="text-sm text-gray-600">{seller.address}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {seller.gstin && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">GSTIN:</span> {seller.gstin}
                </p>
              )}
              {seller.phone && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Phone:</span> {seller.phone}
                </p>
              )}
              {seller.email && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Email:</span> {seller.email}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Bill To</h3>
          <div className="space-y-1">
            <p className="font-medium text-gray-900">{buyer.name || "—"}</p>
            {buyer.address && (
              <p className="text-sm text-gray-600">{buyer.address}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {buyer.gstin && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">GSTIN:</span> {buyer.gstin}
                </p>
              )}
              {buyer.phone && (
                <p className="text-xs text-gray-500">
                  <span className="font-medium">Phone:</span> {buyer.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-3 bg-gray-50 rounded-md">
        <div>
          <p className="text-xs text-gray-500">Invoice Date</p>
          <p className="text-sm font-medium">{formatDate(invoice?.invoiceDate)}</p>
        </div>
        {invoice?.poNo && (
          <div>
            <p className="text-xs text-gray-500">PO Number</p>
            <p className="text-sm font-medium">{invoice.poNo}</p>
          </div>
        )}
        {invoice?.placeOfDelivery && (
          <div>
            <p className="text-xs text-gray-500">Place of Delivery</p>
            <p className="text-sm font-medium">{invoice.placeOfDelivery}</p>
          </div>
        )}
      </div>

      <div className="mb-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                HSN/SAC
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Qty
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rate
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Discount
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={index}>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{item.description || item.name || "—"}</div>
                  <div className="text-xs text-gray-500 sm:hidden">{item.hsn || "—"}</div>
                  <div className="text-xs text-gray-500 md:hidden">
                    {item.discount ? `Discount: ${formatCurrency(item.discount)}` : ""}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                  {item.hsn || "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                  {item.quantity || 0}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatCurrency(item.rate)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-right hidden md:table-cell">
                  {item.discount ? formatCurrency(item.discount) : "—"}
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                  {formatCurrency((item.quantity * item.rate) - (item.discount || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {invoice?.notes && (
          <div className="p-3 bg-gray-50 rounded-md">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600">{invoice.notes}</p>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subTotal)}</span>
          </div>

          {taxTotal > 0 && (
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium">{formatCurrency(taxTotal)}</span>
              </div>
              <div className="pl-4 mt-1 text-xs text-gray-500 space-y-1">
                {items.some(item => item.cgstAmount > 0) && (
                  <div className="flex justify-between">
                    <span>CGST</span>
                    <span>{formatCurrency(items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0))}</span>
                  </div>
                )}
                {items.some(item => item.sgstAmount > 0) && (
                  <div className="flex justify-between">
                    <span>SGST</span>
                    <span>{formatCurrency(items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0))}</span>
                  </div>
                )}
                {items.some(item => item.igstAmount > 0) && (
                  <div className="flex justify-between">
                    <span>IGST</span>
                    <span>{formatCurrency(items.reduce((sum, item) => sum + (item.igstAmount || 0), 0))}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="border-t border-gray-200 pt-2">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-800">Total</span>
              <span className="font-bold text-lg text-blue-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Thank you for your business
        </p>
      </div>
    </div>
  );
});

InvoicePreview.displayName = "InvoicePreview";

export default InvoicePreview;