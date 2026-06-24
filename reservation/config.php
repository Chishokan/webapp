<?php
/**
 * 設定ファイル — XServerに合わせて値を編集してください。
 */

// ===== データベース(XServerのMySQL情報) =====
// XServerサーバーパネル「MySQL設定」で確認/作成した値を入れてください。
const DB_HOST = 'localhost';            // 通常 localhost (XServerはmysqlXX.xserver.jpの場合あり)
const DB_NAME = 'xxxxxxx_yoyaku';       // データベース名
const DB_USER = 'xxxxxxx_yoyaku';       // ユーザー名
const DB_PASS = 'YOUR_DB_PASSWORD';     // パスワード

// ===== 職員ログイン(管理画面) =====
// 旧GAS版と同じ初期値。必ず変更してください。
const ADMIN_ID = 'chishokan';
const ADMIN_PW = 'chishokan1';

// ===== メール送信 =====
// 送信元アドレス。XServerで運用するドメインのアドレスにしてください(到達率向上)。
const MAIL_FROM      = 'noreply@example.com';
const MAIL_FROM_NAME = '面談予約システム';

// 予約可能枠の締切(現在時刻から何分後以降を予約可能にするか)
const BOOKING_CUTOFF_MINUTES = 60;

// ===== 基本設定(通常変更不要) =====
date_default_timezone_set('Asia/Tokyo');
mb_internal_encoding('UTF-8');
mb_language('Japanese');

if (session_status() === PHP_SESSION_NONE) {
  session_start();
}
