/**
 * おはよう勉強会 — AIチャットログ収集用 Google Apps Script
 *
 * 【セットアップ手順】
 * 1. ログを残したい Google スプレッドシートを開く
 * 2. 拡張機能 → Apps Script を開き、このコードを貼り付ける
 * 3. （任意）下の SHARED_TOKEN を推測されにくい文字列に変更する
 *    変更した場合は Vercel の環境変数 CHATLOG_WEBHOOK_TOKEN に同じ値を設定する
 * 4. 「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」
 *      - 実行ユーザー: 自分
 *      - アクセスできるユーザー: 全員
 * 5. 発行された /exec で終わる URL を、Vercel の環境変数
 *    CHATLOG_WEBHOOK_URL に設定して再デプロイする
 *
 * 以後、チャット1往復ごとに1行追記されます。
 */

// 任意の共有トークン（空文字なら検証しない）。Vercel の CHATLOG_WEBHOOK_TOKEN と一致させる。
var SHARED_TOKEN = "";

// 追記先シート名
var SHEET_NAME = "chatlog";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (SHARED_TOKEN && data.token !== SHARED_TOKEN) {
      return _json({ ok: false, error: "invalid token" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        "日時",
        "ログインID",
        "氏名",
        "学年",
        "校舎",
        "生徒メッセージ",
        "AI応答",
      ]);
    }

    sheet.appendRow([
      data.timestamp || new Date(),
      data.loginId || "",
      data.name || "",
      data.grade || "",
      data.campus || "",
      data.userMessage || "",
      data.aiReply || "",
    ]);

    return _json({ ok: true });
  } catch (err) {
    return _json({ ok: false, error: String(err) });
  }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
