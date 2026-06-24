import { Module } from '@nestjs/common';
import { WebhookModule } from '../webhook/webhook.module';
import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';

@Module({ imports: [WebhookModule], controllers: [AssetController], providers: [AssetService] })
export class AssetModule {}
