import { NextResponse } from 'next/server'

const ISSUER = process.env.IDP_ISSUER || 'http://localhost:3100'

export async function GET() {
  const config = {
    issuer: ISSUER,
    token_endpoint: `${ISSUER}/api/oidc/token`,
    userinfo_endpoint: `${ISSUER}/api/oidc/userinfo`,
    response_types_supported: ['token', 'id_token'],
    grant_types_supported: ['password'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    claims_supported: ['sub', 'tenantId', 'roles', 'features', 'iat', 'iss', 'exp']
  }
  return NextResponse.json(config)
}


