import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { USER_ROLE } from '@celva/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';

const sendPdf = (
  res: Response,
  buffer: Buffer,
  invoiceNumber: string,
): void => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${invoiceNumber}.pdf"`,
  );
  res.setHeader('Content-Length', String(buffer.length));
  res.end(buffer);
};

/**
 * Customer-facing invoice download. Returns the PDF for one of the user's
 * own orders, or 404 if the order has no Invoice row yet (payment still
 * PENDING / FAILED).
 */
@ApiTags('me-invoices')
@ApiBearerAuth('access-token')
@Controller({ path: 'me/orders', version: '1' })
export class MyInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':id/invoice')
  @ApiOperation({
    summary:
      "Download the invoice PDF for one of my orders. 404 until the payment is completed and an Invoice row is created.",
  })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, invoiceNumber } = await this.invoices.renderForUser(id, user.id);
    sendPdf(res, buffer, invoiceNumber);
  }
}

/**
 * Admin/manager-facing invoice download (any order). Same render path —
 * the only difference is the ownership check is skipped.
 */
@ApiTags('admin-invoices')
@ApiBearerAuth('access-token')
@Controller({ path: 'orders', version: '1' })
@Roles(USER_ROLE.ADMIN, USER_ROLE.MANAGER)
export class AdminInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':id/invoice')
  @ApiOperation({ summary: "Download any order's invoice PDF (admin)." })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, invoiceNumber } = await this.invoices.renderForAdmin(id);
    sendPdf(res, buffer, invoiceNumber);
  }
}
