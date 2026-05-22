import { NextResponse, type NextRequest } from 'next/server';
import { clearAccessToken, setAccessToken } from '@/lib/auth-cookies';

/**
 * Stash the access token returned by /v1/auth/login into an httpOnly
 * cookie on the Next.js host. Server components and route handlers
 * read it via getAccessToken() and forward it to the API as a Bearer.
 *
 * POST { accessToken }  → 204 (cookie set)
 * DELETE                → 204 (cookie cleared)
 */

export async function POST(request: NextRequest) {
  let body: { accessToken?: string };
  try {
    body = (await request.json()) as { accessToken?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (!body.accessToken || typeof body.accessToken !== 'string') {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  }
  await setAccessToken(body.accessToken);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE() {
  await clearAccessToken();
  return new NextResponse(null, { status: 204 });
}
