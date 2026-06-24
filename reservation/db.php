<?php
require_once __DIR__ . '/config.php';

function db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
  }
  return $pdo;
}

/** 校舎一覧(表示順) */
function getSchools(): array {
  $rows = db()->query('SELECT id, name FROM schools ORDER BY sort_order, id')->fetchAll();
  return $rows;
}

function findSchool(string $id): ?array {
  $st = db()->prepare('SELECT id, name, notify_email FROM schools WHERE id = ?');
  $st->execute([$id]);
  $row = $st->fetch();
  return $row ?: null;
}

/** TIME(HH:MM:SS) → HH:MM */
function hhmm(string $t): string {
  return substr($t, 0, 5);
}
