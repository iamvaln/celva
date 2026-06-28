import { Injectable } from '@nestjs/common';
import { SETTING_KEYS } from '@celva/shared';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import type { ContactMessageDto } from './dto/contact-message.dto';

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async submit(dto: ContactMessageDto): Promise<void> {
    const setting = await this.prisma.setting.findUnique({
      where: { key: SETTING_KEYS.CONTACT_EMAIL },
    });
    const to = setting?.value || 'contact@celva.store';

    const body = escapeHtml(dto.message).replace(/\n/g, '<br>');
    await this.mail.send({
      to,
      subject: `Contact storefront — ${dto.name}`,
      tag: 'contact',
      html:
        `<p><strong>De :</strong> ${escapeHtml(dto.name)} &lt;${escapeHtml(dto.email)}&gt;</p>` +
        `<hr><p>${body}</p>`,
      text: `De: ${dto.name} <${dto.email}>\n\n${dto.message}`,
    });
  }
}
