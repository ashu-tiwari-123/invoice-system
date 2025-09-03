import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import PrivateRoute from "./PrivateRoutes";
import { useUser } from "../context/userContext.jsx";
import Layout from "../layout/Layout.jsx";

function FallbackRoute() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return user ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invoices" element={<h2>Invoice Page</h2>} />
          <Route path="/quotations" element={<h2>Quotations Page</h2>} />
          <Route path="/customers" element={<h2>Customers Page</h2>} />
          <Route path="/products" element={<h2>Products Page</h2>} />
          <Route path="/purchases" element={<h2>Purchases Page</h2>} />
          <Route path="/expenses" element={<h2>Expenses Page</h2>} />
          <Route path="/reports" element={<h2>Reports Page</h2>} />
          <Route path="/company" element={<h2>Company Page</h2>} />
        </Route>
        {/* Catch-all */}
        <Route path="*" element={<FallbackRoute />} />
      </Routes>
    </Router>
  );
}
