// 日付ユーティリティ（日本時間 JST = UTC+9 固定で扱う）。
// サーバーのタイムゾーンが UTC でも、日本の「今日」を正しく判定するために使用する。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

/** JST での年・月(1-12)・日 */
export function jstYmd(date: Date): { y: number; m: number; d: number } {
  const t = toJst(date);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** JST の "YYYY-MM-DD" 文字列 */
export function jstDateString(date: Date): string {
  const { y, m, d } = jstYmd(date);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** JST の指定日 00:00 に対応する UTC の Date */
export function jstStartOfDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d) - JST_OFFSET_MS);
}

/** 今日(JST)の 00:00 に対応する UTC の Date */
export function jstTodayStart(): Date {
  const { y, m, d } = jstYmd(new Date());
  return jstStartOfDay(y, m, d);
}
