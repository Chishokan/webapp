<?php
require_once __DIR__ . '/config.php';

/** 日本語メール送信(PHP mb_send_mail) */
function sendMail(string $to, string $subject, string $body): bool {
  if (!$to) return false;
  $headers = 'From: ' . mb_encode_mimeheader(MAIL_FROM_NAME) . ' <' . MAIL_FROM . '>';
  // カンマ区切りで複数宛先に対応
  $ok = true;
  foreach (array_map('trim', explode(',', $to)) as $addr) {
    if ($addr === '') continue;
    $r = mb_send_mail($addr, $subject, $body, $headers);
    $ok = $ok && $r;
  }
  return $ok;
}

function jpDate(string $ymd): string {
  [$y, $m, $d] = array_map('intval', explode('-', $ymd));
  $w = ['日', '月', '火', '水', '木', '金', '土'];
  $wd = (int)date('w', mktime(0, 0, 0, $m, $d, $y));
  return "{$y}年{$m}月{$d}日(" . $w[$wd] . ')';
}

/** 新規予約 → 校舎担当者へ通知 */
function notifyStaffNewBooking(array $b): void {
  try {
    $school = findSchool($b['schoolId']);
    if (!$school) return;
    $to = trim($school['notify_email'] ?? '');
    if (!$to) return;
    $dateLabel = jpDate($b['date']);
    $subject = '【新規予約】' . $school['name'] . ' ' . $dateLabel . ' ' . $b['time'];
    $body =
      $school['name'] . " 担当者様\n\n" .
      "新しい面談予約が入りました。\n\n" .
      "────────────────────\n" .
      "【予約内容】\n" .
      '  校舎  ：' . $school['name'] . "\n" .
      '  日時  ：' . $dateLabel . ' ' . $b['time'] . "\n" .
      '  お子様：' . $b['childName'] . ' 様 (' . ($b['grade'] ?: '学年未設定') . ")\n" .
      '  保護者：' . $b['parentName'] . " 様\n" .
      '  メール：' . $b['email'] . "\n" .
      '  ご相談：' . ($b['note'] ?: '(なし)') . "\n" .
      "────────────────────\n\n" .
      "管理画面でも確認できます。\n";
    sendMail($to, $subject, $body);
  } catch (Throwable $e) {
    error_log('notifyStaffNewBooking failed: ' . $e->getMessage());
  }
}

/** 前日リマインドを保護者へ */
function sendReminderMail(array $b): bool {
  $dateLabel = jpDate($b['date']);
  $subject = '【面談のご案内】明日の面談についてのリマインド';
  $body =
    $b['parentName'] . " 様\n\n" .
    "いつもお世話になっております。\n" .
    "明日の面談についてリマインドのご連絡です。\n\n" .
    "────────────────────\n" .
    "【面談予定】\n" .
    '  日時  ：' . $dateLabel . ' ' . $b['time'] . "\n" .
    '  校舎  ：' . $b['schoolName'] . "\n" .
    '  お子様：' . $b['childName'] . " 様\n" .
    "────────────────────\n\n" .
    "お忙しい中とは存じますが、お気をつけてお越しください。\n" .
    "お待ちしております。\n\n\n" .
    "────────────────────\n" .
    "※ ご変更・キャンセルの際は、お通いの校舎まで直接お電話にてご連絡ください。\n" .
    "※ このメールは送信専用です。返信されてもご対応できかねます。\n" .
    "────────────────────\n";
  return sendMail($b['email'], $subject, $body);
}
