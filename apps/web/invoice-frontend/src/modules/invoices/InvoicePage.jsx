import { useState, useEffect } from "react";
import InvoiceTable from "./InvoiceTable";
import InvoiceForm from "./InvoiceForm";
import api from "../../api/axios";

function InvoicePage() {
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);

  // Fetch invoices
  const fetchInvoices = async () => {
    try {
      const res = await api.get("/invoices");
      setInvoices(res.data.data.invoices || []);
    } catch (err) {
      console.error("Error fetching invoices", err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary">Invoices</h2>
        <button
          onClick={() => {
            setEditingInvoice(null);
            setShowForm(true);
          }}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Create Invoice
        </button>
      </div>

      {/* Invoice Table */}
      <InvoiceTable
        invoices={invoices}
        onEdit={(inv) => {
          setEditingInvoice(inv);
          setShowForm(true);
        }}
        onDelete={async (id) => {
          try {
            await api.delete(`/invoices/${id}`);
            fetchInvoices();
          } catch (err) {
            console.error("Error deleting invoice", err);
          }
        }}
        onRefresh={fetchInvoices}
      />

      {/* Modal: Invoice Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-[700px] max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
              onClick={() => setShowForm(false)}
            >
              ✕
            </button>
            <InvoiceForm
              invoice={editingInvoice}
              onSuccess={() => {
                fetchInvoices();
                setShowForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoicePage;
