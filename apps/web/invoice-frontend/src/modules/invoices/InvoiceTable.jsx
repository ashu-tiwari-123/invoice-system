import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function InvoiceTable({ invoices, onEdit, onDelete, onRefresh }) {
  const navigate = useNavigate();

  // Action handlers
  const handleApprove = async (id) => {
    try {
      await api.post(`/invoices/${id}/approve`);
      onRefresh();
    } catch (err) {
      console.error("Approve error", err);
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.post(`/invoices/${id}/mark-paid`);
      onRefresh();
    } catch (err) {
      console.error("Mark paid error", err);
    }
  };

  const handleVoid = async (id) => {
    try {
      await api.post(`/invoices/${id}/void`);
      onRefresh();
    } catch (err) {
      console.error("Void error", err);
    }
  };

  const handlePdf = async (id) => {
    try {
      const res = await api.post(
        `/invoices/${id}/generate-pdf`,
        {},
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("PDF error", err);
    }
  };

  return (
    <table className="w-full border text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-2 border">Invoice No</th>
          <th className="p-2 border">Customer</th>
          <th className="p-2 border">Date</th>
          <th className="p-2 border">Total</th>
          <th className="p-2 border">Status</th>
          <th className="p-2 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv) => (
          <tr key={inv._id} className="hover:bg-gray-50">
            <td className="p-2 border">{inv.invoiceNo}</td>
            <td className="p-2 border">{inv.buyer?.name}</td>
            <td className="p-2 border">
              {new Date(inv.date).toLocaleDateString()}
            </td>
            <td className="p-2 border">₹{inv.grandTotal?.toFixed(2)}</td>
            <td className="p-2 border">{inv.status}</td>
            <td className="p-2 border space-x-2">
              <button
                onClick={() => navigate(`/invoices/${inv._id}/preview`)}
                className="text-blue-600 hover:underline"
              >
                Preview
              </button>
              <button
                onClick={() => onEdit(inv)}
                className="text-green-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(inv._id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
              <button
                onClick={() => handleApprove(inv._id)}
                className="text-indigo-600 hover:underline"
              >
                Approve
              </button>
              <button
                onClick={() => handleMarkPaid(inv._id)}
                className="text-teal-600 hover:underline"
              >
                Mark Paid
              </button>
              <button
                onClick={() => handleVoid(inv._id)}
                className="text-orange-600 hover:underline"
              >
                Void
              </button>
              <button
                onClick={() => handlePdf(inv._id)}
                className="text-purple-600 hover:underline"
              >
                PDF
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default InvoiceTable;
