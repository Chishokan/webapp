import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CAMPUSES, GRADES } from "@/lib/options";

export default async function ManageReflectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; grade?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const campus = sp.campus?.trim() || "";
  const grade = sp.grade?.trim() || "";
  const date = sp.date?.trim() || "";

  // フィルタ条件の組み立て（所属・学年・日付）
  const where: Prisma.ReflectionWhereInput = {};
  if (campus || grade) {
    const userFilter: Prisma.UserWhereInput = {};
    if (campus) userFilter.campus = campus;
    if (grade) userFilter.grade = grade;
    where.user = userFilter;
  }
  if (date) {
    const start = new Date(`${date}T00:00:00.000+09:00`);
    if (!isNaN(start.getTime())) {
      where.createdAt = {
        gte: start,
        lt: new Date(start.getTime() + 24 * 60 * 60 * 1000),
      };
    }
  }

  const reflections = await prisma.reflection.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { name: true, grade: true, campus: true } },
    },
  });

  const hasFilter = Boolean(campus || grade || date);

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <form
        method="GET"
        className="card flex flex-wrap items-end gap-3"
        action="/manage/reflections"
      >
        <div>
          <label className="label" htmlFor="campus">
            所属
          </label>
          <select
            id="campus"
            name="campus"
            defaultValue={campus}
            className="input"
          >
            <option value="">すべて</option>
            {CAMPUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="grade">
            学年
          </label>
          <select id="grade" name="grade" defaultValue={grade} className="input">
            <option value="">すべて</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">
            日付
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date}
            className="input"
          />
        </div>
        <button type="submit" className="btn-primary">
          絞り込み
        </button>
        {hasFilter && (
          <Link
            href="/manage/reflections"
            className="px-2 py-1.5 text-sm text-gray-500 hover:underline"
          >
            クリア
          </Link>
        )}
      </form>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">
          リフレクション一覧（{reflections.length}件
          {reflections.length === 200 ? "+" : ""}）
        </h2>
      </div>

      {reflections.length === 0 ? (
        <div className="card text-sm text-gray-400">
          {hasFilter
            ? "条件に一致するリフレクションはありません。"
            : "まだリフレクションがありません。"}
        </div>
      ) : (
        <div className="space-y-3">
          {reflections.map((r) => (
            <div key={r.id} className="card">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium text-gray-800">
                    {r.user.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {r.user.grade}・{r.user.campus}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {r.mood != null && (
                    <span className="text-gold-500 text-sm">
                      {"★".repeat(r.mood)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {r.createdAt.toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>

              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">今日学んだこと</dt>
                  <dd className="text-gray-700">{r.learned}</dd>
                </div>
                {r.good && (
                  <div>
                    <dt className="text-xs text-gray-400">よかった点・気づき</dt>
                    <dd className="text-gray-700">{r.good}</dd>
                  </div>
                )}
                {r.next && (
                  <div>
                    <dt className="text-xs text-gray-400">次に向けて</dt>
                    <dd className="text-gray-700">{r.next}</dd>
                  </div>
                )}
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
