import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '@celva/shared';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.header(REQUEST_ID_HEADER);
    const id = existing && /^[\w-]{8,128}$/.test(existing) ? existing : uuid();
    req.headers[REQUEST_ID_HEADER.toLowerCase()] = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
