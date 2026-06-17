import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, { provide: RESOURCE_SERVICE, useExisting: PaymentService }],
})
export class PaymentModule {}
