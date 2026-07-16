import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/', '/case', '/admin', '/panel']

function isProtectedPath(pathname: string) {
  if (pathname === '/') return true
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isProtectedPath(pathname)) {
	return NextResponse.next()
  }

  const session = request.cookies.get('osint_session')?.value
  if (!session) {
	const loginUrl = new URL('/login', request.url)
	return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/case/:path*', '/admin/:path*', '/panel/:path*'],
}
