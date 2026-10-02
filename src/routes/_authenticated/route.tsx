import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "editor";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (rolesError) {
      throw redirect({ to: "/auth" });
    }
    const roleSet = new Set((roles ?? []).map((r) => r.role as AppRole));
    const isAdmin = roleSet.has("admin");
    const isEditor = roleSet.has("editor");
    if (!isAdmin && !isEditor) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    const role: AppRole = isAdmin ? "admin" : "editor";
    return { user: data.user, role, isAdmin, isEditor };
  },
  component: () => <Outlet />,
});





