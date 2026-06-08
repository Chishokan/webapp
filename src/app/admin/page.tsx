import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [campuses, byCampus, byGrade, totalActive, recentInterviews] =
    await Promise.all([
      prisma.campus.findMany({ orderBy: { order: "asc" } }),
      prisma.student.groupBy({
        by: ["campusId"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
      prisma.student.groupBy({
        by: ["grade"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
        orderBy: { grade: "asc" },
      }),
      prisma.student.count({ where: { status: "ACTIVE" } }),
      prisma.interview.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          student: {
            include: {
              user: { select: { name: true } },
              campus: { select: { name: true } },
            },
          },
        },
      }),
    ]);

  const campusCount = new Map(byCampus.map((c) => [c.campusId, c._count._all]));

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-600">{totalActive}</p>
          <p className="text-sm text-gray-500">在籍生徒数</p>
        </div>
        <div className="card col-span-2 sm:col-span-3">
          <p className="mb-2 text-sm font-medium text-gray-700">校舎別</p>
          <div className="flex flex-wrap gap-2">
            {campuses.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700"
              >
                {c.name} {campusCount.get(c.id) ?? 0}名
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 学年別 */}
      <div className="card">
        <p className="mb-2 text-sm font-medium text-gray-700">学年別</p>
        {byGrade.length === 0 ? (
          <p className="text-sm text-gray-400">在籍生徒がいません。</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {byGrade.map((g) => (
              <span
                key={String(g.grade)}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
              >
                {g.grade != null ? `中${g.grade}` : "学年未設定"} {g._count._all}名
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 直近の面談記録 */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">直近の面談記録</h2>
          <Link
            href="/admin/students"
            className="text-sm text-brand-600 hover:underline"
          >
            生徒一覧へ →
          </Link>
        </div>
        {recentInterviews.length === 0 ? (
          <p className="text-sm text-gray-400">まだ面談記録がありません。</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentInterviews.map((iv) => (
              <li key={iv.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">
                    {iv.student.user.name}
                    <span className="ml-2 text-xs text-gray-400">
                      {iv.student.campus?.name ?? "校舎未設定"}
                    </span>
                  </span>
                  <span className="text-xs text-gray-400">
                    {iv.date}・{iv.byTeacher}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-gray-600">{iv.memo}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
