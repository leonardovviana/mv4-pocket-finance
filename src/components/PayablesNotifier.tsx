import { useAuth } from "@/hooks/useAuth";
import { usePayablesDueNotificationsEnabled } from "@/hooks/usePayablesDueNotifications";
import { useProfileRole } from "@/hooks/useProfileRole";

export function PayablesNotifier() {
  const { user } = useAuth();
  const roleQuery = useProfileRole();
  const role = roleQuery.data ?? "employee";

  const enabled = Boolean(user?.id) && role === "admin";
  usePayablesDueNotificationsEnabled(enabled);
  return null;
}
