// おはよう勉強会の参加登録（申込ベース管理）に関する共通処理。

import { type PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { csvToObjects } from "./gas-import";

/** 指定ユーザーが参加登録済みか */
export async function isEnrolled(userId: string): Promise<boolean> {
  const e = await prisma.enrollment.findUnique({
    where: { userId },
    select: { id: true },
  });
  return Boolean(e);
}

export type ParticipantImportResult = {
  total: number;
  created: number;
  enrolled: number;
  skipped: number;
};

function pick(r: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (r[k] != null && r[k].trim() !== "") return r[k].trim();
  }
  return "";
}

// 申込フォーム回収後のCSVを取り込み、ユーザー作成＋参加登録を行う。
// 対応ヘッダー（いずれか）: name/名前/氏名, loginId/id/ID/ログインID,
//   password/パスワード, grade/学年, campus/校舎/所属
export async function importParticipantsFromCsv(
  db: PrismaClient,
  csvText: string
): Promise<ParticipantImportResult> {
  const rows = csvToObjects(csvText);

  let created = 0;
  let enrolled = 0;
  let skipped = 0;

  for (const r of rows) {
    const name = pick(r, ["name", "名前", "氏名"]);
    const rawId = pick(r, ["loginId", "id", "ID", "ログインID"]);
    if (!name || !rawId) {
      skipped++;
      continue;
    }
    // 既存の塾生ログインIDと衝突しないよう接頭辞を付ける
    const loginId = rawId.startsWith("form_") ? rawId : `form_${rawId}`;
    const password = pick(r, ["password", "パスワード"]);
    const grade = pick(r, ["grade", "学年"]) || "-";
    const campus = pick(r, ["campus", "校舎", "所属"]) || "-";

    const existing = await db.user.findUnique({ where: { loginId } });
    const passwordHash = password
      ? await bcrypt.hash(password, 10)
      : existing?.passwordHash ??
        (await bcrypt.hash(randomBytes(12).toString("hex"), 10));

    const user = await db.user.upsert({
      where: { loginId },
      update: { name, grade, campus, ...(password ? { passwordHash } : {}) },
      create: { loginId, name, grade, campus, role: "STUDENT", passwordHash },
    });
    if (!existing) created++;

    const before = await db.enrollment.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    await db.enrollment.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, source: "FORM_IMPORT" },
    });
    if (!before) enrolled++;
  }

  return { total: rows.length, created, enrolled, skipped };
}
