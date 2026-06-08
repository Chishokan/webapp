import { prisma } from "./prisma";
import { ZOOM_URL } from "./config";
import { jstYmd, jstStartOfDay } from "./date";

/** 今日(JST)の勉強会セッションを取得（なければ作成する） */
export async function getOrCreateTodaySession() {
  const { y, m, d } = jstYmd(new Date());
  const start = jstStartOfDay(y, m, d);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);

  const existing = await prisma.session.findFirst({
    where: { date: { gte: start, lte: end } },
  });
  if (existing) return existing;

  return prisma.session.create({
    data: {
      title: `${m}月${d}日のおはよう勉強会`,
      date: start,
      zoomUrl: ZOOM_URL,
    },
  });
}
