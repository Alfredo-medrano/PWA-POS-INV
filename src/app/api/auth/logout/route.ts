import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('pos_session', '', { maxAge: -1, path: '/' });
  return response;
}
