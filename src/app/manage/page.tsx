import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodaySession } from "@/lib/study-session";

// 要注意生徒の判定しきい値
const LOW_MOOD = 2; // 満足度(平均)がこれ以下
const LOW_ATTENDANCE_RATE = 0.3; // 出席率がこれ未満
const WINDOW_DAYS = 30; // 集計期間（日）

export default async function ManageDashboardPage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const today = await getOrCreateTodaySession();

  // 参加登録済みのユーザーのみを集計対象にする（申込ベース管理）
  const enrollments = await prisma.enrollment.findMany({
    include: {
      user: { select: { id: true, name: true, grade: true, campus: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const students = enrollments.map((e) => e.user);
  const ids = students.map((s) => s.id);

  const [
    todayAttendCount,
    totalAttendance,
    totalReflections,
    moodAgg,
    sessions30,
    attend30,
    mood30,
  ] = await Promise.all([
    prisma.attendance.count({
      where: { sessionId: today.id, userId: { in: ids } },
    }),
    prisma.attendance.count({ where: { userId: { in: ids } } }),
    prisma.reflection.count({ where: { userId: { in: ids } } }),
    prisma.reflection.aggregate({
      where: { mood: { not: null }, userId: { in: ids } },
      _avg: { mood: true },
      _count: { mood: true },
    }),
    prisma.session.count({ where: { date: { gte: since } } }),
    prisma.attendance.groupBy({
      by: ["userId"],
      where: { joinedAt: { gte: since }, userId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.reflection.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since }, mood: { not: null }, userId: { in: ids } },
      _avg: { mood: true },
      _count: { _all: true },
    }),
  ]);

  const attendMap = new Map(attend30.map((a) => [a.userId, a._count._all]));
  const moodMap = new Map(mood30.map((m) => [m.userId, m._avg.mood]));

  const studentCount = students.length;
  const attend30Total = attend30.reduce((s, a) => s + a._count._all, 0);
  const avgAttendRate =
    sessions30 > 0 && studentCount > 0
      ? attend30Total / (sessions30 * studentCount)
      : 0;
  const avgMood = moodAgg._avg.mood;

  // 要注意生徒の抽出（満足度が低い / 出席率が低い）
  const watchList = students
    .map((s) => {
      const att = attendMap.get(s.id) ?? 0;
      const rate = sessions30 > 0 ? att / sessions30 : null;
      const mood = moodMap.get(s.id) ?? null;
      const lowAttendance = rate != null && rate < LOW_ATTENDANCE_RATE;
      const lowMood = mood != null && mood <= LOW_MOOD;
      return { ...s, att, rate, mood, lowAttendance, lowMood };
    })
    .filter((s) => s.lowAttendance || s.lowMood)
    .sort(
      (a, b) =>
        Number(b.lowAttendance) +
        Number(b.lowMood) -
        (Number(a.lowAttendance) + Number(a.lowMood))
    );

  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div className="space-y-6">
      {/* 参加状況・満足度サマリー */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-600">{studentCount}</p>
          <p className="text-sm text-gray-500">参加者数</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-600">
            {todayAttendCount}
            <span className="text-base text-gray-400"> / {studentCount}</span>
          </p>
          <p className="text-sm text-gray-500">本日の出席</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-600">
            {pct(avgAttendRate)}
          </p>
          <p className="text-sm text-gray-500">直近{WINDOW_DAYS}日の出席率</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-600">
            {avgMood != null ? avgMood.toFixed(1) : "—"}
            <span className="text-base text-gray-400"> / 5</span>
          </p>
          <p className="text-sm text-gray-500">
            満足度の平均（{moodAgg._count.mood}件）
          </p>
        </div>
      </div>

      {/* 参加状況の補足 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{totalAttendance}</p>
          <p className="text-sm text-gray-500">累計出席回数</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-700">{totalReflections}</p>
          <p className="text-sm text-gray-500">累計リフレクション数</p>
        </div>
      </div>

      {/* 要注意生徒 */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">
            ⚠️ 要注意生徒（{watchList.length}名）
          </h2>
          <span className="text-xs text-gray-400">
            直近{WINDOW_DAYS}日 / 満足度≤{LOW_MOOD} ・ 出席率＜
            {pct(LOW_ATTENDANCE_RATE)}
          </span>
        </div>

        {watchList.length === 0 ? (
          <p className="text-sm text-gray-400">
            該当する生徒はいません。順調です！
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {watchList.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800">{s.name}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {s.grade}・{s.campus}
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {s.lowMood && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                        満足度低（{s.mood?.toFixed(1)}）
                      </span>
                    )}
                    {s.lowAttendance && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-600">
                        出席率低（{s.rate != null ? pct(s.rate) : "—"}）
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  出席 {s.att} 回 / {sessions30} 回
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link
        href="/manage/reflections"
        className="card block hover:border-brand-300"
      >
        <h2 className="font-semibold text-gray-800">リフレクション一覧 →</h2>
        <p className="mt-1 text-sm text-gray-500">
          生徒のリフレクション（振り返り）を一覧で確認できます。
        </p>
      </Link>
    </div>
  );
}
