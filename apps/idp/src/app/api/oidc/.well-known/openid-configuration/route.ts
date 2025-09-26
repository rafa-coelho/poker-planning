import { NextResponse } from 'next/server'

const ISSUER = process.env.IDP_ISSUER || 'http://localhost:3100'

export async function GET() {
  return NextResponse.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/api/oidc/authorize`,
    token_endpoint: `${ISSUER}/api/oidc/token`,
    userinfo_endpoint: `${ISSUER}/api/oidc/userinfo`,
    jwks_uri: `${ISSUER}/api/oidc/.well-known/jwks.json`,
    response_types_supported: ['code', 'token', 'id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
    claims_supported: ['sub', 'tenantId', 'roles', 'features']
  })
}


