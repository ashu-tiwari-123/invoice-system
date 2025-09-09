import api from "../axiosInstance";

export const downloadServerPdf = async (invoiceId, invoiceNo) => {
    try {
        const res = await api.get(`/create-pdf/${invoiceId}/pdf`, {
            responseType: "blob",
        });

        const blob = new Blob([res.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${invoiceNo || invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("PDF download failed:", err);
    } finally {
    }
}

export const downloadQuotationPdf = async (quotationId, quotationNo) => {
  try {
    const res = await api.get(`/create-quote/${quotationId}/pdf`, {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${quotationNo || quotationId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (err) {
    console.error("Quotation PDF download failed:", err);
    throw err;
  }
};

