import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StudentFilterBar } from "@/components/admin/StudentFilterBar";

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
        <ul className="space-y-3">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/students/${s.id}`}
                className="card block hover:border-brand-300"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-semibold text-gray-800">
                      {s.user.name}
                    </span>
                    {s.kana && (
                      <span className="ml-2 text-xs text-gray-400">{s.kana}</span>
                    )}
                    {s.status === "WITHDRAWN" && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                        退塾
                        {s.quitDate
                          ? `（${new Date(s.quitDate).toLocaleDateString("ja-JP")}）`
                          : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-brand-600">→</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                    {s.campus?.name ?? "校舎未設定"}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5">
                    {s.grade != null ? `中${s.grade}` : "学年未設定"}
                  </span>
                  {s.school && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5">
                      {s.school}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
