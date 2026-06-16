import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';
import { BillingController } from './billing.controller';

@Module({
  controllers: [BillingController],
  providers: [CreditService],
  exports: [CreditService],
})
export class BillingModule {}
