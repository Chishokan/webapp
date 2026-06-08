import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { getAnthropic, isAiConfigured, ANTHROPIC_MODEL } from "@/lib/anthropic";

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

    const [attendances, reflections, student] = await Promise.all([
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
    ]);

    if (attendances.length === 0 && reflections.length === 0) {
      return NextResponse.json({
        advice:
          "まだ学習記録がありません。まずは勉強会に参加して、リフレクションを記録するところから始めましょう！",
      });
    }

    const summaryParts = [
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
      }),
    ];

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
      max_tokens: 1024,
      system:
        "あなたは「おはよう勉強会」という朝活学習コミュニティの、親身で前向きな学習コーチです。" +
        "ユーザーの出席記録とリフレクションをもとに、具体的で励みになる学習アドバイスを日本語で提供してください。" +
        "出力は次の3部構成で、Markdownの見出しを使ってください: " +
        "「## 📊 これまでの傾向」（良い習慣や継続度を称賛）、" +
        "「## 💡 次のステップ」（具体的で実行可能な提案を2〜3個）、" +
        "「## 🌱 ひとこと応援」（短い励まし）。",
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
