import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdvicePanel } from "@/components/AdvicePanel";
import { CalendarView } from "@/components/CalendarView";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [attendances, reflections] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId: user.id },
      include: { session: true },
      orderBy: { joinedAt: "desc" },
      take: 50,
    }),
    prisma.reflection.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">③ 学習履歴 & AIアドバイス</h1>
        <p className="mt-1 text-gray-500">
          これまでの参加とリフレクションの記録です。
        </p>
      </div>

      <CalendarView />

      <AdvicePanel />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 出席履歴 */}
        <section className="card">
          <h2 className="mb-3 font-semibold text-gray-800">
            出席履歴（{attendances.length}）
          </h2>
          {attendances.length === 0 ? (
            <p className="text-sm text-gray-400">まだ出席記録がありません。</p>
          ) : (
            <ul className="space-y-2">
              {attendances.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-2 text-sm last:border-0"
                >
                  <span className="text-gray-700">{a.session.title}</span>
                  <span className="text-gray-400">
                    {a.joinedAt.toLocaleDateString("ja-JP")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* リフレクション履歴 */}
        <section className="card">
          <h2 className="mb-3 font-semibold text-gray-800">
            リフレクション（{reflections.length}）
          </h2>
          {reflections.length === 0 ? (
            <p className="text-sm text-gray-400">
              まだリフレクションがありません。
            </p>
          ) : (
            <ul className="space-y-3">
              {reflections.map((r) => (
                <li
                  key={r.id}
                  className="border-b border-gray-100 pb-3 text-sm last:border-0"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-gray-400">
                      {r.createdAt.toLocaleDateString("ja-JP")}
                    </span>
                    {r.mood && (
                      <span className="text-gold-500">
                        {"★".repeat(r.mood)}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700">{r.learned}</p>
                  {r.next && (
                    <p className="mt-1 text-xs text-gray-500">
                      次に向けて: {r.next}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
