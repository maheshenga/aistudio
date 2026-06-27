import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { StripeWebhookController } from './stripe-webhook.controller';

/**
 * BILL-01: Stripe webhook ingress for credit purchases. Inert unless
 * STRIPE_WEBHOOK_SECRET is configured.
 */
@Module({
  imports: [PrismaModule, BillingModule],
  controllers: [StripeWebhookController],
})
export class StripeModule {}
