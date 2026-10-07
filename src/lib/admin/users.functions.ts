import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createUserSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "editor"]),
  name: z.string().trim().min(1).max(100),
});

const updateNameSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
});

export const createAccessUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => createUserSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Verify caller is admin under RLS
    const { data: adminRow, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!adminRow) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Неуспешно създаване");

    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (insErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(insErr.message);
    }

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: created.user.id, display_name: data.name });
    if (profErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(profErr.message);
    }

    return { id: created.user.id, email: created.user.email };
  });

export const updateUserName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => updateNameSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: adminRow, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!adminRow) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: data.user_id, display_name: data.name });
    if (error) throw new Error(error.message);
    return { ok: true };
  });




