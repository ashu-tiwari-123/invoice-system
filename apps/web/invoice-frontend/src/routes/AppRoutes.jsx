import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Layout from "../components/layout/Layout";
import InvoiceForm from "../modules/invoices/InvoiceForm";
import InvoicePreview from "../modules/invoices/InvoicePreview";
import InvoicePage from "../modules/invoices/InvoicePage";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useSelector((state) => state.auth);

  if (loading) return <div className="p-6">Checking session...</div>;

  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invoices" element={<InvoicePage />} />
          <Route path="/invoices/new" element={<InvoiceForm />} />
          <Route path="/invoices/:id/preview" element={<InvoicePreview />} />
          <Route path="/quotations" element={<h2>Quotations Page</h2>} />
          <Route path="/customers" element={<h2>Customers Page</h2>} />
          <Route path="/products" element={<h2>Products Page</h2>} />
          <Route path="/purchases" element={<h2>Purchases Page</h2>} />
          <Route path="/expenses" element={<h2>Expenses Page</h2>} />
          <Route path="/reports" element={<h2>Reports Page</h2>} />
          <Route path="/company" element={<h2>Company Page</h2>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
