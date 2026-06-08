import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ReportCardTable,
  ExamTable,
  MockTable,
} from "@/components/admin/GradeTables";
import { StudentEditor } from "@/components/admin/StudentEditor";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}

function ymd(d: Date | null): string {
  if (!d) return "";
  const x = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [student, campuses] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        campus: { select: { name: true } },
        siblings: true,
        reportCards: true,
        exams: true,
        mockTests: true,
      },
    }),
    prisma.campus.findMany({ orderBy: { order: "asc" } }),
  ]);
  if (!student) notFound();

  const initial = {
    id: student.id,
    name: student.user.name,
    kana: student.kana ?? "",
    campusId: student.campusId ?? "",
    grade: student.grade?.toString() ?? "",
    school: student.school ?? "",
    joinedAt: ymd(student.joinedAt),
    aspire: student.aspire ?? "",
    dream: student.dream ?? "",
    club: student.club ?? "",
    clubDays: student.clubDays ?? "",
    lessons: student.lessons ?? "",
    lessonDays: student.lessonDays ?? "",
    subjects: student.subjects,
    eikenLevel: student.eikenLevel ?? "",
    kankenLevel: student.kankenLevel ?? "",
    suikenLevel: student.suikenLevel ?? "",
    guardian: student.guardian ?? "",
    notes: student.notes ?? "",
    reportCards: student.reportCards.map((r) => ({
      term: r.term,
      subject: r.subject,
      grade: r.grade,
    })),
    exams: student.exams.map((e) => ({
      term: e.term,
      subject: e.subject,
      score: e.score,
    })),
    mockTests: student.mockTests.map((m) => ({
      term: m.term,
      japanese: m.japanese,
      math: m.math,
      english: m.english,
      science: m.science,
      social: m.social,
      fiveSubjectDev: m.fiveSubjectDev,
    })),
    siblings: student.siblings.map((sb) => ({
      name: sb.name,
      school: sb.school,
      status: sb.status,
    })),
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/students" className="text-sm text-brand-600 hover:underline">
        ← 生徒一覧へ
      </Link>

      <div className="card">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {student.user.name}
              {student.kana && (
                <span className="ml-2 text-sm text-gray-400">{student.kana}</span>
              )}
            </h2>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">
                {student.campus?.name ?? "校舎未設定"}
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                {student.grade != null ? `中${student.grade}` : "学年未設定"}
              </span>
              {student.status === "WITHDRAWN" && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-600">
                  退塾
                  {student.quitDate
                    ? `（${new Date(student.quitDate).toLocaleDateString("ja-JP")}）`
                    : ""}
                </span>
              )}
            </div>
          </div>
          <StudentEditor initial={initial} campuses={campuses} />
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="学校" value={student.school} />
          <Field label="志望校" value={student.aspire} />
          <Field label="将来の夢" value={student.dream} />
          <Field label="部活動" value={student.club} />
          <Field label="部活実施日" value={student.clubDays} />
          <Field label="習い事" value={student.lessons} />
          <Field
            label="受講科目"
            value={student.subjects.length ? student.subjects.join("・") : null}
          />
          <Field label="英検" value={student.eikenLevel} />
          <Field label="漢検" value={student.kankenLevel} />
          <Field label="数検" value={student.suikenLevel} />
          <Field
            label="入塾日"
            value={
              student.joinedAt
                ? new Date(student.joinedAt).toLocaleDateString("ja-JP")
                : null
            }
          />
        </dl>

        {(student.notes || student.guardian) && (
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            <Field label="特記事項" value={student.notes} />
            <Field label="保護者情報" value={student.guardian} />
          </div>
        )}

        {student.siblings.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-1 text-xs text-gray-400">兄弟生</p>
            <ul className="text-sm text-gray-700">
              {student.siblings.map((sb) => (
                <li key={sb.id}>
                  {sb.name}
                  {sb.school ? `（${sb.school}）` : ""}
                  {sb.status ? ` ${sb.status}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="mb-2 font-semibold text-gray-800">通知表</h3>
        <ReportCardTable data={initial.reportCards} />
      </div>
      <div className="card">
        <h3 className="mb-2 font-semibold text-gray-800">定期試験</h3>
        <ExamTable data={initial.exams} />
      </div>
      <div className="card">
        <h3 className="mb-2 font-semibold text-gray-800">模試</h3>
        <MockTable data={initial.mockTests} />
      </div>

      <div className="card text-sm text-gray-400">
        面談記録・AIアドバイスは次のステップで追加します。
      </div>
    </div>
  );
}
