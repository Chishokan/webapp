import Link from "next/link";
import { ReportCardTable, ExamTable, MockTable } from "./GradeTables";
import { StudentEditor } from "./StudentEditor";
import { WithdrawButton } from "./WithdrawButton";
import { Markdown } from "@/components/Markdown";
import { studentToInitial } from "@/lib/student-form";

type Campus = { id: string; name: string };

type CardStudent = Parameters<typeof studentToInitial>[0] & {
  user: { name: string };
  campus: { name: string } | null;
  grade: number | null;
  status: string;
  quitDate: Date | null;
  aspire: string | null;
  dream: string | null;
  club: string | null;
  lessons: string | null;
  eikenLevel: string | null;
  kankenLevel: string | null;
  suikenLevel: string | null;
  notes: string | null;
  guardian: string | null;
  school: string | null;
  interviews: { id: string; date: string; byTeacher: string; memo: string }[];
  adviceLogs: { id: string; advice: string; createdAt: Date }[];
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value || "—"}</dd>
    </div>
  );
}

export function StudentCard({
  student,
  campuses,
}: {
  student: CardStudent;
  campuses: Campus[];
}) {
  const latestAdvice = student.adviceLogs[0];

  return (
    <div className="card space-y-4">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/admin/students/${student.id}`}
            className="text-lg font-bold text-gray-800 hover:text-brand-600 hover:underline"
          >
            {student.user.name}
          </Link>
          {student.kana && (
            <span className="ml-2 text-xs text-gray-400">{student.kana}</span>
          )}
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
        <div className="flex shrink-0 flex-col gap-2">
          <StudentEditor initial={studentToInitial(student)} campuses={campuses} />
          <WithdrawButton
            studentId={student.id}
            withdrawn={student.status === "WITHDRAWN"}
          />
        </div>
      </div>

      {/* 基本情報 */}
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="学校" value={student.school} />
        <Field label="志望校" value={student.aspire} />
        <Field label="将来の夢" value={student.dream} />
        <Field label="部活動" value={student.club} />
        <Field
          label="受講科目"
          value={student.subjects.length ? student.subjects.join("・") : null}
        />
        <Field label="習い事" value={student.lessons} />
        <Field label="英検" value={student.eikenLevel} />
        <Field label="漢検" value={student.kankenLevel} />
      </dl>

      {/* 成績 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">通知表</p>
          <ReportCardTable data={student.reportCards} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">定期試験</p>
          <ExamTable data={student.exams} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-500">模試</p>
          <MockTable data={student.mockTests} />
        </div>
      </div>

      {/* 面談記録（最新3件・読み取り）/ 最新AIアドバイス */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">面談記録（最新）</p>
            <Link
              href={`/admin/students/${student.id}`}
              className="text-xs text-brand-600 hover:underline"
            >
              追記・全件 →
            </Link>
          </div>
          {student.interviews.length === 0 ? (
            <p className="text-xs text-gray-400">記録なし</p>
          ) : (
            <ul className="space-y-1">
              {student.interviews.map((iv) => (
                <li key={iv.id} className="text-xs text-gray-700">
                  <span className="text-gray-400">{iv.date}</span>{" "}
                  {iv.memo.length > 60 ? iv.memo.slice(0, 60) + "…" : iv.memo}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-purple-50 p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">AI面談アドバイス（最新）</p>
            <Link
              href={`/admin/students/${student.id}`}
              className="text-xs text-purple-600 hover:underline"
            >
              生成・詳細 →
            </Link>
          </div>
          {latestAdvice ? (
            <div className="max-h-40 overflow-y-auto text-xs">
              <Markdown content={latestAdvice.advice} />
            </div>
          ) : (
            <p className="text-xs text-gray-400">未生成</p>
          )}
        </div>
      </div>
    </div>
  );
}
