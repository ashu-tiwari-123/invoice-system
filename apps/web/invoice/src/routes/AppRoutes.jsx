import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Layout from "../layout/Layout";
import Dashboard from "../pages/Dashboard";
import Company from "../pages/company/Company";
import { useUser } from "../context/userContext";
import Profile from './../pages/Profile';
import UpdateCompany from "../pages/company/UpdateCompany";
import Invoices from "../pages/invoices/invoices";
import InvoiceView from "../pages/invoices/InvoiceView";
import Quotation from "../pages/quotations/quotation";
import QuotationView from "../pages/quotations/QuotationView";
import Customer from './../pages/customers/Customer';
import Products from "../pages/products/Products";

const Private = ({ children }) => {
  const { user, loading } = useUser();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const NeedsCompany = ({ children }) => {
  const { user, loading } = useUser();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.needsCompanyLink && !location.pathname.startsWith("/company")) {
    return <Navigate to="/company" replace />;
  }
  return children;
};

export default function AppRoutes() {
  const { user } = useUser();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        <Route
          path="/company"
          element={
            <Private>
              <Company />
            </Private>
          }
        />

        <Route
          element={
            <Private>
              <NeedsCompany>
                <Layout />
              </NeedsCompany>
            </Private>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/up-company" element={<UpdateCompany />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices-view/:id" element={<InvoiceView />} />
          <Route path="/quotations" element={<Quotation />} />
          <Route path="/quotation-view/:id" element={<QuotationView />} />
          <Route path="/customers" element={<Customer />} />
          <Route path="/products" element={<Products />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
