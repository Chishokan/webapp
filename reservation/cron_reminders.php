<?php
/**
 * 前日リマインドメール送信(XServerのcronで実行)。
 * 翌日(JST)の confirmed 予約で、まだリマインド未送信のものに送信する。
 *
 * cron例(1日2回 10:00 と 19:00):
 *   0 10 * * * /usr/bin/php /home/サーバーID/ドメイン/public_html/reservation/cron_reminders.php
 *   0 19 * * * /usr/bin/php /home/サーバーID/ドメイン/public_html/reservation/cron_reminders.php
 * 送信済みフラグで重複送信を防ぐため、1予約につき1通のみ送られます。
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

$tomorrow = (new DateTime('now'))->modify('+1 day')->format('Y-m-d');

$names = []; foreach (getSchools() as $s) $names[$s['id']] = $s['name'];

$pdo = db();
$st = $pdo->prepare("SELECT * FROM bookings WHERE slot_date=? AND status='confirmed' AND (reminder_sent IS NULL) AND email<>''");
$st->execute([$tomorrow]);
$rows = $st->fetchAll();

$sent = 0; $errors = 0;
$upd = $pdo->prepare('UPDATE bookings SET reminder_sent=? WHERE id=?');
foreach ($rows as $r) {
  $b = [
    'parentName' => $r['parent_name'],
    'childName'  => $r['child_name'],
    'email'      => $r['email'],
    'date'       => $r['slot_date'],
    'time'       => hhmm($r['slot_time']),
    'schoolName' => $names[$r['school_id']] ?? $r['school_id'],
  ];
  try {
    if (sendReminderMail($b)) {
      $upd->execute([date('Y-m-d H:i:s'), $r['id']]);
      $sent++;
    } else { $errors++; }
  } catch (Throwable $e) {
    $errors++;
    error_log('reminder failed: ' . $r['id'] . ' ' . $e->getMessage());
  }
}

$msg = sprintf("[%s] 翌日=%s リマインド送信 成功:%d 失敗:%d (対象:%d)\n",
  date('Y-m-d H:i:s'), $tomorrow, $sent, $errors, count($rows));
echo $msg;
error_log($msg);
