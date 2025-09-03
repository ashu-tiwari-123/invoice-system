import { Navigate } from "react-router-dom";
import { useUser } from "../context/userContext.jsx";

export default function PrivateRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
