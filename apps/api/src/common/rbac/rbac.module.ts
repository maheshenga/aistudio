import { Module } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

/**
 * 仅用于集中导出 RolesGuard。
 * RolesGuard 通过 app.module.ts 的 APP_GUARD 全局注册，
 * 此 module 保证 Reflector（由 Nest 核心 DI 提供）可注入。
 */
@Module({
  providers: [RolesGuard],
  exports: [RolesGuard],
})
export class RbacModule {}
