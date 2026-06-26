import { prisma } from "@/lib/prisma";
import { ParticipantsManager } from "@/components/manage/ParticipantsManager";

export default async function ManageParticipantsPage() {
  const [enrollments, candidates] = await Promise.all([
    prisma.enrollment.findMany({
      include: {
        user: { select: { id: true, name: true, grade: true, campus: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // 未登録の塾生（参加登録のない STUDENT）
    prisma.user.findMany({
      where: { role: "STUDENT", enrollment: { is: null } },
      select: { id: true, name: true, grade: true, campus: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const enrolled = enrollments.map((e) => ({ ...e.user, source: e.source }));

  return <ParticipantsManager enrolled={enrolled} candidates={candidates} />;
}
