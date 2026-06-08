import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { getAnthropic, isAiConfigured, ANTHROPIC_MODEL } from "@/lib/anthropic";
import {
  REPORT_TERMS,
  EXAM_TERMS,
  MOCK_TERMS,
  MOCK_SUBJECTS,
} from "@/lib/karte";

function handleError(e: unknown) {
  if (e instanceof UnauthorizedError)
    return NextResponse.json({ error: e.message }, { status: 401 });
  if (e instanceof ForbiddenError)
    return NextResponse.json({ error: e.message }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
}

// 最新のアドバイス1件
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    const latest = await prisma.adviceLog.findFirst({
      where: { studentId: id, source: "TEACHER_PANEL" },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ advice: latest });
  } catch (e) {
    return handleError(e);
  }
}

// 個人を特定しない匿名サマリーを構築（氏名・フリガナ・兄弟・保護者・連絡先は含めない）
function buildSummary(student: {
  grade: number | null;
  campus: { name: string } | null;
  aspire: string | null;
  dream: string | null;
  club: string | null;
  subjects: string[];
  eikenLevel: string | null;
  kankenLevel: string | null;
  suikenLevel: string | null;
  reportCards: { term: string; subject: string; grade: number }[];
  exams: { term: string; subject: string; score: number }[];
  mockTests: {
    term: string;
    japanese: number | null;
    math: number | null;
    english: number | null;
    science: number | null;
    social: number | null;
    fiveSubjectDev: number | null;
  }[];
  interviews: { date: string; memo: string }[];
}): string {
  const lines: string[] = [];
  lines.push("## 基本");
  lines.push(`- 学年: ${student.grade != null ? `中${student.grade}` : "未設定"}`);
  if (student.aspire) lines.push(`- 志望校: ${student.aspire}`);
  if (student.dream) lines.push(`- 将来の夢: ${student.dream}`);
  if (student.club) lines.push(`- 部活動: ${student.club}`);
  if (student.subjects.length) lines.push(`- 受講科目: ${student.subjects.join("・")}`);
  const ken = [
    student.eikenLevel && `英検${student.eikenLevel}`,
    student.kankenLevel && `漢検${student.kankenLevel}`,
    student.suikenLevel && `数検${student.suikenLevel}`,
  ].filter(Boolean);
  if (ken.length) lines.push(`- 検定: ${ken.join("・")}`);

  if (student.reportCards.length) {
    lines.push("\n## 通知表(評定1-5)");
    for (const t of REPORT_TERMS) {
      const items = student.reportCards
        .filter((r) => r.term === t.key)
        .map((r) => `${r.subject}${r.grade}`);
      if (items.length) lines.push(`- ${t.label}: ${items.join(" ")}`);
    }
  }
  if (student.exams.length) {
    lines.push("\n## 定期試験(点数)");
    for (const t of EXAM_TERMS) {
      const items = student.exams
        .filter((e) => e.term === t.key)
        .map((e) => `${e.subject}${e.score}`);
      if (items.length) lines.push(`- ${t.label}: ${items.join(" ")}`);
    }
  }
  if (student.mockTests.length) {
    lines.push("\n## 模試");
    for (const t of MOCK_TERMS) {
      const rec = student.mockTests.find((m) => m.term === t.key);
      if (!rec) continue;
      const items = MOCK_SUBJECTS.map((s) => {
        const v = rec[s.key];
        return v != null ? `${s.label}${v}` : null;
      }).filter(Boolean);
      if (rec.fiveSubjectDev != null) items.push(`5科偏差値${rec.fiveSubjectDev}`);
      if (items.length) lines.push(`- ${t.label}: ${items.join(" ")}`);
    }
  }
  if (student.interviews.length) {
    lines.push("\n## 面談記録(新しい順)");
    for (const iv of student.interviews.slice(0, 15)) {
      lines.push(`- [${iv.date}] ${iv.memo}`);
    }
  }
  return lines.join("\n");
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaff();
    const { id } = await params;

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "AI機能が未設定です。ANTHROPIC_API_KEY を設定してください。" },
        { status: 503 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        campus: { select: { name: true } },
        reportCards: true,
        exams: true,
        mockTests: true,
        interviews: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!student)
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const summary = buildSummary(student);

    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      system:
        "あなたは塾の先生を支援するアシスタントです。生徒の成績データと面談記録をもとに、" +
        "次回面談に向けた参考アドバイスを日本語で作成します。以下の制約を必ず守ってください:\n" +
        "- これは先生向けの参考メモであり、最終判断は先生が行う前提で書く\n" +
        "- 生徒や保護者を否定・批判しない\n" +
        "- 特定の志望校の合否を断定しない\n" +
        "- 数値(成績・偏差値)に基づきつつ、決めつけず観点として示す\n" +
        "- 医療・家庭環境などデリケートな事柄には踏み込みすぎない\n" +
        "出力は次の4見出し(Markdownの##)で構成してください:\n" +
        "## ① 現状の良い点\n## ② 課題と背景\n## ③ 次の面談で確認・提案したいこと\n## ④ 声かけの例",
      messages: [
        {
          role: "user",
          content: `以下は担当生徒の情報(氏名等の個人情報は含みません)です。分析してアドバイスをください。\n\n${summary}`,
        },
      ],
    });

    const adviceText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    const me = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { email: true, loginId: true },
    });

    const saved = await prisma.adviceLog.create({
      data: {
        studentId: id,
        advice: adviceText,
        source: "TEACHER_PANEL",
        createdBy: me?.email ?? me?.loginId ?? null,
      },
    });

    return NextResponse.json({ advice: saved });
  } catch (e) {
    return handleError(e);
  }
}
