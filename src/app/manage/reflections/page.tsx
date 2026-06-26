import { prisma } from "@/lib/prisma";

export default async function ManageReflectionsPage() {
  const reflections = await prisma.reflection.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, grade: true, campus: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">
          リフレクション一覧（直近{reflections.length}件）
        </h2>
      </div>

      {reflections.length === 0 ? (
        <div className="card text-sm text-gray-400">
          まだリフレクションがありません。
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
