export default function Home() {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>IdP - Nyx Suite</h1>
      <p>OIDC endpoints:</p>
      <ul>
        <li>/api/oidc/.well-known/openid-configuration</li>
        <li>/api/oidc/token</li>
        <li>/api/oidc/userinfo</li>
      </ul>
    </div>
  )
}


