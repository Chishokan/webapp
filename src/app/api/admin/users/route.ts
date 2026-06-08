import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireStaff,
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

// 許可された職員一覧
export async function GET() {
  try {
    await requireStaff();
    const users = await prisma.user.findMany({
      where: { role: { in: ["TEACHER", "SUPER_ADMIN"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ users });
  } catch (e) {
    return handleError(e);
  }
}

const schema = z.object({
  email: z.string().email("メールアドレスの形式が正しくありません"),
  name: z.string().min(1, "表示名を入力してください").max(50),
  password: z.string().min(8, "パスワードは8文字以上にしてください"),
});

// 職員の追加（super_admin のみ）
export async function POST(req: Request) {
  try {
    await requireSuperAdmin();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }
    const { email, name, password } = parsed.data;

    const dup = await prisma.user.findFirst({
      where: { OR: [{ email }, { loginId: email }] },
    });
    if (dup) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        loginId: `t_${randomBytes(4).toString("hex")}`,
        name,
        grade: "-",
        campus: "-",
        role: "TEACHER",
        passwordHash,
        teacherProfile: { create: { displayName: name } },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
