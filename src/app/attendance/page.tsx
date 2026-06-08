import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodaySession } from "@/lib/study-session";
import { AttendanceButton } from "@/components/AttendanceButton";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = await getOrCreateTodaySession();
  const attendance = await prisma.attendance.findUnique({
    where: { userId_sessionId: { userId: user.id, sessionId: today.id } },
  });

  const zoomUrl = today.zoomUrl || process.env.NEXT_PUBLIC_ZOOM_URL || "";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">① 出席する</h1>
        <p className="mt-1 text-gray-500">{today.title}</p>
      </div>

      <AttendanceButton
        zoomUrl={zoomUrl}
        alreadyJoined={Boolean(attendance)}
        joinedAt={attendance?.joinedAt?.toISOString() ?? null}
      />
    </div>
  );
}
