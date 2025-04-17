import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const PrivateRoute = ({ requiredRole }) => {
  const { user } = useContext(AuthContext);

  // Redirect to login if not authenticated
  if (!user) return <Navigate to="/login" />;

  // Restrict access based on role
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/unauthorized" />;

  return <Outlet />;
};

export default PrivateRoute;
