import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId, UnauthorizedError } from "@/lib/auth";
import { getAnthropic, isAiConfigured, ANTHROPIC_MODEL } from "@/lib/anthropic";

const schema = z.object({
  message: z.string().min(1, "メッセージを入力してください").max(4000),
});

// AIチャット（④）。直近の履歴を文脈として Claude に渡す
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();

    if (!isAiConfigured()) {
      return NextResponse.json(
        { error: "AI機能が未設定です。ANTHROPIC_API_KEY を設定してください。" },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }

    const { message } = parsed.data;

    // 直近の会話履歴（古い順）を取得
    const history = await prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    history.reverse();

    const messages = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const anthropic = getAnthropic();
    const completion = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system:
        "あなたは「おはよう勉強会」の学習サポートAIです。学習者の質問や相談に、" +
        "親しみやすく、簡潔で分かりやすい日本語で答えてください。" +
        "勉強法・モチベーション・知識の質問など幅広くサポートします。",
      messages,
    });

    const reply = completion.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    // ユーザー発言と応答を保存
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { userId, role: "user", content: message },
      }),
      prisma.chatMessage.create({
        data: { userId, role: "assistant", content: reply },
      }),
    ]);

    return NextResponse.json({ reply });
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return NextResponse.json({ error: e.message }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "応答の生成に失敗しました" },
      { status: 500 }
    );
  }
}
