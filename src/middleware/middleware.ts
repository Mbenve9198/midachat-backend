// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  
  // Proteggi le rotte che richiedono autenticazione
  if (request.nextUrl.pathname.startsWith('/onboarding') || 
      request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Reindirizza gli utenti autenticati dalla landing page all'onboarding/dashboard
  if (request.nextUrl.pathname === '/' && token) {
    return NextResponse.redirect(new URL('/onboarding/1', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/onboarding/:path*', '/dashboard/:path*'],
}