import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import type { IMailgunClient } from 'mailgun.js/Interfaces';
import type { Env } from '../../config/env';

export type MailMessage = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  /** Provide a header X-Celva-Tag for analytics. */
  tag?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: IMailgunClient | null = null;
  private readonly domain: string | undefined;
  private readonly from: string;
  private readonly isDev: boolean;
  private readonly hasKey: boolean;

  constructor(private readonly config: ConfigService<Env, true>) {
    const apiKey = this.config.get('MAILGUN_API_KEY', { infer: true });
    this.domain = this.config.get('MAILGUN_DOMAIN', { infer: true });
    const region = this.config.get('MAILGUN_REGION', { infer: true });
    this.from = this.config.get('MAILGUN_FROM', { infer: true }) ?? 'Celva Store <no-reply@celva.store>';
    this.isDev = this.config.get('NODE_ENV', { infer: true }) !== 'production';
    this.hasKey = Boolean(apiKey);

    if (this.hasKey && this.domain) {
      const mailgun = new Mailgun(FormData);
      this.client = mailgun.client({
        username: 'api',
        key: apiKey as string,
        url: region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net',
      });
    }
  }

  async send(message: MailMessage): Promise<void> {
    const recipients = Array.isArray(message.to) ? message.to : [message.to];

    if (this.isDev) {
      this.logger.log(
        `[DEV MAIL] to=${recipients.join(',')} subject=${JSON.stringify(message.subject)} tag=${message.tag ?? '-'}`,
      );
      if (message.text) this.logger.debug(`[DEV MAIL text]\n${message.text}`);
    }

    if (!this.client || !this.domain) {
      if (this.isDev) return;
      throw new Error('MailService is not configured: MAILGUN_API_KEY and MAILGUN_DOMAIN required');
    }

    await this.client.messages.create(this.domain, {
      from: this.from,
      to: recipients,
      subject: message.subject,
      html: message.html,
      text: message.text,
      'h:X-Celva-Tag': message.tag,
    } as never);
  }
}
