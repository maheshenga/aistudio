import { Controller } from '@nestjs/common';
import { createResourceController } from '../common/resource/workspace-resource.controller';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto, ListPaymentMethodQuery } from './dto';

const Base = createResourceController({
  path: 'workspaces/:workspaceId/payment-methods',
  createDto: CreatePaymentMethodDto, updateDto: UpdatePaymentMethodDto, listQuery: ListPaymentMethodQuery,
}) as new (...args: any[]) => object;

@Controller('workspaces/:workspaceId/payment-methods')
export class PaymentController extends Base {}
