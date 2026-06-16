import { Module } from '@nestjs/common';
import { MailModule } from '../../mail/mail.module';
import { StudioRequestsController } from './studio-requests.controller';
import { StudioRequestsService } from './studio-requests.service';

@Module({
  imports: [MailModule],
  controllers: [StudioRequestsController],
  providers: [StudioRequestsService],
  exports: [StudioRequestsService],
})
export class StudioRequestsModule {}
