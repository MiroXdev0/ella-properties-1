import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";
import { markSecuritySignal } from "@/lib/security-monitoring";

export type AdminContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export async function requireSecurityMonitorAdmin(
  context: AdminContext,
  request?: Request,
): Promise<void> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("[security-monitor] Administrator authorization check failed");
    throw new Response("Unable to verify administrator access", { status: 500 });
  }
  if (!data) {
    try {
      let requestToMark = request;
      if (!requestToMark) {
        const { getRequest } = await import("@tanstack/react-start/server");
        requestToMark = getRequest();
      }
      markSecuritySignal(requestToMark, "unauthorized_admin_attempt");
    } catch {
      console.error("[security-monitor] Unable to mark denied administrator access");
    }
    throw new Response("Administrator access required", { status: 403 });
  }
}
