import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/tenant/public.decorator';
import { permissionDenied, validationError } from '../common/errors';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreditService } from '../billing/credit.service';
import { verifyStripeSignature, resolveCreditAmount } from './stripe-signature';

/**
 * BILL-01: Stripe webhook → idempotent credit grant.
 *
 * Public route (authenticity from the Stripe signature over the raw body).
 * On payment_intent.succeeded / checkout.session.completed we resolve the
 * workspace (from event metadata) and credit amount (from STRIPE_CREDIT_PACKS
 * or metadata.credits), then grant with idempotencyKey = Stripe event id, so a
 * redelivered event never double-credits.
 *
 * Disabled unless STRIPE_WEBHOOK_SECRET is set — no SDK, no auto-charging UI
 * until finance signs prices (BILL-02). Beta uses manual invoicing.
 */
const GRANTING_EVENTS = new Set(['payment_intent.succeeded', 'checkout.session.completed', 'invoice.paid']);

@Controller('stripe/webhook')
export class StripeWebhookController {
  constructor(private prisma: PrismaService, private credit: CreditService) {}

  @Public()
  @Post()
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ): Promise<{ value: { received: true; granted?: number; deduped?: boolean; ignored?: boolean } }> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw validationError('Stripe webhook not configured');

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);
    const verification = verifyStripeSignature({ rawBody, signatureHeader: signature, secret });
    if (!verification.ok) throw permissionDenied(`Stripe signature invalid: ${verification.reason}`);

    const eventId = String(body.id ?? '');
    const eventType = String(body.type ?? '');
    if (!eventId) throw validationError('Stripe event missing id');
    if (!GRANTING_EVENTS.has(eventType)) return { value: { received: true, ignored: true } };

    const object = ((body.data as Record<string, unknown> | undefined)?.object ?? {}) as Record<string, unknown>;
    const metadata = (object.metadata ?? {}) as Record<string, unknown>;
    const workspaceId = String(metadata.workspaceId ?? '');
    if (!workspaceId) throw validationError('Stripe event metadata missing workspaceId');

    const priceId = this.extractPriceId(object);
    const amount = resolveCreditAmount({ priceId, metadataCredits: metadata.credits });
    if (amount <= 0) return { value: { received: true, ignored: true } };

    // grant() is idempotent on (workspaceId, idempotencyKey); the Stripe event id
    // guarantees a redelivery is a no-op rather than a double credit.
    const before = (await this.credit.getBalance(workspaceId)).balance;
    await this.prisma.$transaction((tx) =>
      this.credit.grant(tx, workspaceId, amount, 'stripe_purchase', `stripe:${eventId}`, 'stripe_event', eventId),
    );
    const after = (await this.credit.getBalance(workspaceId)).balance;

    return { value: { received: true, granted: amount, deduped: after === before } };
  }

  private extractPriceId(object: Record<string, unknown>): string | null {
    // checkout.session: line items aren't on the object; payment_intent / invoice
    // carry a price via metadata.priceId in our integration. Prefer explicit metadata.
    const meta = (object.metadata ?? {}) as Record<string, unknown>;
    if (typeof meta.priceId === 'string') return meta.priceId;
    const lines = (object.lines as { data?: Array<{ price?: { id?: string } }> } | undefined)?.data;
    if (Array.isArray(lines) && lines[0]?.price?.id) return lines[0].price!.id ?? null;
    return null;
  }
}
