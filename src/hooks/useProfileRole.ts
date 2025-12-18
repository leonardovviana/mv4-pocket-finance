import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type UserRole = "admin" | "employee";

export function useProfileRole() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["profile_role", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<UserRole> => {
      if (!userId) return "employee";

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return (data?.role as UserRole | null) ?? "employee";
    },
    staleTime: 60_000,
  });
}
