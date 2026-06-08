import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "ohayou_session";

// /admin/* は職員(teacher / super_admin)のみアクセス可能
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const loginUrl = new URL("/login", req.url);

  if (!token) {
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const role = payload.role as string | undefined;
    if (role === "TEACHER" || role === "SUPER_ADMIN") {
      return NextResponse.next();
    }
    // 権限がない生徒などはホームへ
    return NextResponse.redirect(new URL("/", req.url));
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
