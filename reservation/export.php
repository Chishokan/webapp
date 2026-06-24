<?php
// 予約のCSVダウンロード(職員のみ)。旧GASの「カレンダー出力」の代替。
require_once __DIR__ . '/db.php';

if (empty($_SESSION['admin'])) { http_response_code(403); echo '認証が必要です'; exit; }

$schoolId = (string)($_GET['school'] ?? '');
$start = (string)($_GET['start'] ?? '');
$end   = (string)($_GET['end'] ?? '');
$school = findSchool($schoolId);
if (!$school) { http_response_code(400); echo '校舎が不正です'; exit; }
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) {
  http_response_code(400); echo '期間が不正です'; exit;
}

$st = db()->prepare("SELECT * FROM bookings WHERE school_id=? AND status<>'cancelled' AND slot_date BETWEEN ? AND ? ORDER BY slot_date, slot_time");
$st->execute([$schoolId, $start, $end]);

$fname = '面談予約_' . $school['name'] . '_' . str_replace('-', '', $start) . '-' . str_replace('-', '', $end) . '.csv';
header('Content-Type: text/csv; charset=UTF-8');
header('Content-Disposition: attachment; filename*=UTF-8\'\'' . rawurlencode($fname));

$out = fopen('php://output', 'w');
fwrite($out, "\xEF\xBB\xBF"); // Excel用BOM
fputcsv($out, ['日付', '時刻', 'お子様名', '学年', '保護者名', 'メール', '相談内容', '面談実施', '面談記録', '職員メモ']);
foreach ($st as $r) {
  fputcsv($out, [
    $r['slot_date'], hhmm($r['slot_time']), $r['child_name'], $r['grade'],
    $r['parent_name'], $r['email'], $r['note'],
    ((int)$r['interview_done'] === 1 ? '済' : ''), $r['interview_note'], $r['staff_note'],
  ]);
}
fclose($out);
