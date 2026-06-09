import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StudentFilterBar } from "@/components/admin/StudentFilterBar";
import { StudentCard } from "@/components/admin/StudentCard";

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string;
    grade?: string;
    name?: string;
    includeQuit?: string;
  }>;
}) {
  const sp = await searchParams;
  const campusId = sp.campus || undefined;
  const grade = sp.grade ? Number(sp.grade) : undefined;
  const name = sp.name?.trim() || undefined;
  const includeQuit = sp.includeQuit === "true";

  const campuses = await prisma.campus.findMany({ orderBy: { order: "asc" } });

  const where: Prisma.StudentWhereInput = {
    campusId,
    grade,
    ...(includeQuit || name ? {} : { status: "ACTIVE" }),
    ...(name
      ? {
          OR: [
            { user: { is: { name: { contains: name, mode: "insensitive" } } } },
            { kana: { contains: name, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const students = await prisma.student.findMany({
    where,
    include: {
      user: { select: { name: true } },
      campus: { select: { name: true } },
      siblings: true,
      reportCards: true,
      exams: true,
      mockTests: true,
      interviews: { orderBy: { createdAt: "desc" }, take: 3 },
      adviceLogs: {
        where: { source: "TEACHER_PANEL" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ grade: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-4">
      <StudentFilterBar
        campuses={campuses}
        current={{
          campus: campusId ?? "",
          grade: sp.grade ?? "",
          name: sp.name ?? "",
          includeQuit,
        }}
      />

      <p className="text-sm text-gray-500">{students.length}名</p>

      {students.length === 0 ? (
        <div className="card text-sm text-gray-400">
          該当する生徒がいません。「＋新規追加」から登録できます。
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} campuses={campuses} />
          ))}
        </div>
      )}
    </div>
  );
}
