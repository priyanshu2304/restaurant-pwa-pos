import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function Guard() {
  const loc = useLocation();
  const hasToken =
    typeof sessionStorage !== "undefined" && !!sessionStorage.getItem("token");
  if (!hasToken) return <Navigate to="/login" state={{ from: loc }} replace />;
  return <Outlet />;
}
