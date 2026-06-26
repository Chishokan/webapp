import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { getAnthropic, isAiConfigured, ANTHROPIC_MODEL } from "@/lib/anthropic";
import { CHISHOKAN_POLICY } from "@/lib/chishokan";
import { logToSheet } from "@/lib/sheet-log";

// 学習履歴をもとに AI が学習アドバイスを生成する（③AIによる学習アドバイス）
export async function POST() {
  try {
    const userId = await requireUserId();

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "AI機能が未設定です。ANTHROPIC_API_KEY を設定してください。" },
        { status: 503 }
      );
    }

    const [attendances, reflections, student, appUser] = await Promise.all([
      prisma.attendance.findMany({
        where: { userId },
        include: { session: true },
        orderBy: { joinedAt: "desc" },
        take: 30,
      }),
      prisma.reflection.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // 塾生としてのプロフィール（あれば面談記録も参照）
      prisma.student.findUnique({
        where: { userId },
        include: {
          interviews: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { loginId: true, name: true, grade: true, campus: true },
      }),
    ]);

    if (attendances.length === 0 && reflections.length === 0) {
      return NextResponse.json({
        advice:
          "まだ学習記録がありません。まずは勉強会に参加して、リフレクションを記録するところから始めましょう！",
      });
    }

    const summaryParts: string[] = [];

    // 塾生プロフィール（学年・志望校・受講科目など）をアドバイスの前提として渡す
    if (student) {
      const profile: string[] = [];
      if (student.grade != null) profile.push(`学年: 中${student.grade}`);
      if (student.school) profile.push(`学校: ${student.school}`);
      if (student.aspire) profile.push(`志望校: ${student.aspire}`);
      if (student.dream) profile.push(`将来の夢: ${student.dream}`);
      if (student.subjects.length)
        profile.push(`受講科目: ${student.subjects.join("・")}`);
      if (student.eikenLevel) profile.push(`英検: ${student.eikenLevel}`);
      if (student.kankenLevel) profile.push(`漢検: ${student.kankenLevel}`);
      if (student.suikenLevel) profile.push(`数検: ${student.suikenLevel}`);
      if (profile.length) {
        summaryParts.push("## 生徒プロフィール", ...profile.map((p) => `- ${p}`), "");
      }
    }

    summaryParts.push(
      `## 出席記録（直近${attendances.length}件）`,
      ...attendances.map(
        (a) =>
          `- ${a.session.date.toLocaleDateString("ja-JP")}: ${a.session.title}`
      ),
      "",
      `## リフレクション（直近${reflections.length}件）`,
      ...reflections.map((r) => {
        const date = r.createdAt.toLocaleDateString("ja-JP");
        const parts = [`学んだこと: ${r.learned}`];
        if (r.good) parts.push(`良かった点: ${r.good}`);
        if (r.next) parts.push(`次への課題: ${r.next}`);
        if (r.mood) parts.push(`自己評価: ${r.mood}/5`);
        return `- [${date}] ${parts.join(" / ")}`;
      })
    );

    // 塾の面談記録を匿名化して追加（氏名・担当者名は含めない）
    if (student && student.interviews.length > 0) {
      summaryParts.push("", "## 塾での面談メモ（参考）");
      for (const iv of student.interviews) {
        summaryParts.push(`- [${iv.date}] ${iv.memo}`);
      }
    }

    const summary = summaryParts.join("\n");

    const anthropic = getAnthropic();
    const message = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system:
        "あなたは学習塾「智翔館」の、親身で前向きな学習コーチです。" +
        "智翔館の生徒（おはよう勉強会の参加者）に対し、以下の【智翔館の指導方針・教材・勉強方針】に必ず沿って、" +
        "学習アドバイスを日本語で提供してください。" +
        "方針に書かれた勉強の進め方（AARサイクル・解き直し・計画性など）や科目別・学年別の重点を踏まえ、" +
        "生徒のプロフィール（学年・志望校・受講科目）と学習記録に即して助言します。\n\n" +
        "===== 智翔館の指導方針・教材・勉強方針 =====\n" +
        CHISHOKAN_POLICY +
        "\n===== ここまで =====\n\n" +
        "【重要】回答はできるだけ短く・シンプルに。全体で5〜8行程度に収め、長文は避けてください。" +
        "出力は次の3部構成で、Markdownの見出しを使い、各セクションは1〜2文か箇条書き2点までで簡潔に書いてください: " +
        "「## 📊 これまでの傾向」（良い点を一言で）、" +
        "「## 💡 次のステップ」（智翔館の方針に沿った具体的な提案を1〜2個）、" +
        "「## 🌱 ひとこと応援」（短い励まし一言）。",
      messages: [
        {
          role: "user",
          content: `以下が私の学習記録です。分析してアドバイスをください。\n\n${summary}`,
        },
      ],
    });

    const advice = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    // 塾生の場合は AdviceLog に保存（職員側からも履歴を確認できるように）
    if (student) {
      await prisma.adviceLog.create({
        data: { studentId: student.id, advice, source: "STUDENT_APP" },
      });
    }

    await logToSheet("advice", {
      loginId: appUser?.loginId ?? "",
      name: appUser?.name ?? "",
      grade: appUser?.grade ?? "",
      campus: appUser?.campus ?? "",
      advice,
    });

    return NextResponse.json({ advice });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "アドバイスの生成に失敗しました" },
      { status: 500 }
    );
  }
}
