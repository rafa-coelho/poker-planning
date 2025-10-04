import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar se o modo aberto está habilitado
  const openMode = process.env.NEXT_PUBLIC_OPEN_MODE == 'true';
  
  // Rotas públicas que não devem ser redirecionadas
  const publicRoutes = [
    '/auth/callback',
    '/api',
    '/_next',
  ];
  
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (openMode) {
    // No modo aberto, redirecionar rotas protegidas para a raiz
    
    // Rotas que devem ser redirecionadas para /
    const protectedRoutes = [
      '/dashboard',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/sessions',
    ];
    
    // Verificar se a rota atual é protegida
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    if (isProtectedRoute) {
      // Redirecionar para a raiz (que mostrará o modo aberto)
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Para rotas de sessão que não são do modo aberto, redirecionar
    if (pathname.match(/^\/[a-zA-Z0-9-]+$/) && !pathname.startsWith('/open')) {
      // Verificar se é uma rota de sessão (não é uma rota estática)
      const staticRoutes = ['/', '/api', '/_next', '/favicon.ico'];
      const isStaticRoute = staticRoutes.some(route => pathname.startsWith(route));
      
      if (!isStaticRoute) {
        // Redirecionar para o modo aberto
        return NextResponse.redirect(new URL(`/open${pathname}`, request.url));
      }
    }
  } else {
    // No modo normal, redirecionar rotas do modo aberto para a landing page principal
    if (pathname.startsWith('/open')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
