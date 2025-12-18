import { useProfileRole, type UserRole } from "@/hooks/useProfileRole";
import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";

export function RoleGate(props: {
  allow: UserRole[];
  redirectTo: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const roleQuery = useProfileRole();

  if (roleQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const role = roleQuery.data ?? "employee";
  if (!props.allow.includes(role)) {
    return <Navigate to={props.redirectTo} replace state={{ from: location.pathname }} />;
  }

  return <>{props.children}</>;
}
