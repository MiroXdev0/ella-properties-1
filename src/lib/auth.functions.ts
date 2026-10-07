import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

const signUpSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(100),
  redirectTo: z.string().url().max(500).optional(),
});

function serverPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/**
 * Public sign-up. The `allow_registration` switch is enforced here on the server,
 * so hiding the form in the UI is never the only control.
 */
export const publicSignUp = createServerFn({ method: "POST" })
  .validator((data: unknown) => signUpSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();

    const { data: settings } = await supabase
      .from("site_settings")
      .select("allow_registration")
      .eq("id", 1)
      .maybeSingle();

    if (!settings?.allow_registration) {
      return { ok: false as const, reason: "disabled" as const };
    }

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: data.redirectTo ? { emailRedirectTo: data.redirectTo } : undefined,
    });

    if (error) {
      console.error("[publicSignUp]", error.message);
      return { ok: false as const, reason: "error" as const };
    }
    return { ok: true as const };
  });





