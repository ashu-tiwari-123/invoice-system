// ReportsApi.js
import api from "../../axiosInstance";

export const fetchInvoiceDetailed = (invoiceId, params = {}) =>
  api.get(`/reports/invoice-detailed/${invoiceId}`, { params });

export const fetchInvoicePL = (invoiceId) =>
  api.get(`/reports/invoice/${invoiceId}`);

export const fetchOverallPL = (params) => api.get("/reports/overall", { params });

export const fetchSales = (params) => api.get("/reports/sales", { params });
export const fetchSalesSummary = (params) => api.get("/reports/sales/summary", { params });

export const fetchTax = (params) => api.get("/reports/tax", { params });

export const fetchTopCustomers = (params) => api.get("/reports/top-customers", { params });
export const fetchTopProducts = (params) => api.get("/reports/top-products", { params });

export const fetchExpensesSummary = (params) => api.get("/reports/expenses/summary", { params });
export const fetchPurchases = (params) => api.get("/reports/purchases", { params });

export const fetchCashflow = (params) => api.get("/reports/cashflow", { params });

export const exportReportCsv = (opts) =>
  api.get("/reports/export", { params: opts, responseType: "blob" });
export const searchInvoices = (q, params = {}) => {
  // Backend endpoint should exist: GET /invoices/search?q=...
  return api.get("/invoices/search", { params: { q, limit: 20, ...params } });
};

