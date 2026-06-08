import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";

const schema = z.object({
  loginId: z.string().min(1, "ログインIDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
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

  const { loginId, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "ログインIDまたはパスワードが正しくありません" },
      { status: 401 }
    );
  }

  await createSession({
    userId: user.id,
    loginId: user.loginId,
    name: user.name,
  });
  return NextResponse.json({ ok: true });
}
