import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { getOrCreateTodaySession } from "@/lib/study-session";

const schema = z.object({
  learned: z.string().min(1, "学んだことを入力してください").max(2000),
  good: z.string().max(2000).optional(),
  next: z.string().max(2000).optional(),
  mood: z.coerce.number().int().min(1).max(5).optional(),
});

// リフレクション（振り返り）を保存する（②リフレクションの入力）
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }

    const session = await getOrCreateTodaySession();
    const { learned, good, next, mood } = parsed.data;

    const reflection = await prisma.reflection.create({
      data: {
        userId,
        sessionId: session.id,
        learned,
        good: good || null,
        next: next || null,
        mood: mood ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: reflection.id });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "リフレクションの保存に失敗しました" },
      { status: 500 }
    );
  }
}
