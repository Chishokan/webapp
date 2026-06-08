import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, UnauthorizedError, ForbiddenError } from "@/lib/auth";

function handleError(e: unknown) {
  if (e instanceof UnauthorizedError)
    return NextResponse.json({ error: e.message }, { status: 401 });
  if (e instanceof ForbiddenError)
    return NextResponse.json({ error: e.message }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
}

// 在籍復帰
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    await prisma.student.update({
      where: { id },
      data: { status: "ACTIVE", quitDate: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
