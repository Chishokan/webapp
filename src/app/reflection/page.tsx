import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodaySession } from "@/lib/study-session";
import { ReflectionForm } from "@/components/ReflectionForm";

export default async function ReflectionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = await getOrCreateTodaySession();
  const existing = await prisma.reflection.findMany({
    where: { userId: user.id, sessionId: today.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">② リフレクション</h1>
        <p className="mt-1 text-gray-500">{today.title} の振り返り</p>
      </div>

      {existing.length > 0 && (
        <div className="card bg-green-50">
          <p className="text-sm font-medium text-green-700">
            ✅ 今日のリフレクションは記録済みです（{existing.length}件）。追記もできます。
          </p>
        </div>
      )}

      <ReflectionForm />
    </div>
  );
}
