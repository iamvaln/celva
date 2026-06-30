import { Module } from '@nestjs/common';
import { ConsignmentsController } from './consignments.controller';
import { ConsignmentsService } from './consignments.service';

@Module({
  controllers: [ConsignmentsController],
  providers: [ConsignmentsService],
  exports: [ConsignmentsService],
})
export class ConsignmentsModule {}
