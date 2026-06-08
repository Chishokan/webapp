/**
 * GASスプレッドシート → PostgreSQL データ移行（1回限りのバッチ）
 *
 * 使い方:
 *   1. 各シートを CSV でエクスポートし scripts/gas-export/ に配置:
 *        - students.csv   (Students シート / 1行1生徒)  ← 実装済み
 *        - interviews.csv (Interviews シート)            ← CSV受領後に対応
 *        - advice.csv     (Advice シート)                ← CSV受領後に対応
 *        - config.csv     (Config シート / 許可ユーザー)  ← 実装済み
 *   2. DATABASE_URL / DIRECT_URL を設定して実行:
 *        npx tsx scripts/import-from-gas.ts --dry-run  # 解析のみ
 *        npx tsx scripts/import-from-gas.ts            # 取り込み実行
 *
 *   ※ students.csv は loginId="gas_<元id>" で冪等。再実行で更新されます。
 *   ※ CSVには個人情報が含まれるためリポジトリにコミットしないこと(.gitignore済)。
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  PrismaClient,
  type ReportTerm,
  type ExamTerm,
  type MockTerm,
  type StudentStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const DIR = join(process.cwd(), "scripts", "gas-export");

// 通知表10教科（CSVの並び順）/ 定期5教科
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

// --- 最小CSVパーサ（ダブルクオート対応） ---
function parseCsv(text: string): string[][] {
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

function loadSheet(file: string): Record<string, string>[] {
  const path = join(DIR, file);
  if (!existsSync(path)) {
    console.warn(`(skip) ${file} が見つかりません`);
    return [];
  }
  const rows = parseCsv(readFileSync(path, "utf8"));
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
  if (v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function toDate(v: string): Date | null {
  if (!v.trim()) return null;
  const d = new Date(v.replace(/\./g, "/"));
  return isNaN(d.getTime()) ? null : d;
}

const campusCache = new Map<string, string>();
async function ensureCampusId(name: string): Promise<string | null> {
  if (!name) return null;
  if (campusCache.has(name)) return campusCache.get(name)!;
  let c = await prisma.campus.findUnique({ where: { name } });
  if (!c) {
    const max = await prisma.campus.aggregate({ _max: { order: true } });
    c = await prisma.campus.create({
      data: { name, order: (max._max.order ?? 0) + 1 },
    });
  }
  campusCache.set(name, c.id);
  return c.id;
}

async function importStudents() {
  const rows = loadSheet("students.csv");
  console.log(`Students: ${rows.length}行`);
  let n = 0;

  for (const r of rows) {
    const name = r["name"];
    if (!name) continue;
    const gasId = r["id"] || `${n}`;
    const loginId = `gas_${gasId}`;
    const grade = toInt(r["grade"]);
    const subjects = (r["subjects"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const isWithdrawn = /退/.test(r["status"] || "");

    if (DRY_RUN) {
      console.log(
        `  - [${gasId}] ${name} / ${r["campus"]} / 中${grade ?? "?"} / 科目:${subjects.join("")}${isWithdrawn ? " (退塾)" : ""}`
      );
      n++;
      continue;
    }

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

    const user = await prisma.user.upsert({
      where: { loginId },
      update: { name, grade: grade ? `中${grade}` : "-", campus: r["campus"] || "-" },
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

    // --- 成績(通知表/定期試験/模試)・兄弟生を再構築 ---
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
        if (sc != null) exams.push({ studentId: student.id, term, subject: subj, score: sc });
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
    n++;
  }
  console.log(`  → ${n}名を処理`);
}

async function importConfig() {
  const rows = loadSheet("config.csv");
  if (rows.length === 0) return;
  console.log(`Config(職員): ${rows.length}行`);
  for (const r of rows) {
    const email = r["メール"] || r["email"] || Object.values(r)[0];
    if (!email || !email.includes("@")) continue;
    if (DRY_RUN) {
      console.log(`  - teacher: ${email}`);
      continue;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;
    await prisma.user.create({
      data: {
        loginId: `t_${randomBytes(4).toString("hex")}`,
        email,
        name: email.split("@")[0],
        grade: "-",
        campus: "-",
        role: "TEACHER",
        passwordHash: await bcrypt.hash(randomBytes(12).toString("hex"), 10),
        teacherProfile: { create: {} },
      },
    });
  }
}

// interviews.csv / advice.csv はCSV受領後に対応（生徒名→Student.id の突合が必要）
async function importInterviews() {
  const rows = loadSheet("interviews.csv");
  if (rows.length) console.log(`Interviews: ${rows.length}行 (未対応: CSV構造確認後に実装)`);
}
async function importAdvice() {
  const rows = loadSheet("advice.csv");
  if (rows.length) console.log(`Advice: ${rows.length}行 (未対応: CSV構造確認後に実装)`);
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN（書き込みなし）===" : "=== 取り込み実行 ===");
  await importConfig();
  await importStudents();
  await importInterviews();
  await importAdvice();
  console.log("完了。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
