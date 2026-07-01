import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Server-side auth helpers that use the service-role key (configured in the
// container env) so signup/login work WITHOUT access to the Supabase Auth
// dashboard. The project is Lovable-managed, so toggling "Confirm email" in the
// dashboard isn't readily available — instead we create users already
// email-confirmed, and confirm legacy unconfirmed users on demand.

/**
 * Create a new user that is already email-confirmed (no verification email
 * required). Bypasses the project's "Confirm email" setting using the admin API.
 */
export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(320),
        password: z.string().min(8).max(200),
        name: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      auth: {
        admin: {
          createUser: (
            a: Record<string, unknown>,
          ) => Promise<{ error: { message?: string } | null }>;
        };
      };
    };
    const { error } = await admin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name ?? "" },
    });
    if (error) {
      const msg = String(error.message ?? "");
      if (/already|exists|registered|duplicate/i.test(msg)) {
        return { ok: false as const, reason: "exists" as const };
      }
      return { ok: false as const, reason: "error" as const, message: msg };
    }
    return { ok: true as const };
  });

/**
 * Mark an existing user's email as confirmed (for accounts created before
 * auto-confirm, which otherwise get "Email not confirmed" on login). Confirming
 * an email grants no access on its own — the correct password is still required
 * to sign in — so this is safe to call from the sign-in flow.
 */
export const confirmUserByEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().email().max(320) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as {
      auth: {
        admin: {
          listUsers: (a: { page: number; perPage: number }) => Promise<{
            data: {
              users: Array<{ id: string; email?: string; email_confirmed_at?: string | null }>;
            } | null;
            error: unknown;
          }>;
          updateUserById: (id: string, a: Record<string, unknown>) => Promise<{ error: unknown }>;
        };
      };
    };
    const email = data.email.toLowerCase();
    let found: { id: string; email_confirmed_at?: string | null } | undefined;
    for (let page = 1; page <= 20 && !found; page++) {
      const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = list?.users ?? [];
      if (error || users.length === 0) break;
      found = users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (users.length < 200) break;
    }
    if (!found) return { ok: false as const };
    if (found.email_confirmed_at) return { ok: true as const };
    const { error: upErr } = await admin.auth.admin.updateUserById(found.id, {
      email_confirm: true,
    });
    return { ok: !upErr };
  });
