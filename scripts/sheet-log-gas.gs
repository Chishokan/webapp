/**
 * おはよう勉強会 — 各種ログ収集用 Google Apps Script
 *
 * 1つのWebアプリで複数のログ種別(type)を受け取り、種別ごとに別シートへ追記します。
 *   type: chatlog(AIチャット) / attendance(出席) / reflection(リフレクション)
 *         / advice(AIアドバイス) / account(参加登録・ユーザー登録・ログイン)
 *
 * 【セットアップ手順】
 * 1. ログ用の Google スプレッドシートを開く
 * 2. 拡張機能 → Apps Script を開き、このコードを貼り付ける
 *    （以前の chatlog 用スクリプトはこの内容で置き換えてください）
 * 3. （任意）SHARED_TOKEN を変更し、Vercel の SHEET_WEBHOOK_TOKEN（または
 *    既存の CHATLOG_WEBHOOK_TOKEN）と一致させる
 * 4. 「デプロイ」→「デプロイを管理」→ 既存デプロイを編集して「新しいバージョン」を発行
 *    （実行ユーザー: 自分 / アクセス: 全員）。URLは変わりません。
 *    新規の場合は「新しいデプロイ」→ ウェブアプリ で発行し、その /exec URL を
 *    Vercel の SHEET_WEBHOOK_URL（または既存の CHATLOG_WEBHOOK_URL）に設定。
 */

// 任意の共有トークン（空文字なら検証しない）。Vercel 側のトークンと一致させる。
var SHARED_TOKEN = "";

// ログ種別ごとの「シート名」と「列定義（ヘッダー: 受け取るキー）」
var SCHEMAS = {
  chatlog: {
    sheet: "chatlog",
    headers: ["日時", "ログインID", "氏名", "学年", "校舎", "生徒メッセージ", "AI応答"],
    fields: ["timestamp", "loginId", "name", "grade", "campus", "userMessage", "aiReply"],
  },
  attendance: {
    sheet: "attendance",
    headers: ["日時", "ログインID", "氏名", "学年", "校舎", "セッション"],
    fields: ["timestamp", "loginId", "name", "grade", "campus", "session"],
  },
  reflection: {
    sheet: "reflection",
    headers: ["日時", "ログインID", "氏名", "学年", "校舎", "学んだこと", "良かった点", "次に向けて", "満足度"],
    fields: ["timestamp", "loginId", "name", "grade", "campus", "learned", "good", "next", "mood"],
  },
  advice: {
    sheet: "advice",
    headers: ["日時", "ログインID", "氏名", "学年", "校舎", "アドバイス"],
    fields: ["timestamp", "loginId", "name", "grade", "campus", "advice"],
  },
  account: {
    sheet: "account",
    headers: ["日時", "操作", "ログインID", "氏名", "ロール", "詳細"],
    fields: ["timestamp", "action", "loginId", "name", "role", "detail"],
  },
};

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (SHARED_TOKEN && data.token !== SHARED_TOKEN) {
      return _json({ ok: false, error: "invalid token" });
    }

    var schema = SCHEMAS[data.type] || SCHEMAS.chatlog;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(schema.sheet);
    if (!sheet) {
      sheet = ss.insertSheet(schema.sheet);
      sheet.appendRow(schema.headers);
    }

    var row = schema.fields.map(function (key) {
      var v = data[key];
      return v === undefined || v === null ? "" : v;
    });
    sheet.appendRow(row);

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
