import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
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

// 生徒一覧（校舎・学年・名前・退塾含むで絞り込み）
export async function GET(req: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get("campus") || undefined;
    const gradeParam = searchParams.get("grade");
    const grade = gradeParam ? Number(gradeParam) : undefined;
    const name = searchParams.get("name")?.trim() || undefined;
    const includeQuit = searchParams.get("includeQuit") === "true";

    const students = await prisma.student.findMany({
      where: {
        campusId: campusId,
        grade: grade,
        // 名前検索時は退塾も含める
        ...(includeQuit || name ? {} : { status: "ACTIVE" }),
        ...(name
          ? {
              OR: [
                { user: { is: { name: { contains: name, mode: "insensitive" } } } },
                { kana: { contains: name, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        user: { select: { name: true } },
        campus: { select: { name: true } },
      },
      orderBy: [{ grade: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ students });
  } catch (e) {
    return handleError(e);
  }
}

const createSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(50),
  kana: z.string().max(50).optional(),
  campusId: z.string().min(1, "校舎は必須です"),
  grade: z.coerce.number().int().min(1).max(3).optional(),
  school: z.string().max(100).optional(),
});

// 生徒の新規追加（User+Student を作成）
export async function POST(req: Request) {
  try {
    await requireStaff();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }
    const { name, kana, campusId, grade, school } = parsed.data;

    const campus = await prisma.campus.findUnique({ where: { id: campusId } });
    if (!campus) {
      return NextResponse.json({ error: "校舎が存在しません" }, { status: 400 });
    }

    // ログイン用のID/パスワードは自動採番（後で配布・変更可能）
    const loginId = `s_${randomBytes(5).toString("hex")}`;
    const passwordHash = await bcrypt.hash(randomBytes(12).toString("hex"), 10);

    const student = await prisma.student.create({
      data: {
        kana: kana || null,
        campus: { connect: { id: campusId } },
        grade: grade ?? null,
        school: school || null,
        user: {
          create: {
            loginId,
            name,
            grade: grade ? `中${grade}` : "-",
            campus: campus.name,
            passwordHash,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, id: student.id });
  } catch (e) {
    return handleError(e);
  }
}
