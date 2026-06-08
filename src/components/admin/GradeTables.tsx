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

const th = "border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 whitespace-nowrap";
const td = "border border-gray-200 px-2 py-1 text-center text-sm text-gray-800";

export function ReportCardTable({ data }: { data: ReportCard[] }) {
  const map = new Map(data.map((d) => [`${d.term}|${d.subject}`, d.grade]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>教科</th>
            {REPORT_TERMS.map((t) => (
              <th key={t.key} className={th}>
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REPORT_SUBJECTS.map((subj) => (
            <tr key={subj}>
              <td className={`${td} bg-gray-50 text-left`}>{subj}</td>
              {REPORT_TERMS.map((t) => (
                <td key={t.key} className={td}>
                  {map.get(`${t.key}|${subj}`) ?? ""}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className={`${td} bg-brand-50 text-left font-medium`}>平均</td>
            {REPORT_TERMS.map((t) => {
              const vals = REPORT_SUBJECTS.map((s) => map.get(`${t.key}|${s}`)).filter(
                (v): v is number => typeof v === "number"
              );
              return (
                <td key={t.key} className={`${td} bg-brand-50 font-medium`}>
                  {average(vals) ?? ""}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function ExamTable({ data }: { data: ExamScore[] }) {
  const map = new Map(data.map((d) => [`${d.term}|${d.subject}`, d.score]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>教科</th>
            {EXAM_TERMS.map((t) => (
              <th key={t.key} className={th}>
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EXAM_SUBJECTS.map((subj) => (
            <tr key={subj}>
              <td className={`${td} bg-gray-50 text-left`}>{subj}</td>
              {EXAM_TERMS.map((t) => (
                <td key={t.key} className={td}>
                  {map.get(`${t.key}|${subj}`) ?? ""}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className={`${td} bg-brand-50 text-left font-medium`}>合計</td>
            {EXAM_TERMS.map((t) => {
              const vals = EXAM_SUBJECTS.map((s) => map.get(`${t.key}|${s}`)).filter(
                (v): v is number => typeof v === "number"
              );
              return (
                <td key={t.key} className={`${td} bg-brand-50 font-medium`}>
                  {sum(vals) ?? ""}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function MockTable({ data }: { data: MockTest[] }) {
  const map = new Map(data.map((d) => [d.term, d]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>教科</th>
            {MOCK_TERMS.map((t) => (
              <th key={t.key} className={th}>
                {t.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_SUBJECTS.map((subj) => (
            <tr key={subj.key}>
              <td className={`${td} bg-gray-50 text-left`}>{subj.label}</td>
              {MOCK_TERMS.map((t) => {
                const rec = map.get(t.key);
                const v = rec ? (rec[subj.key] as number | null) : null;
                return (
                  <td key={t.key} className={td}>
                    {v ?? ""}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td className={`${td} bg-brand-50 text-left font-medium`}>5科偏差値</td>
            {MOCK_TERMS.map((t) => {
              const rec = map.get(t.key);
              return (
                <td key={t.key} className={`${td} bg-brand-50 font-medium`}>
                  {rec?.fiveSubjectDev ?? ""}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
