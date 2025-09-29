import { NextResponse } from 'next/server'

// Using HS256 for development; JWKS is empty. Switch to RS256 in production.
export async function GET() {
  return NextResponse.json({ keys: [] })
}


