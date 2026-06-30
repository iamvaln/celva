import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/auth-cookies';
import { requireEnv } from '@/lib/env';

/**
 * Proxies GET /me/orders/:id/invoice from the API to the browser. We
 * can't link directly to the API endpoint from a static <a> because the
 * access token lives in an httpOnly cookie that the browser can't read
 * to set the Authorization header. The route handler runs server-side,
 * pulls the token, calls the API, and streams the PDF back.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; orderId: string }> },
): Promise<Response> {
  const { locale, orderId } = await params;
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.redirect(new URL(`/${locale}/login`, _request.url));
  }

  const apiBase = requireEnv('API_INTERNAL_URL');
  const upstream = await fetch(
    `${apiBase}/api/v1/me/orders/${encodeURIComponent(orderId)}/invoice`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept-Language': locale,
      },
      cache: 'no-store',
    },
  );

  if (!upstream.ok) {
    // Pass through the status so the customer sees the right page (404 if
    // the invoice isn't ready, 403 if it's not theirs, etc).
    return new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  }

  const body = await upstream.arrayBuffer();
  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/pdf');
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers.set('Content-Disposition', disposition);
  headers.set('Content-Length', String(body.byteLength));
  headers.set('Cache-Control', 'private, no-store');
  return new NextResponse(body, { status: 200, headers });
}
