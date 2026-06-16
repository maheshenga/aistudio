import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { RESOURCE_SERVICE } from '../common/resource/workspace-resource.controller';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService, { provide: RESOURCE_SERVICE, useExisting: CustomerService }],
})
export class CustomerModule {}
