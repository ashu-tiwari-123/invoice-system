import { useState, useEffect } from "react";
import api from "../../api/axios";

function InvoiceForm({ invoice, onSuccess }) {
  const [form, setForm] = useState({
    invoiceNo: "",
    date: new Date().toISOString().slice(0, 10),
    poNumber: "",
    placeOfDelivery: "",
    declaration:
      "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.",
    notes: "",
  });

  const [seller, setSeller] = useState({
    logoUrl: "",
    name: "",
    address: "",
    gstin: "",
    pan: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    bankName: "",
    branchName: "",
    accountNo: "",
    ifscCode: "",
  });
  const [buyer, setBuyer] = useState({
    name: "",
    address: "",
    gstin: "",
    pan: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
  });
  const [consignee, setConsignee] = useState({
    name: "",
    address: "",
    gstin: "",
    pan: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
  });
  const [isConsigneeSameAsBuyer, setIsConsigneeSameAsBuyer] = useState(true);

  const [items, setItems] = useState([
    {
      description: "",
      hsn: "",
      qty: 1,
      unit: "pcs",
      rate: 0,
      discount: 0,
      tax: 18,
      amount: 0,
    },
  ]);

  // 🔹 Prefill if editing
  useEffect(() => {
    if (invoice) {
      setForm(invoice);
      setSeller(invoice.seller || {});
      setBuyer(invoice.buyer || {});
      setConsignee(invoice.consignee || {});
      setItems(invoice.items || []);
    } else {
      fetchInitialData();
    }
  }, [invoice]);

  const fetchInitialData = async () => {
    try {
      // get seller (company profile)
      const sellerRes = await api.get("/seller/current");
      if (sellerRes.data) setSeller(sellerRes.data);

      // get next invoice number
      const invRes = await api.get("/invoices?latest=true");
      if (invRes.data?.data?.latestInvoiceNo) {
        setForm((prev) => ({
          ...prev,
          invoiceNo: `INV-${new Date().getFullYear()}-${invRes.data.data.latestInvoiceNo + 1}`,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          invoiceNo: `INV-${new Date().getFullYear()}-1`,
        }));
      }
    } catch (err) {
      console.error("Init data error", err);
    }
  };

  // 🔹 Handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleSellerChange = (e) => {
    const { name, value } = e.target;
    setSeller((prev) => ({ ...prev, [name]: value }));
  };
  const handleBuyerChange = (e) => {
    const { name, value } = e.target;
    setBuyer((prev) => ({ ...prev, [name]: value }));
  };
  const handleConsigneeChange = (e) => {
    const { name, value } = e.target;
    setConsignee((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Items
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    const qty = parseFloat(updated[index].qty) || 0;
    const rate = parseFloat(updated[index].rate) || 0;
    const discount = parseFloat(updated[index].discount) || 0;
    const tax = parseFloat(updated[index].tax) || 0;

    let base = qty * rate;
    base = base - (base * discount) / 100;
    const gst = (base * tax) / 100;
    updated[index].amount = base + gst;

    setItems(updated);
  };
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        hsn: "",
        qty: 1,
        unit: "pcs",
        rate: 0,
        discount: 0,
        tax: 18,
        amount: 0,
      },
    ]);
  };
  const removeItem = (i) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  // 🔹 Copy Buyer → Consignee
  useEffect(() => {
    if (isConsigneeSameAsBuyer) setConsignee(buyer);
  }, [buyer, isConsigneeSameAsBuyer]);

  // 🔹 Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, seller, buyer, consignee, items };
    try {
      if (invoice) {
        await api.patch(`/invoices/${invoice._id}`, payload);
      } else {
        await api.post("/invoices", payload);
      }
      onSuccess && onSuccess();
    } catch (err) {
      console.error("Error saving invoice", err);
    }
  };

  // 🔹 Totals
  const subTotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const totalDiscount = items.reduce(
    (s, i) => s + (i.qty * i.rate * i.discount) / 100,
    0
  );
  const taxTotal = items.reduce(
    (s, i) =>
      s +
      ((i.qty * i.rate - (i.qty * i.rate * i.discount) / 100) * i.tax) / 100,
    0
  );
  const grandTotal = subTotal - totalDiscount + taxTotal;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-h-[90vh] overflow-y-auto"
    >
      {/* Invoice Details */}
      <fieldset className="rounded-lg border p-4 space-y-4">
        <legend className="px-2 font-medium text-gray-800 text-lg">
          Invoice Details
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Number
            </label>
            <input
              type="text"
              name="invoiceNo"
              value={form.invoiceNo}
              readOnly
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Date
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              P.O. Number
            </label>
            <input
              type="text"
              name="poNumber"
              value={form.poNumber}
              onChange={handleFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Place of Delivery
            </label>
            <input
              type="text"
              name="placeOfDelivery"
              value={form.placeOfDelivery}
              onChange={handleFormChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
            />
          </div>
        </div>
      </fieldset>

      {/* Seller */}
      <fieldset className="rounded-lg border p-4 space-y-4">
        <legend className="px-2 font-medium text-gray-800 text-lg">
          Bill From (Seller)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            placeholder="Name"
            name="name"
            value={seller.name}
            readOnly
            className="border p-2 rounded bg-gray-100"
          />
          <input
            placeholder="GSTIN"
            name="gstin"
            value={seller.gstin}
            readOnly
            className="border p-2 rounded bg-gray-100"
          />
          <textarea
            placeholder="Address"
            name="address"
            value={seller.address}
            readOnly
            className="col-span-2 border p-2 rounded bg-gray-100"
          />
        </div>
      </fieldset>

      {/* Buyer */}
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 font-medium text-gray-800 text-lg">
          Bill To (Buyer)
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            placeholder="Name"
            name="name"
            value={buyer.name}
            onChange={handleBuyerChange}
            className="border p-2 rounded"
          />
          <textarea
            placeholder="Address"
            name="address"
            value={buyer.address}
            onChange={handleBuyerChange}
            className="col-span-2 border p-2 rounded"
          />
        </div>
      </fieldset>

      {/* Consignee */}
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 font-medium text-gray-800 text-lg">
          Ship To (Consignee)
        </legend>
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isConsigneeSameAsBuyer}
            onChange={(e) => setIsConsigneeSameAsBuyer(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          <label className="ml-2 text-sm text-gray-900">
            Same as Bill To address
          </label>
        </div>
        {!isConsigneeSameAsBuyer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <input
              placeholder="Name"
              name="name"
              value={consignee.name}
              onChange={handleConsigneeChange}
              className="border p-2 rounded"
            />
            <textarea
              placeholder="Address"
              name="address"
              value={consignee.address}
              onChange={handleConsigneeChange}
              className="col-span-2 border p-2 rounded"
            />
          </div>
        )}
      </fieldset>

      {/* Items */}
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 font-medium text-gray-800 text-lg">
          Line Items
        </legend>
        <div className="grid grid-cols-7 gap-2 font-semibold mb-2">
          <div className="col-span-2">Description</div>
          <div>HSN</div>
          <div>Qty</div>
          <div>Rate</div>
          <div>Disc%</div>
          <div>Tax%</div>
          <div>Amount</div>
        </div>
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-7 gap-2 items-center mb-1">
            <input
              value={item.description}
              onChange={(e) =>
                handleItemChange(idx, "description", e.target.value)
              }
              className="col-span-2 border p-2 rounded"
            />
            <input
              value={item.hsn}
              onChange={(e) => handleItemChange(idx, "hsn", e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="number"
              value={item.qty}
              onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="number"
              value={item.rate}
              onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="number"
              value={item.discount}
              onChange={(e) =>
                handleItemChange(idx, "discount", e.target.value)
              }
              className="border p-2 rounded"
            />
            <input
              type="number"
              value={item.tax}
              onChange={(e) => handleItemChange(idx, "tax", e.target.value)}
              className="border p-2 rounded"
            />
            <div className="text-right font-medium">
              ₹{item.amount.toFixed(2)}
            </div>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-red-600 text-xs"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="text-blue-600 hover:underline mt-2"
        >
          + Add Line Item
        </button>
      </fieldset>

      {/* Bank */}
      <fieldset className="rounded-lg border p-4">
        <legend className="px-2 font-medium text-gray-800 text-lg">
          Bank Details
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
          <input
            placeholder="Bank Name"
            name="bankName"
            value={seller.bankName}
            onChange={handleSellerChange}
            className="border p-2 rounded"
          />
          <input
            placeholder="Branch"
            name="branchName"
            value={seller.branchName}
            onChange={handleSellerChange}
            className="border p-2 rounded"
          />
          <input
            placeholder="Account No."
            name="accountNo"
            value={seller.accountNo}
            onChange={handleSellerChange}
            className="border p-2 rounded"
          />
          <input
            placeholder="IFSC Code"
            name="ifscCode"
            value={seller.ifscCode}
            onChange={handleSellerChange}
            className="border p-2 rounded"
          />
        </div>
      </fieldset>

      {/* Declaration + Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <fieldset className="rounded-lg border p-4 h-full">
          <legend className="px-2 font-medium text-gray-800 text-lg">
            Declaration
          </legend>
          <textarea
            name="declaration"
            rows={3}
            value={form.declaration}
            onChange={handleFormChange}
            className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
          />
        </fieldset>
        <div className="bg-gray-100 p-4 rounded">
          <p>Subtotal: ₹{subTotal.toFixed(2)}</p>
          <p>Discount: ₹{totalDiscount.toFixed(2)}</p>
          <p>GST: ₹{taxTotal.toFixed(2)}</p>
          <p className="font-bold">Grand Total: ₹{grandTotal.toFixed(2)}</p>
        </div>
      </div>

      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {invoice ? "Update Invoice" : "Save Invoice"}
      </button>
    </form>
  );
}

export default InvoiceForm;
