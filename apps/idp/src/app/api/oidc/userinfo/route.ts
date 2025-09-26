import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const ISSUER = process.env.IDP_ISSUER || 'http://localhost:3100'
const JWT_SECRET = process.env.IDP_JWT_SECRET || 'idp-dev-secret'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    return NextResponse.json({
      sub: payload.sub,
      tenantId: payload.tenantId,
      roles: payload.roles,
      features: payload.features,
      iss: ISSUER
    })
  } catch {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 })
  }
}


