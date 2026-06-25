<?php
/**
 * テーブル作成＋校舎マスタ初期化(接頭辞対応)。
 * 既存アプリと「同じDB」に同居させる場合など、config.php の TABLE_PREFIX を
 * 設定したうえで、ブラウザから1回だけ実行してください:
 *   https://ドメイン/reservation/setup.php?token=（config.phpのADMIN_PW）
 *
 * 専用DBを使う場合は、これを使わず schema.sql を phpMyAdmin で取り込んでもOKです。
 * いずれも CREATE TABLE IF NOT EXISTS / INSERT IGNORE なので、繰り返し実行しても安全です。
 */
require_once __DIR__ . '/db.php';
header('Content-Type: text/plain; charset=utf-8');

if (($_GET['token'] ?? '') !== ADMIN_PW) {
  http_response_code(403);
  echo "token が一致しません。?token=（config.php の ADMIN_PW）を指定してください。\n";
  exit;
}

$pdo = db();

$pdo->exec('CREATE TABLE IF NOT EXISTS ' . TBL_SCHOOLS . ' (
  id VARCHAR(32) NOT NULL,
  name VARCHAR(100) NOT NULL,
  notify_email VARCHAR(500) NOT NULL DEFAULT \'\',
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS ' . TBL_SLOTS . ' (
  id INT NOT NULL AUTO_INCREMENT,
  school_id VARCHAR(32) NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  label VARCHAR(255) NOT NULL DEFAULT \'\',
  published TINYINT(1) NOT NULL DEFAULT 1,
  capacity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot (school_id, slot_date, slot_time),
  KEY idx_school_date (school_id, slot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$pdo->exec('CREATE TABLE IF NOT EXISTS ' . TBL_BOOKINGS . ' (
  id VARCHAR(40) NOT NULL,
  school_id VARCHAR(32) NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  child_name VARCHAR(100) NOT NULL,
  parent_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  grade VARCHAR(50) NOT NULL DEFAULT \'\',
  note TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT \'confirmed\',
  created_at DATETIME NOT NULL,
  staff_note TEXT NULL,
  reminder_sent DATETIME NULL,
  interview_done TINYINT(1) NOT NULL DEFAULT 0,
  interview_note TEXT NULL,
  interview_updated DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_school_date (school_id, slot_date),
  KEY idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');

$schools = [
  ['hirota', 'RED広田教室', 'chishokan.fukumoto@gmail.com', 1],
  ['kyomachi', 'RED京町教室', 'rierioria@icloud.com', 2],
  ['hino', 'RED日野教室', 'kametamiarata@gmail.com', 3],
  ['saza', 'RED佐々教室', 'kametamiarata@gmail.com', 4],
  ['oshima', 'RED西海大島教室', 'tomitas.red@gmail.com', 5],
  ['ono', 'RED大野教室', 'shinyanakayama0723@gmail.com', 6],
  ['nexta', 'ネクスタ', '0nf2w95w7850v9r@gmail.com', 7],
];
$ins = $pdo->prepare('INSERT IGNORE INTO ' . TBL_SCHOOLS . ' (id,name,notify_email,sort_order) VALUES (?,?,?,?)');
foreach ($schools as $s) $ins->execute($s);

echo "セットアップ完了。\n";
echo "テーブル: " . TBL_SCHOOLS . ' / ' . TBL_SLOTS . ' / ' . TBL_BOOKINGS . "\n";
echo "校舎マスタ: " . count($schools) . "件を確認(既存はそのまま)\n";
echo "\nこのファイル(setup.php)は実行後に削除しておくと安全です。\n";
