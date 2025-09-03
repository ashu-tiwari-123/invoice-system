import html2pdf from "html2pdf.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import api from "../../api/axios";

function InvoicePreview({ invoice }) {
  const storage = getStorage();

  const generatePdf = async () => {
    const element = document.getElementById("invoice-preview");

    // Generate PDF blob
    const pdfBlob = await html2pdf().from(element).outputPdf("blob");

    // Upload to Firebase Storage
    const storageRef = ref(storage, `invoices/${invoice.invoiceNo}.pdf`);
    await uploadBytes(storageRef, pdfBlob);

    const pdfUrl = await getDownloadURL(storageRef);

    // Save snapshot in backend
    await api.post(`/invoices/${invoice._id}/generate-pdf`, { pdfUrl });

    alert("PDF generated and uploaded!");
  };

  return (
    <div>
      <div
        id="invoice-preview"
        className="bg-white p-6 border shadow rounded w-[800px] mx-auto"
      >
        <h1 className="text-2xl font-bold text-primary mb-4">
          Invoice #{invoice.invoiceNo}
        </h1>
        <p>Customer: {invoice.customer?.name}</p>
        <p>Total: ₹{invoice.grandTotal}</p>
        {/* TODO: Add same GST table layout from Smart GST project */}
      </div>

      <button
        onClick={generatePdf}
        className="mt-4 bg-secondary text-white px-4 py-2 rounded"
      >
        Download PDF
      </button>
    </div>
  );
}

export default InvoicePreview;
