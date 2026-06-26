// 各種ログを Google スプレッドシート（GAS Webアプリ）へ追記する共通ロガー。
//
// イベント種別（type）ごとに別シートへ振り分けて追記する。
//   type 例: "chatlog"(AIチャット) / "attendance"(出席) / "reflection"(リフレクション)
//           / "advice"(AIアドバイス) / "account"(参加登録・ユーザー登録・ログイン)
// スプレッドシート側のサンプルは scripts/sheet-log-gas.gs を参照。
//
// 送信先URLは SHEET_WEBHOOK_URL を優先し、無ければ既存の CHATLOG_WEBHOOK_URL を使う
// （後方互換。これまでの設定のままで全ログが送れる）。
// 未設定なら送信しない。送信に失敗してもアプリ本体には影響させない。

type Field = string | number | null | undefined;

function getUrl(): string | undefined {
  return process.env.SHEET_WEBHOOK_URL || process.env.CHATLOG_WEBHOOK_URL;
}

function getToken(): string {
  return (
    process.env.SHEET_WEBHOOK_TOKEN || process.env.CHATLOG_WEBHOOK_TOKEN || ""
  );
}

export function isSheetLogConfigured(): boolean {
  return Boolean(getUrl());
}

export async function logToSheet(
  type: string,
  fields: Record<string, Field>
): Promise<void> {
  const url = getUrl();
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: getToken(),
        type,
        timestamp: new Date().toLocaleString("ja-JP", {
          timeZone: "Asia/Tokyo",
        }),
        ...fields,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    console.error(`スプレッドシート送信に失敗しました (type=${type})`, e);
  }
}
