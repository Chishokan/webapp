import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { CAMPUSES, GRADES } from "@/lib/options";

const schema = z.object({
  name: z.string().min(1, "名前を入力してください").max(50),
  loginId: z
    .string()
    .min(3, "ログインIDは3文字以上にしてください")
    .max(30)
    .regex(/^[A-Za-z0-9_.-]+$/, "ログインIDは半角英数字と _ . - のみ使用できます"),
  grade: z.enum(GRADES, { errorMap: () => ({ message: "学年を選択してください" }) }),
  campus: z.enum(CAMPUSES, {
    errorMap: () => ({ message: "所属校舎を選択してください" }),
  }),
  password: z.string().min(8, "パスワードは8文字以上にしてください"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
      { status: 400 }
    );
  }

  const { name, loginId, grade, campus, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) {
    return NextResponse.json(
      { error: "このログインIDは既に使われています" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, loginId, grade, campus, passwordHash },
  });

  await createSession({
    userId: user.id,
    loginId: user.loginId,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({ ok: true });
}
