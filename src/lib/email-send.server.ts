/**
 * Server-only helper for sending transactional emails via the Lovable Emails queue.
 * Calls the internal send route which validates suppression, enqueues, and renders.
 */
export async function sendAppEmail(input: {
  templateName: "welcome";
  recipientEmail: string;
  templateData?: Record<string, unknown>;
  idempotencyKey?: string;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.warn("[sendAppEmail] LOVABLE_API_KEY missing — skipping send");
      return;
    }
    // Enqueue directly via the same path the queue processor uses.
    await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        templateName: input.templateName,
        recipientEmail: input.recipientEmail.toLowerCase(),
        templateData: input.templateData ?? {},
        idempotencyKey:
          input.idempotencyKey ?? `${input.templateName}-${input.recipientEmail}-${Date.now()}`,
      },
    } as any);
  } catch (err) {
    // Never let email failures break the originating action
    console.error("[sendAppEmail] failed", err);
  }
}
