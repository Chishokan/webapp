// GAS Students CSV の取り込みロジック（API・CLIスクリプト共用）。
// PrismaClient を引数で受け取り、@ エイリアスに依存しない（tsx からも利用可）。
import {
  type PrismaClient,
  type ReportTerm,
  type ExamTerm,
  type MockTerm,
  type StudentStatus,
} from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const REPORT_SUBJECTS = [
  "国語",
  "数学",
  "英語",
  "理科",
  "社会",
  "美術",
  "音楽",
  "保健体育",
  "技術",
  "家庭科",
];
const EXAM_SUBJECTS = ["国語", "数学", "英語", "理科", "社会"];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") cur += c;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
}

function toInt(v: string): number | null {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function toFloat(v: string): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function toDate(v: string): Date | null {
  if (!v || !v.trim()) return null;
  const d = new Date(v.replace(/\./g, "/"));
  return isNaN(d.getTime()) ? null : d;
}

export type ImportResult = { total: number; created: number; updated: number };

export async function importStudentsFromCsv(
  prisma: PrismaClient,
  csvText: string
): Promise<ImportResult> {
  const rows = csvToObjects(csvText);

  // 校舎マスタを準備
  const campusMap = new Map<string, string>();
  for (const c of await prisma.campus.findMany()) campusMap.set(c.name, c.id);
  async function ensureCampusId(name: string): Promise<string | null> {
    if (!name) return null;
    if (campusMap.has(name)) return campusMap.get(name)!;
    const max = await prisma.campus.aggregate({ _max: { order: true } });
    const c = await prisma.campus.create({
      data: { name, order: (max._max.order ?? 0) + 1 },
    });
    campusMap.set(name, c.id);
    return c.id;
  }

  let created = 0;
  let updated = 0;

  // 既存の取り込み済みID(gas_*)を事前取得（新規/更新の判定用・クエリ削減）
  const existingLoginIds = new Set(
    (
      await prisma.user.findMany({
        where: { loginId: { startsWith: "gas_" } },
        select: { loginId: true },
      })
    ).map((u) => u.loginId)
  );

  for (const r of rows) {
    const name = r["name"];
    if (!name) continue;
    const loginId = `gas_${r["id"] || name}`;
    const grade = toInt(r["grade"]);
    const subjects = (r["subjects"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isWithdrawn = /退/.test(r["status"] || "");
    const campusId = await ensureCampusId(r["campus"] || "");

    const studentData = {
      kana: r["kana"] || null,
      campusId,
      grade,
      school: r["school"] || null,
      joinedAt: toDate(r["joined"]),
      aspire: r["aspire"] || null,
      dream: r["dream"] || null,
      club: r["club"] || null,
      clubDays: r["clubDays"] || null,
      lessons: r["lessons"] || null,
      lessonDays: r["lessonDays"] || null,
      subjects,
      eikenLevel: r["eikenLevel"] || null,
      kankenLevel: r["kankenLevel"] || null,
      suikenLevel: r["suikenLevel"] || null,
      guardian: r["guardian"] || null,
      notes: r["notes"] || null,
      status: (isWithdrawn ? "WITHDRAWN" : "ACTIVE") as StudentStatus,
      quitDate: toDate(r["quitDate"]),
    };

    if (existingLoginIds.has(loginId)) updated++;
    else created++;

    const user = await prisma.user.upsert({
      where: { loginId },
      update: {
        name,
        grade: grade ? `中${grade}` : "-",
        campus: r["campus"] || "-",
      },
      create: {
        loginId,
        name,
        grade: grade ? `中${grade}` : "-",
        campus: r["campus"] || "-",
        passwordHash: await bcrypt.hash(randomBytes(12).toString("hex"), 10),
      },
    });
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: studentData,
      create: { userId: user.id, ...studentData },
    });

    const reportCards: {
      studentId: string;
      term: ReportTerm;
      subject: string;
      grade: number;
    }[] = [];
    const reportCols: [string, ReportTerm][] = [
      ["report_prev", "PREV_T3"],
      ["report_goal", "GOAL_T1"],
      ["report_t1", "T1"],
      ["report_t2", "T2"],
      ["report_t3", "T3"],
    ];
    for (const [col, term] of reportCols) {
      const vals = (r[col] || "").split(",");
      REPORT_SUBJECTS.forEach((subj, i) => {
        const g = toInt(vals[i] ?? "");
        if (g != null && g >= 1 && g <= 5)
          reportCards.push({ studentId: student.id, term, subject: subj, grade: g });
      });
    }

    const exams: {
      studentId: string;
      term: ExamTerm;
      subject: string;
      score: number;
    }[] = [];
    const examCols: [string, ExamTerm][] = [
      ["exam_prev", "PREV_T3"],
      ["exam_t1", "T1"],
      ["exam_t2", "T2"],
      ["exam_t3", "T3"],
      ["exam_goal", "GOAL"],
    ];
    for (const [col, term] of examCols) {
      const vals = (r[col] || "").split(",");
      EXAM_SUBJECTS.forEach((subj, i) => {
        const sc = toInt(vals[i] ?? "");
        if (sc != null)
          exams.push({ studentId: student.id, term, subject: subj, score: sc });
      });
    }

    const mocks: {
      studentId: string;
      term: MockTerm;
      japanese: number | null;
      math: number | null;
      english: number | null;
      science: number | null;
      social: number | null;
      fiveSubjectDev: number | null;
    }[] = [];
    const mockCols: [string, MockTerm][] = [
      ["mock_apr", "APR"],
      ["mock_jul", "JUL"],
      ["mock_aug", "AUG"],
      ["mock_oct", "OCT"],
      ["mock_jan", "JAN"],
    ];
    for (const [col, term] of mockCols) {
      const v = (r[col] || "").split(",");
      const rec = {
        studentId: student.id,
        term,
        japanese: toFloat(v[0] ?? ""),
        math: toFloat(v[1] ?? ""),
        english: toFloat(v[2] ?? ""),
        science: toFloat(v[3] ?? ""),
        social: toFloat(v[4] ?? ""),
        fiveSubjectDev: toFloat(v[5] ?? ""),
      };
      if (
        rec.japanese != null ||
        rec.math != null ||
        rec.english != null ||
        rec.science != null ||
        rec.social != null ||
        rec.fiveSubjectDev != null
      )
        mocks.push(rec);
    }

    const siblings = [r["sibling1"], r["sibling2"], r["sibling3"]]
      .filter((s) => s && s.trim() !== "")
      .map((s) => ({ studentId: student.id, name: s }));

    await prisma.$transaction([
      prisma.reportCard.deleteMany({ where: { studentId: student.id } }),
      prisma.examScore.deleteMany({ where: { studentId: student.id } }),
      prisma.mockTest.deleteMany({ where: { studentId: student.id } }),
      prisma.sibling.deleteMany({ where: { studentId: student.id } }),
      prisma.reportCard.createMany({ data: reportCards }),
      prisma.examScore.createMany({ data: exams }),
      prisma.mockTest.createMany({ data: mocks }),
      prisma.sibling.createMany({ data: siblings }),
    ]);
  }

  return { total: created + updated, created, updated };
}
