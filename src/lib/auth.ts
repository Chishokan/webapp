import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

const COOKIE_NAME = "ohayou_session";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET が設定されていません (.env を確認してください)");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  loginId: string;
  name: string;
};

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** クッキーからセッションを取得（検証のみ・DBアクセスなし） */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: [ALG],
    });
    return {
      userId: payload.userId as string,
      loginId: payload.loginId as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

/** セッションを取得し、実在ユーザーであることを確認して返す */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      loginId: true,
      name: true,
      grade: true,
      campus: true,
      createdAt: true,
    },
  });
  return user;
}

/** API ルート用: 未認証なら例外を投げる */
export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session.userId;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("ログインが必要です");
    this.name = "UnauthorizedError";
  }
}
