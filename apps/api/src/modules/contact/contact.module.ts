import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

// PrismaModule and MailModule are @Global, so nothing to import here.
@Module({
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
