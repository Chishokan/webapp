/**
 * GASスプレッドシート → PostgreSQL データ移行（1回限りのバッチ）
 *
 * 使い方:
 *   1. GAS版スプレッドシートの各シートを CSV でエクスポートし、scripts/gas-export/ に配置:
 *        - students.csv   (Students シート / 1行1生徒)
 *        - interviews.csv (Interviews シート)
 *        - advice.csv     (Advice シート)
 *        - config.csv     (Config シート / 許可ユーザー)
 *   2. DATABASE_URL / DIRECT_URL を設定して実行:
 *        npx tsx scripts/import-from-gas.ts            # 取り込み実行
 *        npx tsx scripts/import-from-gas.ts --dry-run  # 解析のみ(DB書き込みなし)
 *
 * 注意:
 *   - 列の対応(ヘッダ名)は GAS版の実データに合わせて MAP 定義を調整してください。
 *   - 成績のカンマ区切りパースは GAS版のセル仕様に依存します。実データで要検証。
 *   - 既存ユーザーとの突合: students.csv に email 列があればメール一致で既存 User に Student を付与。
 *     なければ新規 User+Student を作成します。
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const DIR = join(process.cwd(), "scripts", "gas-export");

// --- 最小CSVパーサ（ダブルクオート対応） ---
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c === "\r") {
      // skip
    } else cur += c;
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
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (r[i] ?? "").trim()));
    return obj;
  });
}

// ===== 列マッピング（実データのヘッダ名に合わせて調整してください）=====
const COL = {
  name: "名前",
  kana: "フリガナ",
  campus: "校舎",
  grade: "学年",
  school: "学校",
  email: "メール", // 無ければ突合は名前ベースになる
  aspire: "志望校",
  dream: "将来の夢",
  club: "部活",
  school_status: "在籍状況",
};

async function ensureCampus(name: string) {
  if (!name) return null;
  const existing = await prisma.campus.findUnique({ where: { name } });
  if (existing) return existing;
  if (DRY_RUN) return { id: "(dry)", name, order: 99 };
  const max = await prisma.campus.aggregate({ _max: { order: true } });
  return prisma.campus.create({
    data: { name, order: (max._max.order ?? 0) + 1 },
  });
}

async function importStudents() {
  const rows = loadSheet("students.csv");
  console.log(`Students: ${rows.length}行`);
  for (const r of rows) {
    const name = r[COL.name];
    if (!name) continue;
    const campus = await ensureCampus(r[COL.campus] || "");
    const email = r[COL.email] || null;
    const gradeNum = parseInt(r[COL.grade], 10);
    const grade = Number.isFinite(gradeNum) ? gradeNum : null;

    if (DRY_RUN) {
      console.log(`  - ${name} (${r[COL.campus] || "校舎なし"} / 中${grade ?? "?"})`);
      continue;
    }

    // 既存ユーザー突合（メール一致）
    const existingUser = email
      ? await prisma.user.findUnique({ where: { email } })
      : null;

    if (existingUser) {
      await prisma.student.upsert({
        where: { userId: existingUser.id },
        update: {
          kana: r[COL.kana] || null,
          campusId: campus?.id ?? null,
          grade,
          school: r[COL.school] || null,
          aspire: r[COL.aspire] || null,
          dream: r[COL.dream] || null,
          club: r[COL.club] || null,
        },
        create: {
          userId: existingUser.id,
          kana: r[COL.kana] || null,
          campusId: campus?.id ?? null,
          grade,
          school: r[COL.school] || null,
        },
      });
    } else {
      const passwordHash = await bcrypt.hash(randomBytes(12).toString("hex"), 10);
      await prisma.user.create({
        data: {
          loginId: `s_${randomBytes(5).toString("hex")}`,
          email,
          name,
          grade: grade ? `中${grade}` : "-",
          campus: r[COL.campus] || "-",
          role: "STUDENT",
          passwordHash,
          studentProfile: {
            create: {
              kana: r[COL.kana] || null,
              campusId: campus?.id ?? null,
              grade,
              school: r[COL.school] || null,
              aspire: r[COL.aspire] || null,
              dream: r[COL.dream] || null,
              club: r[COL.club] || null,
            },
          },
        },
      });
    }
    // TODO: 成績(通知表/定期試験/模試)のカンマ区切りパースは実データの列仕様確定後に追加
  }
}

async function importInterviews() {
  const rows = loadSheet("interviews.csv");
  console.log(`Interviews: ${rows.length}行`);
  // TODO: 生徒名 → Student.id の対応付け（同名対策に要マッピング）。実データ確定後に実装。
}

async function importAdvice() {
  const rows = loadSheet("advice.csv");
  console.log(`Advice: ${rows.length}行`);
  // TODO: 生徒名 → Student.id 対応付けのうえ AdviceLog(source=TEACHER_PANEL) を作成。
}

async function importConfig() {
  const rows = loadSheet("config.csv");
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
    const passwordHash = await bcrypt.hash(randomBytes(12).toString("hex"), 10);
    await prisma.user.create({
      data: {
        loginId: `t_${randomBytes(4).toString("hex")}`,
        email,
        name: email.split("@")[0],
        grade: "-",
        campus: "-",
        role: "TEACHER",
        passwordHash,
        teacherProfile: { create: {} },
      },
    });
  }
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
