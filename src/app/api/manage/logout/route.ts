import { NextResponse } from "next/server";
import { destroyManageSession } from "@/lib/manage-auth";
import { destroySession } from "@/lib/auth";

export async function POST() {
  // admin(管理セッション)・staff(通常セッション) どちらでもログアウトできるよう両方破棄
  await destroyManageSession();
  await destroySession();
  return NextResponse.json({ ok: true });
}
