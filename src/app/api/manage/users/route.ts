import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManageAdmin, ManageForbiddenError } from "@/lib/manage-auth";
import { logToSheet } from "@/lib/sheet-log";

const schema = z.object({
  type: z.enum(["student", "staff"]),
  name: z.string().min(1, "名前を入力してください").max(100),
  loginId: z.string().min(3, "ログインIDは3文字以上で入力してください").max(100),
  password: z.string().min(8, "パスワードは8文字以上で入力してください").max(200),
  email: z.string().email("メールアドレスの形式が正しくありません").optional().or(z.literal("")),
  grade: z.string().max(20).optional(),
  campus: z.string().max(50).optional(),
  enroll: z.boolean().optional(),
});

// 生徒・職員(管理者)の登録（admin のみ）
export async function POST(req: Request) {
  try {
    await requireManageAdmin();

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }
    const { type, name, loginId, password, email, grade, campus, enroll } =
      parsed.data;

    const passwordHash = await bcrypt.hash(password, 10);
    const isStaff = type === "staff";

    const user = await prisma.user.create({
      data: {
        loginId,
        name,
        email: isStaff && email ? email : null,
        grade: grade || "-",
        campus: campus || "-",
        role: isStaff ? "TEACHER" : "STUDENT",
        passwordHash,
      },
    });

    if (isStaff) {
      // 職員プロフィール（既存スキーマとの整合のため）
      await prisma.teacher.create({
        data: { userId: user.id, displayName: name },
      });
    } else if (enroll) {
      // 生徒登録時に参加登録も行う場合
      await prisma.enrollment.create({
        data: { userId: user.id, source: "ADMIN_SELECT" },
      });
    }

    await logToSheet("account", {
      action: "register_user",
      loginId: user.loginId,
      name: user.name,
      role: isStaff ? "TEACHER" : "STUDENT",
      detail: isStaff ? "職員登録" : enroll ? "生徒登録(参加登録あり)" : "生徒登録",
    });

    return NextResponse.json({ ok: true, id: user.id });
  } catch (e) {
    if (e instanceof ManageForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined)?.join(", ") ?? "";
      const label = target.includes("email") ? "メールアドレス" : "ログインID";
      return NextResponse.json(
        { error: `その${label}は既に使われています` },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}
