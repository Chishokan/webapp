-- 面談予約システム (XServer / MySQL)
-- 文字コードは utf8mb4。XServerのphpMyAdmin等でこのSQLを実行してください。

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schools (
  id           VARCHAR(32)  NOT NULL,
  name         VARCHAR(100) NOT NULL,
  notify_email VARCHAR(500) NOT NULL DEFAULT '',
  sort_order   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS slots (
  id         INT          NOT NULL AUTO_INCREMENT,
  school_id  VARCHAR(32)  NOT NULL,
  slot_date  DATE         NOT NULL,
  slot_time  TIME         NOT NULL,
  label      VARCHAR(255) NOT NULL DEFAULT '',
  published  TINYINT(1)   NOT NULL DEFAULT 1,
  capacity   INT          NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slot (school_id, slot_date, slot_time),
  KEY idx_school_date (school_id, slot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id                VARCHAR(40)  NOT NULL,
  school_id         VARCHAR(32)  NOT NULL,
  slot_date         DATE         NOT NULL,
  slot_time         TIME         NOT NULL,
  child_name        VARCHAR(100) NOT NULL,
  parent_name       VARCHAR(100) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  grade             VARCHAR(50)  NOT NULL DEFAULT '',
  note              TEXT         NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'confirmed',
  created_at        DATETIME     NOT NULL,
  staff_note        TEXT         NULL,
  reminder_sent     DATETIME     NULL,
  interview_done    TINYINT(1)   NOT NULL DEFAULT 0,
  interview_note    TEXT         NULL,
  interview_updated DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_school_date (school_id, slot_date),
  KEY idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 校舎マスタ(通知先メールはスプレッドシートの値で初期化。後で変更可)
INSERT INTO schools (id, name, notify_email, sort_order) VALUES
  ('hirota',   'RED広田教室',     'chishokan.fukumoto@gmail.com', 1),
  ('kyomachi', 'RED京町教室',     'rierioria@icloud.com',         2),
  ('hino',     'RED日野教室',     'kametamiarata@gmail.com',      3),
  ('saza',     'RED佐々教室',     'kametamiarata@gmail.com',      4),
  ('oshima',   'RED西海大島教室', 'tomitas.red@gmail.com',        5),
  ('ono',      'RED大野教室',     'shinyanakayama0723@gmail.com', 6),
  ('nexta',    'ネクスタ',         '0nf2w95w7850v9r@gmail.com',     7)
ON DUPLICATE KEY UPDATE name = VALUES(name);
