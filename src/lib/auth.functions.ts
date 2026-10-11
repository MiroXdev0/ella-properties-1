import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { SITE_URL } from "@/lib/seo";

const signUpSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(100),
});

function serverPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getRegistrationEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverPublicClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("allow_registration")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("[getRegistrationEnabled]", error.message);
    throw new Error("Unable to verify registration availability");
  }

  return data?.allow_registration === true;
});

/**
 * Public sign-up. The `allow_registration` switch is enforced here on the server,
 * so hiding the route or link is never the only control.
 */
export const publicSignUp = createServerFn({ method: "POST" })
  .validator((data: unknown) => signUpSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = serverPublicClient();

    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("allow_registration")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "[publicSignUp] Unable to verify registration availability",
        settingsError.message,
      );
      throw new Error("Unable to verify registration availability");
    }
    if (!settings?.allow_registration) {
      return { ok: false as const, reason: "disabled" as const };
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { emailRedirectTo: `${SITE_URL}/auth` },
    });

    if (error) {
      console.error("[publicSignUp]", error.message);
      if (error.code === "user_already_exists") {
        return { ok: false as const, reason: "exists" as const };
      }
      return { ok: false as const, reason: "error" as const };
    }
    return { ok: true as const, emailConfirmationRequired: !signUpData.session };
  });
