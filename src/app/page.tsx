import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodaySession } from "@/lib/study-session";
import { isAiConfigured } from "@/lib/anthropic";
import { ChatBox } from "@/components/ChatBox";
import { AdvicePanel } from "@/components/AdvicePanel";

function greeting(): string {
  // JST(UTC+9)の時刻で挨拶を切り替える
  const h = new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCHours();
  if (h < 10) return "おはようございます";
  if (h < 18) return "こんにちは";
  return "こんばんは";
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = await getOrCreateTodaySession();

  const [
    attendedToday,
    reflectedToday,
    totalAttendance,
    totalReflections,
    chatHistory,
  ] = await Promise.all([
    prisma.attendance.findUnique({
      where: { userId_sessionId: { userId: user.id, sessionId: today.id } },
    }),
    prisma.reflection.findFirst({
      where: { userId: user.id, sessionId: today.id },
    }),
    prisma.attendance.count({ where: { userId: user.id } }),
    prisma.reflection.count({ where: { userId: user.id } }),
    prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 30,
    }),
  ]);

  const aiEnabled = isAiConfigured();

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* メインカラム */}
      <div className="min-w-0 flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {greeting()}、{user.name} さん ☀️
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            <span className="mr-2 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
              {user.grade}
            </span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
              {user.campus}
            </span>
          </p>
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

        {/* ③ AI学習アドバイス（ダッシュボードでも表示） */}
        <AdvicePanel />

        {/* 統計 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-600">{totalAttendance}</p>
            <p className="text-sm text-gray-500">累計出席回数</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-brand-600">{totalReflections}</p>
            <p className="text-sm text-gray-500">リフレクション数</p>
          </div>
        </div>

        {/* 学習履歴への導線 */}
        <Link href="/history" className="card block hover:border-brand-300">
          <h2 className="font-semibold text-gray-800">③ 学習履歴 & AIアドバイス</h2>
          <p className="mt-1 text-sm text-gray-500">
            出席カレンダーやこれまでの記録を振り返り、AIから学習アドバイスをもらいましょう。
          </p>
        </Link>
      </div>

      {/* AIチャット（右端の縦長カラム / スマホイメージ） */}
      <aside className="w-full lg:w-[360px] lg:flex-shrink-0">
        <div className="lg:sticky lg:top-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">④ AIチャット</h2>
            <Link href="/chat" className="text-sm text-brand-600 hover:underline">
              全画面で開く →
            </Link>
          </div>
          {aiEnabled ? (
            <ChatBox
              initialMessages={chatHistory.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              }))}
              heightClass="h-[600px] lg:h-[calc(100vh-7rem)]"
            />
          ) : (
            <div className="card text-sm text-gray-500">
              AIチャットを利用するには、環境変数{" "}
              <code className="rounded bg-gray-100 px-1">ANTHROPIC_API_KEY</code>{" "}
              の設定が必要です。
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
