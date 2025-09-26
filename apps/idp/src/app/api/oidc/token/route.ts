import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const ISSUER = process.env.IDP_ISSUER || 'http://localhost:3100'
const JWT_SECRET = process.env.IDP_JWT_SECRET || 'idp-dev-secret'

export async function POST(req: NextRequest) {
  const body = await req.formData()
  const grantType = body.get('grant_type') as string
  const username = body.get('username') as string
  const password = body.get('password') as string
  // For Phase 3 scaffold, accept any non-empty username/password
  if (grantType !== 'password' || !username || !password) {
    return NextResponse.json({ error: 'unsupported_grant_type' }, { status: 400 })
  }
  const now = Math.floor(Date.now() / 1000)
  const accessToken = jwt.sign({
    sub: `user:${username}`,
    tenantId: 'tenant_dev',
    roles: ['ADMIN'],
    features: { hasAPI: true, hasPublicSessions: true },
    iat: now
  }, JWT_SECRET, { issuer: ISSUER, expiresIn: '15m' })
  const idToken = jwt.sign({ sub: `user:${username}`, tenantId: 'tenant_dev', iat: now }, JWT_SECRET, { issuer: ISSUER, expiresIn: '15m' })
  return NextResponse.json({
    token_type: 'Bearer',
    access_token: accessToken,
    id_token: idToken,
    expires_in: 900
  })
}


