import { prisma } from "./prisma";

/** その日の0:00（ローカル）を返す */
function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatTitle(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日のおはよう勉強会`;
}

/** 今日の勉強会セッションを取得（なければ作成する） */
export async function getOrCreateTodaySession() {
  const now = new Date();
  const existing = await prisma.session.findFirst({
    where: {
      date: { gte: startOfDay(now), lte: endOfDay(now) },
    },
  });
  if (existing) return existing;

  return prisma.session.create({
    data: {
      title: formatTitle(now),
      date: startOfDay(now),
      zoomUrl: process.env.NEXT_PUBLIC_ZOOM_URL || null,
    },
  });
}
