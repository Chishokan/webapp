import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { jstStartOfDay, jstDateString, jstYmd } from "@/lib/date";

// 指定した年月(JST)の出席日・リフレクション日を返す（カレンダー表示用）
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(req.url);
    const now = jstYmd(new Date());
    const year = Number(searchParams.get("year")) || now.y;
    const month = Number(searchParams.get("month")) || now.m;

    const start = jstStartOfDay(year, month, 1);
    const end = jstStartOfDay(month === 12 ? year + 1 : year, (month % 12) + 1, 1);

    const [attendances, reflections] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId, session: { date: { gte: start, lt: end } } },
        select: { session: { select: { date: true } } },
      }),
      prisma.reflection.findMany({
        where: { userId, createdAt: { gte: start, lt: end } },
        orderBy: { createdAt: "asc" },
        select: {
          learned: true,
          good: true,
          next: true,
          mood: true,
          createdAt: true,
        },
      }),
    ]);

    const attended = [
      ...new Set(attendances.map((a) => jstDateString(a.session.date))),
    ];

    // 日付(JST) -> その日のリフレクション一覧
    const reflectionsByDate: Record<
      string,
      { learned: string; good: string | null; next: string | null; mood: number | null }[]
    > = {};
    for (const r of reflections) {
      const key = jstDateString(r.createdAt);
      (reflectionsByDate[key] ??= []).push({
        learned: r.learned,
        good: r.good,
        next: r.next,
        mood: r.mood,
      });
    }

    return NextResponse.json({ year, month, attended, reflectionsByDate });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "カレンダーの取得に失敗しました" },
      { status: 500 }
    );
  }
}
