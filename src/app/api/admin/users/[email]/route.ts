import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireSuperAdmin,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth";

function handleError(e: unknown) {
  if (e instanceof UnauthorizedError)
    return NextResponse.json({ error: e.message }, { status: 401 });
  if (e instanceof ForbiddenError)
    return NextResponse.json({ error: e.message }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
}

// 職員の削除（super_admin のみ。保護対象は拒否）
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const session = await requireSuperAdmin();
    const { email: rawEmail } = await params;
    const email = decodeURIComponent(rawEmail);

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target || (target.role !== "TEACHER" && target.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "対象の職員が見つかりません" },
        { status: 404 }
      );
    }
    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "最上級管理者は削除できません" },
        { status: 403 }
      );
    }
    if (target.id === session.userId) {
      return NextResponse.json(
        { error: "自分自身は削除できません" },
        { status: 403 }
      );
    }
    const staffCount = await prisma.user.count({
      where: { role: { in: ["TEACHER", "SUPER_ADMIN"] } },
    });
    if (staffCount <= 1) {
      return NextResponse.json(
        { error: "最後の職員は削除できません" },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id: target.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
