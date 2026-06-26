import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { getOrCreateTodaySession } from "@/lib/study-session";
import { isEnrolled } from "@/lib/enrollment";

// 今日の出席を記録する（①Zoomへの出席）
export async function POST() {
  try {
    const userId = await requireUserId();
    if (!(await isEnrolled(userId))) {
      return NextResponse.json(
        { error: "おはよう勉強会への参加申込が必要です。" },
        { status: 403 }
      );
    }
    const session = await getOrCreateTodaySession();

    const attendance = await prisma.attendance.upsert({
      where: { userId_sessionId: { userId, sessionId: session.id } },
      create: { userId, sessionId: session.id },
      update: {},
    });

    return NextResponse.json({
      ok: true,
      attendance: { id: attendance.id, joinedAt: attendance.joinedAt },
      session: { id: session.id, title: session.title },
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "出席の記録に失敗しました" },
      { status: 500 }
    );
  }
}
