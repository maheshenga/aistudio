import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * BILL-01: Stripe webhook signature verification without the Stripe SDK.
 *
 * Stripe signs each webhook with `Stripe-Signature: t=<unix>,v1=<hmac_sha256>`
 * where the signed payload is `${t}.${rawBody}` keyed by the endpoint's signing
 * secret (whsec_...). We verify it ourselves so the API has no SDK dependency.
 */

const DEFAULT_TOLERANCE_MS = Number(process.env.STRIPE_WEBHOOK_TOLERANCE_MS ?? 5 * 60 * 1000);

export interface StripeVerifyResult {
  ok: boolean;
  reason?: string;
}

export function verifyStripeSignature(params: {
  rawBody: string;
  signatureHeader: string | undefined;
  secret: string;
  now?: number;
  toleranceMs?: number;
}): StripeVerifyResult {
  const { rawBody, signatureHeader, secret } = params;
  if (!secret) return { ok: false, reason: 'no signing secret configured' };
  if (!signatureHeader) return { ok: false, reason: 'missing signature header' };

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((kv) => kv.trim().split('=', 2) as [string, string]),
  );
  const ts = Number(parts.t);
  const provided = parts.v1;
  if (!Number.isFinite(ts) || !provided) return { ok: false, reason: 'malformed signature' };

  const now = params.now ?? Date.now();
  const tolerance = params.toleranceMs ?? DEFAULT_TOLERANCE_MS;
  if (Math.abs(now - ts * 1000) > tolerance) return { ok: false, reason: 'timestamp outside tolerance' };

  const expected = createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'signature mismatch' };
  return { ok: true };
}

/**
 * Maps a Stripe price/product id to a credit amount. Configure via
 * STRIPE_CREDIT_PACKS as `price_id:credits,price_id:credits`. Falls back to the
 * `credits` value passed in the event metadata when no mapping matches.
 */
export function resolveCreditAmount(params: {
  priceId?: string | null;
  metadataCredits?: unknown;
  env?: NodeJS.ProcessEnv;
}): number {
  const env = params.env ?? process.env;
  const packs = (env.STRIPE_CREDIT_PACKS ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, entry) => {
      const [id, credits] = entry.split(':');
      const n = Number(credits);
      if (id && Number.isFinite(n) && n > 0) acc[id.trim()] = Math.floor(n);
      return acc;
    }, {});

  if (params.priceId && packs[params.priceId]) return packs[params.priceId];
  const meta = Number(params.metadataCredits);
  return Number.isFinite(meta) && meta > 0 ? Math.floor(meta) : 0;
}
