import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodaySession } from "@/lib/study-session";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = await getOrCreateTodaySession();

  const [attendedToday, reflectedToday, totalAttendance, totalReflections] =
    await Promise.all([
      prisma.attendance.findUnique({
        where: { userId_sessionId: { userId: user.id, sessionId: today.id } },
      }),
      prisma.reflection.findFirst({
        where: { userId: user.id, sessionId: today.id },
      }),
      prisma.attendance.count({ where: { userId: user.id } }),
      prisma.reflection.count({ where: { userId: user.id } }),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {greeting()}、{user.name} さん ☀️
        </h1>
        <p className="mt-1 text-gray-500">{today.title}</p>
      </div>

      {/* 今日のアクション */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">① 今日の出席</h2>
            {attendedToday ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                出席済み
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                未出席
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Zoomに参加して出席を記録しましょう。
          </p>
          <Link href="/attendance" className="btn-primary w-full">
            {attendedToday ? "出席ページへ" : "出席する"}
          </Link>
        </div>

        <div className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">② リフレクション</h2>
            {reflectedToday ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                記録済み
              </span>
            ) : (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                未記録
              </span>
            )}
          </div>
          <p className="mb-4 text-sm text-gray-500">
            今日の学びを振り返って記録しましょう。
          </p>
          <Link href="/reflection" className="btn-secondary w-full">
            リフレクションを書く
          </Link>
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-morning-600">
            {totalAttendance}
          </p>
          <p className="text-sm text-gray-500">累計出席回数</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-morning-600">
            {totalReflections}
          </p>
          <p className="text-sm text-gray-500">リフレクション数</p>
        </div>
      </div>

      {/* 他機能への導線 */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/history" className="card hover:border-morning-300">
          <h2 className="font-semibold text-gray-800">③ 学習履歴 & AIアドバイス</h2>
          <p className="mt-1 text-sm text-gray-500">
            これまでの記録を振り返り、AIから学習アドバイスをもらいましょう。
          </p>
        </Link>
        <Link href="/chat" className="card hover:border-morning-300">
          <h2 className="font-semibold text-gray-800">④ AIチャット</h2>
          <p className="mt-1 text-sm text-gray-500">
            勉強の質問や相談をAIにいつでも気軽に。
          </p>
        </Link>
      </div>
    </div>
  );
}
