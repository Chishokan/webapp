import { NextResponse } from "next/server";
import { z } from "zod";
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    const interviews = await prisma.interview.findMany({
      where: { studentId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ interviews });
  } catch (e) {
    return handleError(e);
  }
}

const schema = z.object({
  date: z.string().min(1, "日付を入力してください").max(20),
  byTeacher: z.string().min(1, "担当者を入力してください").max(50),
  memo: z.string().min(1, "面談内容を入力してください"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student)
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, loginId: true },
    });

    const interview = await prisma.interview.create({
      data: {
        studentId: id,
        date: parsed.data.date,
        byTeacher: parsed.data.byTeacher,
        memo: parsed.data.memo,
        createdBy: me?.email ?? me?.loginId ?? session.userId,
      },
    });
    return NextResponse.json({ ok: true, id: interview.id });
  } catch (e) {
    return handleError(e);
  }
}
