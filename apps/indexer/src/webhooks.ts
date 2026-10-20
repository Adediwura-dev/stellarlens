import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { webhookDeliveries as webhookDeliveriesTable, webhooks as webhooksTable, type Database } from "@stellarlens/db";
import { WEBHOOK_MAX_RETRIES, WEBHOOK_RETRY_BASE_DELAY_MS, WEBHOOK_RETRY_MAX_DELAY_MS, WEBHOOK_TIMEOUT_MS } from "./config.js";
import { withRetry } from "./retry.js";

export interface WebhookEventPayload {
  eventId: number;
  contractId: number;
  ledger: number;
  txHash: string;
  topic: unknown[];
  value: unknown;
}

async function postWebhook(url: string, body: string, signature: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`
      },
      body,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`webhook responded with status ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

/** A webhook with no eventTypes fires on everything; otherwise the event's topic[0] must be in the list. */
function matchesEventTypes(webhook: { eventTypes: string[] | null }, payload: WebhookEventPayload): boolean {
  if (!webhook.eventTypes || webhook.eventTypes.length === 0) {
    return true;
  }
  const eventType = payload.topic[0];
  return typeof eventType === "string" && webhook.eventTypes.includes(eventType);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Persist a delivery outcome without letting an observability write break ingestion.
 * This is intentionally best-effort: persistence errors are logged and swallowed.
 */
async function recordDelivery(
  db: Database,
  outcome: {
    webhookId: number;
    eventId: number;
    status: "success" | "failed";
    attempts: number;
    lastError: string | null;
    deliveredAt: Date | null;
  }
): Promise<void> {
  try {
    await db.insert(webhookDeliveriesTable).values(outcome);
  } catch (err) {
    console.error(`webhook ${outcome.webhookId} delivery outcome could not be persisted:`, err);
  }
}

/** Best-effort delivery: failures are logged, never thrown, so one bad endpoint can't stall indexing. */
export async function deliverWebhooksForEvent(db: Database, payload: WebhookEventPayload): Promise<void> {
  let recipients: Array<typeof webhooksTable.$inferSelect>;

  try {
    recipients = (
      await db.select().from(webhooksTable).where(eq(webhooksTable.contractId, payload.contractId))
    ).filter((webhook) => matchesEventTypes(webhook, payload));
  } catch (err) {
    console.error(`webhook recipients could not be loaded for contract ${payload.contractId}:`, err);
    return;
  }

  if (recipients.length === 0) {
    return;
  }

  const body = JSON.stringify(payload);

  await Promise.all(
    recipients.map(async (webhook) => {
      let attempts = 0;

      try {
        const signature = createHmac("sha256", webhook.secret).update(body).digest("hex");
        await withRetry(
          `webhook:${webhook.id}`,
          () => {
            attempts += 1;
            return postWebhook(webhook.url, body, signature);
          },
          {
            maxRetries: WEBHOOK_MAX_RETRIES,
            baseDelayMs: WEBHOOK_RETRY_BASE_DELAY_MS,
            maxDelayMs: WEBHOOK_RETRY_MAX_DELAY_MS
          }
        );

        await recordDelivery(db, {
          webhookId: webhook.id,
          eventId: payload.eventId,
          status: "success",
          attempts,
          lastError: null,
          deliveredAt: new Date()
        });
      } catch (err) {
        console.error(`webhook ${webhook.id} delivery failed after retries:`, err);

        await recordDelivery(db, {
          webhookId: webhook.id,
          eventId: payload.eventId,
          status: "failed",
          attempts,
          lastError: errorMessage(err),
          deliveredAt: null
        });
      }
    })
  );
}
