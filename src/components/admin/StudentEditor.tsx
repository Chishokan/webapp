"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REPORT_SUBJECTS,
  REPORT_TERMS,
  EXAM_SUBJECTS,
  EXAM_TERMS,
  MOCK_TERMS,
  MOCK_SUBJECTS,
  SUBJECT_OPTIONS,
} from "@/lib/karte";
import type { StudentEditorInitial } from "@/lib/student-form";

type Campus = { id: string; name: string };

export type StudentInitial = StudentEditorInitial;

const inputCell =
  "w-14 rounded border border-gray-200 px-1 py-0.5 text-center text-sm outline-none focus:border-brand-400";
const thc = "border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600 whitespace-nowrap";
const tdc = "border border-gray-200 px-1 py-1 text-center";

export function StudentEditor({
  initial,
  campuses,
}: {
  initial: StudentInitial;
  campuses: Campus[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary">
        ✏️ 編集
      </button>
      {open && (
        <EditModal
          initial={initial}
          campuses={campuses}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function EditModal({
  initial,
  campuses,
  onClose,
}: {
  initial: StudentInitial;
  campuses: Campus[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [basic, setBasic] = useState({
    name: initial.name,
    kana: initial.kana,
    campusId: initial.campusId,
    grade: initial.grade,
    school: initial.school,
    joinedAt: initial.joinedAt,
    aspire: initial.aspire,
    dream: initial.dream,
    club: initial.club,
    clubDays: initial.clubDays,
    lessons: initial.lessons,
    lessonDays: initial.lessonDays,
    eikenLevel: initial.eikenLevel,
    kankenLevel: initial.kankenLevel,
    suikenLevel: initial.suikenLevel,
    guardian: initial.guardian,
    notes: initial.notes,
  });
  const [subjects, setSubjects] = useState<string[]>(initial.subjects);

  const [report, setReport] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    initial.reportCards.forEach((r) => (m[`${r.term}|${r.subject}`] = String(r.grade)));
    return m;
  });
  const [exam, setExam] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    initial.exams.forEach((e) => (m[`${e.term}|${e.subject}`] = String(e.score)));
    return m;
  });
  const [mock, setMock] = useState<Record<string, Record<string, string>>>(() => {
    const m: Record<string, Record<string, string>> = {};
    initial.mockTests.forEach((t) => {
      m[t.term] = {
        japanese: t.japanese?.toString() ?? "",
        math: t.math?.toString() ?? "",
        english: t.english?.toString() ?? "",
        science: t.science?.toString() ?? "",
        social: t.social?.toString() ?? "",
        fiveSubjectDev: t.fiveSubjectDev?.toString() ?? "",
      };
    });
    return m;
  });
  const [siblings, setSiblings] = useState(
    initial.siblings.map((sb) => ({
      name: sb.name,
      school: sb.school ?? "",
      status: sb.status ?? "",
    }))
  );

  function setB(k: keyof typeof basic, v: string) {
    setBasic((p) => ({ ...p, [k]: v }));
  }
  function toggleSubject(s: string) {
    setSubjects((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  }
  function setMockCell(term: string, key: string, v: string) {
    setMock((p) => ({ ...p, [term]: { ...(p[term] ?? {}), [key]: v } }));
  }

  async function onSave() {
    if (!basic.name.trim() || !basic.campusId) {
      setError("名前と校舎は必須です");
      return;
    }
    setLoading(true);
    setError(null);

    const reportCards = Object.entries(report)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => {
        const [term, subject] = k.split("|");
        return { term, subject, grade: Number(v) };
      });
    const exams = Object.entries(exam)
      .filter(([, v]) => v !== "")
      .map(([k, v]) => {
        const [term, subject] = k.split("|");
        return { term, subject, score: Number(v) };
      });
    const mockTests = Object.entries(mock)
      .map(([term, cells]) => {
        const toNum = (x: string) => (x === "" ? null : Number(x));
        const obj = {
          term,
          japanese: toNum(cells.japanese ?? ""),
          math: toNum(cells.math ?? ""),
          english: toNum(cells.english ?? ""),
          science: toNum(cells.science ?? ""),
          social: toNum(cells.social ?? ""),
          fiveSubjectDev: toNum(cells.fiveSubjectDev ?? ""),
        };
        const hasValue = Object.entries(obj).some(
          ([k, v]) => k !== "term" && v != null
        );
        return hasValue ? obj : null;
      })
      .filter(Boolean);

    const payload = {
      ...basic,
      grade: basic.grade || null,
      subjects,
      reportCards,
      exams,
      mockTests,
      siblings: siblings.filter((s) => s.name.trim() !== ""),
    };

    const res = await fetch(`/api/admin/students/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onClose();
      router.refresh();
    } else {
      setError(data.error ?? "保存に失敗しました");
      setLoading(false);
    }
  }

  const field = (label: string, k: keyof typeof basic, required = false) => (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        className={`input ${required && !basic[k] ? "border-red-300 bg-red-50" : ""}`}
        value={basic[k]}
        onChange={(e) => setB(k, e.target.value)}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <h3 className="font-bold text-gray-800">生徒情報の編集</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        {/* 本体 */}
        <div className="space-y-5 overflow-y-auto p-4">
          {/* 基本情報 */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {field("名前", "name", true)}
            {field("フリガナ", "kana")}
            <div>
              <label className="label">
                校舎<span className="text-red-500"> *</span>
              </label>
              <select
                className={`input ${!basic.campusId ? "border-red-300 bg-red-50" : ""}`}
                value={basic.campusId}
                onChange={(e) => setB("campusId", e.target.value)}
              >
                <option value="">選択</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">学年</label>
              <select
                className="input"
                value={basic.grade}
                onChange={(e) => setB("grade", e.target.value)}
              >
                <option value="">未設定</option>
                <option value="1">中1</option>
                <option value="2">中2</option>
                <option value="3">中3</option>
              </select>
            </div>
            {field("学校", "school")}
            <div>
              <label className="label">入塾日</label>
              <input
                type="date"
                className="input"
                value={basic.joinedAt}
                onChange={(e) => setB("joinedAt", e.target.value)}
              />
            </div>
            {field("志望校", "aspire")}
            {field("将来の夢", "dream")}
            {field("部活動", "club")}
            {field("部活実施日", "clubDays")}
            {field("習い事", "lessons")}
            {field("習い事の日", "lessonDays")}
            {field("英検", "eikenLevel")}
            {field("漢検", "kankenLevel")}
            {field("数検", "suikenLevel")}
          </section>

          {/* 受講科目 */}
          <section>
            <label className="label">受講科目</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSubject(s)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    subjects.includes(s)
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* 通知表 */}
          <section>
            <h4 className="mb-1 text-sm font-semibold text-gray-700">通知表（1〜5）</h4>
            <div className="overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className={thc}>教科</th>
                    {REPORT_TERMS.map((t) => (
                      <th key={t.key} className={thc}>
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REPORT_SUBJECTS.map((subj) => (
                    <tr key={subj}>
                      <td className={`${tdc} bg-gray-50 text-xs`}>{subj}</td>
                      {REPORT_TERMS.map((t) => {
                        const key = `${t.key}|${subj}`;
                        return (
                          <td key={t.key} className={tdc}>
                            <input
                              className={inputCell}
                              value={report[key] ?? ""}
                              onChange={(e) =>
                                setReport((p) => ({ ...p, [key]: e.target.value }))
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 定期試験 */}
          <section>
            <h4 className="mb-1 text-sm font-semibold text-gray-700">定期試験（点数）</h4>
            <div className="overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className={thc}>教科</th>
                    {EXAM_TERMS.map((t) => (
                      <th key={t.key} className={thc}>
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXAM_SUBJECTS.map((subj) => (
                    <tr key={subj}>
                      <td className={`${tdc} bg-gray-50 text-xs`}>{subj}</td>
                      {EXAM_TERMS.map((t) => {
                        const key = `${t.key}|${subj}`;
                        return (
                          <td key={t.key} className={tdc}>
                            <input
                              className={inputCell}
                              value={exam[key] ?? ""}
                              onChange={(e) =>
                                setExam((p) => ({ ...p, [key]: e.target.value }))
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 模試 */}
          <section>
            <h4 className="mb-1 text-sm font-semibold text-gray-700">模試</h4>
            <div className="overflow-x-auto">
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className={thc}>教科</th>
                    {MOCK_TERMS.map((t) => (
                      <th key={t.key} className={thc}>
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_SUBJECTS.map((subj) => (
                    <tr key={subj.key}>
                      <td className={`${tdc} bg-gray-50 text-xs`}>{subj.label}</td>
                      {MOCK_TERMS.map((t) => (
                        <td key={t.key} className={tdc}>
                          <input
                            className={inputCell}
                            value={mock[t.key]?.[subj.key] ?? ""}
                            onChange={(e) =>
                              setMockCell(t.key, subj.key, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <td className={`${tdc} bg-brand-50 text-xs font-medium`}>
                      5科偏差値
                    </td>
                    {MOCK_TERMS.map((t) => (
                      <td key={t.key} className={tdc}>
                        <input
                          className={inputCell}
                          value={mock[t.key]?.fiveSubjectDev ?? ""}
                          onChange={(e) =>
                            setMockCell(t.key, "fiveSubjectDev", e.target.value)
                          }
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 兄弟生 */}
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">兄弟生</h4>
              <button
                type="button"
                onClick={() =>
                  setSiblings((p) => [...p, { name: "", school: "", status: "" }])
                }
                className="text-sm text-brand-600 hover:underline"
              >
                ＋追加
              </button>
            </div>
            <div className="space-y-2">
              {siblings.map((sb, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input"
                    placeholder="名前"
                    value={sb.name}
                    onChange={(e) =>
                      setSiblings((p) =>
                        p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                      )
                    }
                  />
                  <input
                    className="input"
                    placeholder="学校"
                    value={sb.school}
                    onChange={(e) =>
                      setSiblings((p) =>
                        p.map((x, j) => (j === i ? { ...x, school: e.target.value } : x))
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setSiblings((p) => p.filter((_, j) => j !== i))}
                    className="px-2 text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* 特記・保護者 */}
          <section className="space-y-3">
            <div>
              <label className="label">特記事項</label>
              <textarea
                className="input min-h-[60px]"
                value={basic.notes}
                onChange={(e) => setB("notes", e.target.value)}
              />
            </div>
            <div>
              <label className="label">保護者情報</label>
              <textarea
                className="input min-h-[60px]"
                value={basic.guardian}
                onChange={(e) => setB("guardian", e.target.value)}
              />
            </div>
          </section>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
          <button onClick={onClose} className="btn-secondary">
            キャンセル
          </button>
          <button onClick={onSave} className="btn-primary" disabled={loading}>
            {loading ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
