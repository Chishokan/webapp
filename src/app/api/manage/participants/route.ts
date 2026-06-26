import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManage, ManageUnauthorizedError } from "@/lib/manage-auth";

const schema = z.object({ userId: z.string().min(1) });

function parse(body: unknown) {
  return schema.safeParse(body);
}

// 参加登録（塾生から選択）
export async function POST(req: Request) {
  try {
    await requireManage();
    const parsed = parse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
    }
    await prisma.enrollment.upsert({
      where: { userId: parsed.data.userId },
      update: {},
      create: { userId: parsed.data.userId, source: "ADMIN_SELECT" },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ManageUnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "登録に失敗しました" }, { status: 500 });
  }
}

// 参加登録の取消
export async function DELETE(req: Request) {
  try {
    await requireManage();
    const parsed = parse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "入力が不正です" }, { status: 400 });
    }
    await prisma.enrollment.deleteMany({ where: { userId: parsed.data.userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ManageUnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "取消に失敗しました" }, { status: 500 });
  }
}
