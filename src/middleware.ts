import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, JWTPayload } from "jose";

const SESSION_COOKIE = "ohayou_session";
const MANAGE_COOKIE = "ohayou_manage";

async function verify(token: string | undefined): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

// ルートにパス情報を渡す（ルートレイアウトで NavBar の出し分けに使用）
function withPathname(req: NextRequest): NextResponse {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 管理ログイン画面は未認証でも表示（チェック対象外）
  if (pathname.startsWith("/manage-login")) {
    return withPathname(req);
  }

  // 新・運営管理画面（/manage）: 管理セッション(admin) または 職員ロール(staff) でガード
  if (pathname.startsWith("/manage")) {
    const manage = await verify(req.cookies.get(MANAGE_COOKIE)?.value);
    if (manage?.kind === "manage") {
      return withPathname(req);
    }
    const session = await verify(req.cookies.get(SESSION_COOKIE)?.value);
    const role = session?.role as string | undefined;
    if (role === "TEACHER" || role === "SUPER_ADMIN") {
      return withPathname(req);
    }
    return NextResponse.redirect(new URL("/manage-login", req.url));
  }

  // 学習記録・面談管理（/admin）: 専用ログイン(/records-login)からの職員のみ。
  // 一般導線には出さず、職員(TEACHER/SUPER_ADMIN)セッションでのみアクセス可。
  if (pathname.startsWith("/admin")) {
    const payload = await verify(req.cookies.get(SESSION_COOKIE)?.value);
    const role = payload?.role as string | undefined;
    if (role === "TEACHER" || role === "SUPER_ADMIN") {
      return NextResponse.next();
    }
    if (!payload) {
      return NextResponse.redirect(new URL("/records-login", req.url));
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/manage/:path*", "/manage-login"],
};
