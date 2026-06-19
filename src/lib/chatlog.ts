// AIチャットのやり取りを Google スプレッドシート（GAS Webアプリ）へ追記する。
//
// 仕組み:
//   Google Apps Script で「ウェブアプリ」としてデプロイした doPost(e) のURLを
//   環境変数 CHATLOG_WEBHOOK_URL に設定すると、チャット1往復ごとに1行追記される。
//   スプレッドシート側のサンプルスクリプトは scripts/chatlog-gas.gs を参照。
//
//   CHATLOG_WEBHOOK_URL が未設定の場合はログ送信を行わない（任意機能）。
//   送信に失敗してもチャット本体の応答には影響させない（握りつぶしてログ出力のみ）。

export type ChatLogEntry = {
  loginId: string;
  name: string;
  grade: string;
  campus: string;
  userMessage: string;
  aiReply: string;
};

export function isChatLogConfigured(): boolean {
  return Boolean(process.env.CHATLOG_WEBHOOK_URL);
}

export async function logChatToSheet(entry: ChatLogEntry): Promise<void> {
  const url = process.env.CHATLOG_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // JST のタイムスタンプ（スプレッドシートでそのまま読めるよう文字列で送る）
      body: JSON.stringify({
        token: process.env.CHATLOG_WEBHOOK_TOKEN ?? "",
        timestamp: new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        }),
        ...entry,
      }),
      // GAS 側が重い場合でもチャット応答を過度に待たせない
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error("チャットログのスプレッドシート送信に失敗しました", e);
  }
}
