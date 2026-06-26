import { NextResponse } from "next/server";
import { destroyManageSession } from "@/lib/manage-auth";

export async function POST() {
  await destroyManageSession();
  return NextResponse.json({ ok: true });
}
