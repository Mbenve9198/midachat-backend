// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Disabilita temporaneamente i redirect per debug
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/onboarding/:path*', '/dashboard/:path*'],
}