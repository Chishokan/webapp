import {
  REPORT_SUBJECTS,
  REPORT_TERMS,
  EXAM_SUBJECTS,
  EXAM_TERMS,
  MOCK_TERMS,
  MOCK_SUBJECTS,
  average,
  sum,
} from "@/lib/karte";

type ReportCard = { term: string; subject: string; grade: number };
type ExamScore = { term: string; subject: string; score: number };
type MockTest = {
  term: string;
  japanese: number | null;
  math: number | null;
  english: number | null;
  science: number | null;
  social: number | null;
  fiveSubjectDev: number | null;
};

// 科目の短縮表示（横並びヘッダ用）
const REPORT_SHORT = ["国", "数", "英", "理", "社", "美", "音", "保", "技", "家"];
const EXAM_SHORT = ["国", "数", "英", "理", "社"];
const MOCK_SHORT = ["国", "数", "英", "理", "社"];

const th =
  "border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 whitespace-nowrap";
const tdLabel =
  "border border-gray-200 bg-gray-50 px-2 py-1 text-left text-xs text-gray-600 whitespace-nowrap";
const td = "border border-gray-200 px-2 py-1 text-center text-sm text-gray-800";

// 通知表（行=時期 / 列=10教科 + 平均）
export function ReportCardTable({ data }: { data: ReportCard[] }) {
  const map = new Map(data.map((d) => [`${d.term}|${d.subject}`, d.grade]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>時期</th>
            {REPORT_SHORT.map((s) => (
              <th key={s} className={th}>
                {s}
              </th>
            ))}
            <th className={th}>平均</th>
          </tr>
        </thead>
        <tbody>
          {REPORT_TERMS.map((t) => {
            const vals = REPORT_SUBJECTS.map((s) => map.get(`${t.key}|${s}`)).filter(
              (v): v is number => typeof v === "number"
            );
            return (
              <tr key={t.key}>
                <td className={tdLabel}>{t.label}</td>
                {REPORT_SUBJECTS.map((s) => (
                  <td key={s} className={td}>
                    {map.get(`${t.key}|${s}`) ?? ""}
                  </td>
                ))}
                <td className={`${td} bg-brand-50 font-medium`}>
                  {average(vals) ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 定期試験（行=時期 / 列=5教科 + 合計）
export function ExamTable({ data }: { data: ExamScore[] }) {
  const map = new Map(data.map((d) => [`${d.term}|${d.subject}`, d.score]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>時期</th>
            {EXAM_SHORT.map((s) => (
              <th key={s} className={th}>
                {s}
              </th>
            ))}
            <th className={th}>合計</th>
          </tr>
        </thead>
        <tbody>
          {EXAM_TERMS.map((t) => {
            const vals = EXAM_SUBJECTS.map((s) => map.get(`${t.key}|${s}`)).filter(
              (v): v is number => typeof v === "number"
            );
            return (
              <tr key={t.key}>
                <td className={tdLabel}>{t.label}</td>
                {EXAM_SUBJECTS.map((s) => (
                  <td key={s} className={td}>
                    {map.get(`${t.key}|${s}`) ?? ""}
                  </td>
                ))}
                <td className={`${td} bg-brand-50 font-medium`}>{sum(vals) ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// 模試（行=時期 / 列=5教科 + 5科偏差値）
export function MockTable({ data }: { data: MockTest[] }) {
  const map = new Map(data.map((d) => [d.term, d]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>時期</th>
            {MOCK_SHORT.map((s) => (
              <th key={s} className={th}>
                {s}
              </th>
            ))}
            <th className={th}>5科偏差</th>
          </tr>
        </thead>
        <tbody>
          {MOCK_TERMS.map((t) => {
            const rec = map.get(t.key);
            return (
              <tr key={t.key}>
                <td className={tdLabel}>{t.label}</td>
                {MOCK_SUBJECTS.map((s) => {
                  const v = rec ? (rec[s.key] as number | null) : null;
                  return (
                    <td key={s.key} className={td}>
                      {v ?? ""}
                    </td>
                  );
                })}
                <td className={`${td} bg-brand-50 font-medium`}>
                  {rec?.fiveSubjectDev ?? ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
