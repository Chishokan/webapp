// 「おはよう勉強会」運営管理画面（/manage）専用の認証。
// 生徒/職員のログイン（ohayou_session）とは完全に分離した専用セッション。
//
// 管理ID・パスワードは環境変数で設定する（DBには持たない＝専用ID）:
//   OHAYOU_ADMIN_ID       … 管理ログインID（未設定時の既定: "ohayou-admin"）
//   OHAYOU_ADMIN_PASSWORD … 管理ログインパスワード（未設定なら管理ログインは無効）
//
// セッションは ohayou_manage クッキー（AUTH_SECRET で署名した JWT）で保持する。

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const MANAGE_COOKIE = "ohayou_manage";
const ALG = "HS256";

function getSecret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET が設定されていません (.env を確認してください)");
  return new TextEncoder().encode(s);
}

export function getManageAdminId(): string {
  return process.env.OHAYOU_ADMIN_ID || "ohayou-admin";
}

/** 管理ログインが利用可能か（パスワード未設定なら無効） */
export function isManageConfigured(): boolean {
  return Boolean(process.env.OHAYOU_ADMIN_PASSWORD);
}

export function verifyManageCredentials(id: string, password: string): boolean {
  const adminPw = process.env.OHAYOU_ADMIN_PASSWORD;
  if (!adminPw) return false;
  return id === getManageAdminId() && password === adminPw;
}

export async function createManageSession(): Promise<void> {
  const token = await new SignJWT({ kind: "manage" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const c = await cookies();
  c.set(MANAGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function destroyManageSession(): Promise<void> {
  (await cookies()).delete(MANAGE_COOKIE);
}

export async function isManageAuthed(): Promise<boolean> {
  const token = (await cookies()).get(MANAGE_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });
    return payload.kind === "manage";
  } catch {
    return false;
  }
}

export class ManageUnauthorizedError extends Error {
  constructor() {
    super("管理ログインが必要です");
    this.name = "ManageUnauthorizedError";
  }
}

/** 管理API用: 未認証なら例外を投げる */
export async function requireManage(): Promise<void> {
  if (!(await isManageAuthed())) {
    throw new ManageUnauthorizedError();
  }
}
