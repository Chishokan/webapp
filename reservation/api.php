<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

header('Content-Type: application/json; charset=utf-8');

function out($data) { echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function fail($msg) { out(['ok' => false, 'error' => $msg]); }

function body(): array {
  $raw = file_get_contents('php://input');
  $j = json_decode($raw, true);
  if (is_array($j)) return $j;
  return $_POST ?: [];
}

function isAdmin(): bool { return !empty($_SESSION['admin']); }
function requireAdmin() { if (!isAdmin()) { http_response_code(403); out(['ok' => false, 'error' => '認証が必要です', 'auth' => true]); } }

function nowDT(): DateTime { return new DateTime('now'); }

function bookingRow(array $r, string $schoolName): array {
  return [
    'id'               => $r['id'],
    'schoolId'         => $r['school_id'],
    'schoolName'       => $schoolName,
    'date'             => $r['slot_date'],
    'time'             => hhmm($r['slot_time']),
    'childName'        => $r['child_name'],
    'parentName'       => $r['parent_name'],
    'email'            => $r['email'],
    'grade'            => $r['grade'],
    'note'             => $r['note'] ?? '',
    'status'           => $r['status'],
    'createdAt'        => $r['created_at'] ?? '',
    'staffNote'        => $r['staff_note'] ?? '',
    'reminderSent'     => $r['reminder_sent'] ?? '',
    'interviewDone'    => (bool)($r['interview_done'] ?? 0),
    'interviewNote'    => $r['interview_note'] ?? '',
    'interviewUpdated' => $r['interview_updated'] ?? '',
  ];
}

/** 予約可能枠(保護者用) */
function availableSlots(string $schoolId): array {
  $school = findSchool($schoolId);
  if (!$school) return [];
  $pdo = db();
  // 各枠の予約数(キャンセル以外)
  $cnt = [];
  $st = $pdo->prepare("SELECT slot_date, slot_time, COUNT(*) c FROM " . TBL_BOOKINGS . " WHERE school_id=? AND status<>'cancelled' GROUP BY slot_date, slot_time");
  $st->execute([$schoolId]);
  foreach ($st as $r) $cnt[$r['slot_date'] . ' ' . hhmm($r['slot_time'])] = (int)$r['c'];

  $cutoff = nowDT();
  $cutoff->modify('+' . BOOKING_CUTOFF_MINUTES . ' minutes');

  $st = $pdo->prepare('SELECT slot_date, slot_time, label, capacity FROM ' . TBL_SLOTS . ' WHERE school_id=? AND published=1 ORDER BY slot_date, slot_time');
  $st->execute([$schoolId]);
  $res = [];
  foreach ($st as $r) {
    $date = $r['slot_date']; $time = hhmm($r['slot_time']);
    $cap = (int)$r['capacity']; if ($cap < 1) $cap = 1;
    $key = $date . ' ' . $time;
    $booked = $cnt[$key] ?? 0;
    if ($booked >= $cap) continue;
    $slotDT = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $time);
    if (!$slotDT || $slotDT < $cutoff) continue;
    $res[] = ['date' => $date, 'time' => $time, 'label' => (string)$r['label'],
              'capacity' => $cap, 'booked' => $booked, 'remaining' => $cap - $booked];
  }
  return $res;
}

$action = $_GET['action'] ?? (body()['action'] ?? '');
$in = body();

try {
  switch ($action) {

  // ===== 公開API =====
  case 'getSchools':
    out(['ok' => true, 'schools' => getSchools()]);

  case 'getSlots':
    out(['ok' => true, 'slots' => availableSlots((string)($in['schoolId'] ?? ''))]);

  case 'getMyBookings': {
    $email = strtolower(trim((string)($in['email'] ?? '')));
    if ($email === '') out(['ok' => true, 'bookings' => []]);
    $names = []; foreach (getSchools() as $s) $names[$s['id']] = $s['name'];
    $st = db()->prepare('SELECT * FROM ' . TBL_BOOKINGS . ' WHERE LOWER(email)=? ORDER BY slot_date, slot_time');
    $st->execute([$email]);
    $list = [];
    foreach ($st as $r) $list[] = bookingRow($r, $names[$r['school_id']] ?? $r['school_id']);
    out(['ok' => true, 'bookings' => $list]);
  }

  case 'createBooking': {
    $schoolId = (string)($in['schoolId'] ?? '');
    $email = trim((string)($in['email'] ?? ''));
    $date = (string)($in['date'] ?? ''); $time = (string)($in['time'] ?? '');
    $child = trim((string)($in['childName'] ?? '')); $parent = trim((string)($in['parentName'] ?? ''));
    $grade = (string)($in['grade'] ?? ''); $note = (string)($in['note'] ?? '');
    if (!$schoolId || !$email || !$date || !$time || !$child || !$parent) fail('パラメータが不足しています');
    $school = findSchool($schoolId);
    if (!$school) fail('校舎が見つかりません');

    $pdo = db();
    $pdo->beginTransaction();
    try {
      // 公開枠か & 定員確認(同時実行対策に枠行をロック)
      $st = $pdo->prepare('SELECT capacity, published FROM ' . TBL_SLOTS . ' WHERE school_id=? AND slot_date=? AND slot_time=? FOR UPDATE');
      $st->execute([$schoolId, $date, $time . ':00']);
      $slot = $st->fetch();
      if (!$slot || (int)$slot['published'] !== 1) { $pdo->rollBack(); fail('その枠はすでに予約されているか、公開されていません'); }
      $cap = max(1, (int)$slot['capacity']);
      $st = $pdo->prepare("SELECT COUNT(*) c FROM " . TBL_BOOKINGS . " WHERE school_id=? AND slot_date=? AND slot_time=? AND status<>'cancelled'");
      $st->execute([$schoolId, $date, $time . ':00']);
      if ((int)$st->fetch()['c'] >= $cap) { $pdo->rollBack(); fail('その枠はすでに予約されています'); }

      $id = 'b_' . round(microtime(true) * 1000) . '_' . substr(bin2hex(random_bytes(4)), 0, 5);
      $st = $pdo->prepare('INSERT INTO ' . TBL_BOOKINGS . ' (id,school_id,slot_date,slot_time,child_name,parent_name,email,grade,note,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
      $st->execute([$id, $schoolId, $date, $time . ':00', $child, $parent, $email, $grade, $note, 'confirmed', date('Y-m-d H:i:s')]);
      $pdo->commit();
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
    // ロック解放後に通知メール(失敗しても予約は成立)
    notifyStaffNewBooking(['schoolId' => $schoolId, 'date' => $date, 'time' => $time,
      'childName' => $child, 'parentName' => $parent, 'email' => $email, 'grade' => $grade, 'note' => $note]);
    out(['ok' => true, 'id' => $id]);
  }

  case 'cancelBooking': {
    $schoolId = (string)($in['schoolId'] ?? ''); $email = strtolower(trim((string)($in['email'] ?? ''))); $id = (string)($in['id'] ?? '');
    $st = db()->prepare("UPDATE " . TBL_BOOKINGS . " SET status='cancelled' WHERE id=? AND school_id=? AND LOWER(email)=?");
    $st->execute([$id, $schoolId, $email]);
    if ($st->rowCount() === 0) fail('予約が見つかりません');
    out(['ok' => true]);
  }

  case 'updateBooking': { // 保護者による変更(現UIでは未使用だが互換のため)
    $schoolId = (string)($in['schoolId'] ?? ''); $email = strtolower(trim((string)($in['email'] ?? ''))); $id = (string)($in['id'] ?? '');
    $date = (string)($in['date'] ?? ''); $time = (string)($in['time'] ?? '');
    $st = db()->prepare('SELECT * FROM ' . TBL_BOOKINGS . ' WHERE id=? AND school_id=? AND LOWER(email)=?');
    $st->execute([$id, $schoolId, $email]);
    $b = $st->fetch();
    if (!$b) fail('予約が見つかりません');
    if (hhmm($b['slot_time']) !== $time || $b['slot_date'] !== $date) {
      $avail = availableSlots($schoolId);
      $found = false; foreach ($avail as $s) if ($s['date'] === $date && $s['time'] === $time) { $found = true; break; }
      if (!$found) fail('変更先の枠はすでに予約されているか、公開されていません');
    }
    $st = db()->prepare('UPDATE ' . TBL_BOOKINGS . ' SET slot_date=?, slot_time=?, child_name=?, parent_name=?, grade=?, note=? WHERE id=?');
    $st->execute([$date, $time . ':00', (string)($in['childName'] ?? ''), (string)($in['parentName'] ?? ''), (string)($in['grade'] ?? ''), (string)($in['note'] ?? ''), $id]);
    out(['ok' => true]);
  }

  // ===== 管理: 認証 =====
  case 'admin_login':
    if ((string)($in['id'] ?? '') === ADMIN_ID && (string)($in['pw'] ?? '') === ADMIN_PW) {
      $_SESSION['admin'] = true;
      out(['ok' => true]);
    }
    out(['ok' => false, 'error' => 'IDまたはパスワードが正しくありません']);

  case 'admin_logout':
    $_SESSION['admin'] = false;
    out(['ok' => true]);

  case 'admin_me':
    out(['ok' => true, 'loggedIn' => isAdmin()]);

  // ===== 管理: 取得 =====
  case 'admin_getAllSlots': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? '');
    if (!findSchool($schoolId)) fail('校舎が見つかりません');
    $pdo = db();
    $bk = [];
    $st = $pdo->prepare("SELECT slot_date, slot_time, child_name, parent_name, email, grade FROM " . TBL_BOOKINGS . " WHERE school_id=? AND status<>'cancelled'");
    $st->execute([$schoolId]);
    foreach ($st as $r) {
      $key = $r['slot_date'] . ' ' . hhmm($r['slot_time']);
      $bk[$key][] = ['childName' => $r['child_name'], 'parentName' => $r['parent_name'], 'email' => $r['email'], 'grade' => $r['grade']];
    }
    $now = nowDT();
    $st = $pdo->prepare('SELECT id, slot_date, slot_time, label, published, capacity FROM ' . TBL_SLOTS . ' WHERE school_id=? ORDER BY slot_date, slot_time');
    $st->execute([$schoolId]);
    $res = [];
    foreach ($st as $r) {
      $date = $r['slot_date']; $time = hhmm($r['slot_time']);
      $key = $date . ' ' . $time;
      $list = $bk[$key] ?? [];
      $slotDT = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $time);
      $res[] = [
        'rowNum'    => (int)$r['id'],   // 互換: 旧rowNum = DB id
        'date'      => $date, 'time' => $time,
        'label'     => (string)$r['label'],
        'published' => ((int)$r['published'] === 1),
        'isPast'    => ($slotDT && $slotDT < $now),
        'capacity'  => max(1, (int)$r['capacity']),
        'booked'    => count($list),
        'bookings'  => $list,
        'booking'   => $list[0] ?? null,
      ];
    }
    out(['ok' => true, 'slots' => $res]);
  }

  case 'admin_getAllBookings': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? '');
    $school = findSchool($schoolId);
    if (!$school) fail('校舎が見つかりません');
    $st = db()->prepare('SELECT * FROM ' . TBL_BOOKINGS . ' WHERE school_id=? ORDER BY slot_date, slot_time');
    $st->execute([$schoolId]);
    $list = [];
    foreach ($st as $r) { $b = bookingRow($r, $school['name']); $list[] = $b; }
    out(['ok' => true, 'bookings' => $list]);
  }

  // ===== 管理: 枠操作 =====
  case 'admin_addSlots': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? '');
    if (!findSchool($schoolId)) fail('校舎が見つかりません');
    $slots = $in['slots'] ?? [];
    if (!$slots) fail('追加する枠がありません');
    $pdo = db();
    $ins = $pdo->prepare('INSERT IGNORE INTO ' . TBL_SLOTS . ' (school_id, slot_date, slot_time, label, published, capacity) VALUES (?,?,?,?,1,?)');
    $added = 0; $skipped = 0;
    foreach ($slots as $s) {
      $cap = (int)($s['capacity'] ?? 1); if ($cap < 1) $cap = 1;
      $ins->execute([$schoolId, $s['date'], ((string)$s['time']) . ':00', (string)($s['label'] ?? ''), $cap]);
      if ($ins->rowCount() > 0) $added++; else $skipped++;
    }
    out(['ok' => true, 'added' => $added, 'skipped' => $skipped]);
  }

  case 'admin_updateSlot': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? ''); $id = (int)($in['rowNum'] ?? 0);
    if (!findSchool($schoolId)) fail('校舎が見つかりません');
    if (array_key_exists('published', $in)) {
      $st = db()->prepare('UPDATE ' . TBL_SLOTS . ' SET published=? WHERE id=? AND school_id=?');
      $st->execute([$in['published'] ? 1 : 0, $id, $schoolId]);
    }
    if (array_key_exists('label', $in)) {
      $st = db()->prepare('UPDATE ' . TBL_SLOTS . ' SET label=? WHERE id=? AND school_id=?');
      $st->execute([(string)($in['label'] ?? ''), $id, $schoolId]);
    }
    if (array_key_exists('capacity', $in)) {
      $cap = (int)$in['capacity']; if ($cap < 1) fail('定員は1以上の数字を指定してください');
      $st = db()->prepare('UPDATE ' . TBL_SLOTS . ' SET capacity=? WHERE id=? AND school_id=?');
      $st->execute([$cap, $id, $schoolId]);
    }
    out(['ok' => true]);
  }

  case 'admin_bulkUpdateCapacity': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? '');
    $rowNums = $in['rowNums'] ?? [];
    $cap = (int)($in['capacity'] ?? 0);
    if (!findSchool($schoolId)) fail('校舎が見つかりません');
    if (!$rowNums) fail('対象の枠が選択されていません');
    if ($cap < 1) fail('定員は1以上の数字を指定してください');
    $pdo = db();
    // 既存予約数(キャンセル以外)
    $booked = [];
    $st = $pdo->prepare("SELECT slot_date, slot_time, COUNT(*) c FROM " . TBL_BOOKINGS . " WHERE school_id=? AND status<>'cancelled' GROUP BY slot_date, slot_time");
    $st->execute([$schoolId]);
    foreach ($st as $r) $booked[$r['slot_date'] . ' ' . hhmm($r['slot_time'])] = (int)$r['c'];
    $updated = 0; $skipped = 0; $skipReasons = [];
    $sel = $pdo->prepare('SELECT slot_date, slot_time FROM ' . TBL_SLOTS . ' WHERE id=? AND school_id=?');
    $upd = $pdo->prepare('UPDATE ' . TBL_SLOTS . ' SET capacity=? WHERE id=? AND school_id=?');
    foreach ($rowNums as $id) {
      $sel->execute([(int)$id, $schoolId]);
      $row = $sel->fetch(); if (!$row) { $skipped++; continue; }
      $key = $row['slot_date'] . ' ' . hhmm($row['slot_time']);
      if (($booked[$key] ?? 0) > $cap) {
        $skipped++;
        $skipReasons[] = $row['slot_date'] . ' ' . hhmm($row['slot_time']) . ' (予約あり)';
        continue;
      }
      $upd->execute([$cap, (int)$id, $schoolId]); $updated++;
    }
    out(['ok' => true, 'updated' => $updated, 'skipped' => $skipped, 'skipReasons' => $skipReasons]);
  }

  case 'admin_deleteSlot': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? ''); $id = (int)($in['rowNum'] ?? 0);
    $st = db()->prepare('DELETE FROM ' . TBL_SLOTS . ' WHERE id=? AND school_id=?');
    $st->execute([$id, $schoolId]);
    out(['ok' => true]);
  }

  case 'admin_deleteSlots': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? '');
    $rowNums = $in['rowNums'] ?? [];
    if (!findSchool($schoolId)) fail('校舎が見つかりません');
    if (!$rowNums) fail('削除対象が指定されていません');
    $pdo = db();
    // 予約済みの枠は削除しない
    $bookedKeys = [];
    $st = $pdo->prepare("SELECT slot_date, slot_time FROM " . TBL_BOOKINGS . " WHERE school_id=? AND status<>'cancelled'");
    $st->execute([$schoolId]);
    foreach ($st as $r) $bookedKeys[$r['slot_date'] . ' ' . hhmm($r['slot_time'])] = true;

    $deleted = 0; $skippedBooked = 0;
    $sel = $pdo->prepare('SELECT slot_date, slot_time FROM ' . TBL_SLOTS . ' WHERE id=? AND school_id=?');
    $del = $pdo->prepare('DELETE FROM ' . TBL_SLOTS . ' WHERE id=? AND school_id=?');
    foreach ($rowNums as $id) {
      $sel->execute([(int)$id, $schoolId]);
      $row = $sel->fetch();
      if (!$row) continue;
      $key = $row['slot_date'] . ' ' . hhmm($row['slot_time']);
      if (!empty($bookedKeys[$key])) { $skippedBooked++; continue; }
      $del->execute([(int)$id, $schoolId]);
      $deleted++;
    }
    out(['ok' => true, 'deleted' => $deleted, 'skippedBooked' => $skippedBooked]);
  }

  // ===== 管理: 予約操作 =====
  case 'admin_cancelBooking': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? ''); $id = (string)($in['id'] ?? '');
    $st = db()->prepare("UPDATE " . TBL_BOOKINGS . " SET status='cancelled' WHERE id=? AND school_id=?");
    $st->execute([$id, $schoolId]);
    if ($st->rowCount() === 0) fail('予約が見つかりません');
    out(['ok' => true]);
  }

  case 'admin_updateBooking': {
    requireAdmin();
    $schoolId = (string)($in['schoolId'] ?? ''); $id = (string)($in['id'] ?? '');
    $st = db()->prepare('SELECT * FROM ' . TBL_BOOKINGS . ' WHERE id=? AND school_id=?');
    $st->execute([$id, $schoolId]);
    $b = $st->fetch();
    if (!$b) fail('予約が見つかりません');

    $newDate = array_key_exists('date', $in) ? (string)$in['date'] : $b['slot_date'];
    $newTime = array_key_exists('time', $in) ? (string)$in['time'] : hhmm($b['slot_time']);
    if ($newDate !== $b['slot_date'] || $newTime !== hhmm($b['slot_time'])) {
      $chk = db()->prepare("SELECT COUNT(*) c FROM " . TBL_BOOKINGS . " WHERE school_id=? AND slot_date=? AND slot_time=? AND status<>'cancelled' AND id<>?");
      $chk->execute([$schoolId, $newDate, $newTime . ':00', $id]);
      if ((int)$chk->fetch()['c'] > 0) fail('変更先の枠はすでに予約されています');
    }

    $sets = []; $vals = [];
    $map = [
      'date' => ['slot_date', fn($v) => $v],
      'time' => ['slot_time', fn($v) => $v . ':00'],
      'childName' => ['child_name', fn($v) => $v],
      'parentName' => ['parent_name', fn($v) => $v],
      'grade' => ['grade', fn($v) => (string)$v],
      'note' => ['note', fn($v) => (string)$v],
      'staffNote' => ['staff_note', fn($v) => (string)$v],
    ];
    foreach ($map as $k => $cfg) {
      if (array_key_exists($k, $in)) { $sets[] = "{$cfg[0]}=?"; $vals[] = $cfg[1]($in[$k]); }
    }
    $touchedInterview = false;
    if (array_key_exists('interviewDone', $in)) { $sets[] = 'interview_done=?'; $vals[] = $in['interviewDone'] ? 1 : 0; $touchedInterview = true; }
    if (array_key_exists('interviewNote', $in)) { $sets[] = 'interview_note=?'; $vals[] = (string)$in['interviewNote']; $touchedInterview = true; }
    if ($touchedInterview) { $sets[] = 'interview_updated=?'; $vals[] = date('Y-m-d H:i:s'); }

    if ($sets) {
      $vals[] = $id;
      $st = db()->prepare('UPDATE ' . TBL_BOOKINGS . ' SET ' . implode(',', $sets) . ' WHERE id=?');
      $st->execute($vals);
    }
    out(['ok' => true]);
  }

  default:
    fail('不明なアクション: ' . $action);
  }
} catch (Throwable $e) {
  error_log('api error: ' . $e->getMessage());
  fail('サーバーエラー: ' . $e->getMessage());
}
