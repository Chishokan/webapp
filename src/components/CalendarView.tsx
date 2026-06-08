"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 今日(JST)の YYYY-MM-DD
function todayJst(): string {
  const t = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function CalendarView() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const [year, setYear] = useState(jst.getUTCFullYear());
  const [month, setMonth] = useState(jst.getUTCMonth() + 1); // 1-12
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [reflected, setReflected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAttended(new Set(data.attended ?? []));
        setReflected(new Set(data.reflected ?? []));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setYear(y);
    setMonth(m);
  }

  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = todayJst();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">📅 出席カレンダー</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label="前の月"
          >
            ◀
          </button>
          <span className="w-28 text-center text-sm font-medium text-gray-700">
            {year}年 {month}月
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label="次の月"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-1 font-medium ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
            }`}
          >
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const ds = `${year}-${pad(month)}-${pad(d)}`;
          const isAttended = attended.has(ds);
          const isReflected = reflected.has(ds);
          const isToday = ds === today;
          return (
            <div
              key={ds}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                isAttended
                  ? "bg-brand-500 font-bold text-white"
                  : "text-gray-600"
              } ${isToday && !isAttended ? "ring-2 ring-brand-300" : ""} ${
                isToday && isAttended ? "ring-2 ring-gold-400" : ""
              }`}
              title={
                [isAttended ? "出席" : "", isReflected ? "リフレクション" : ""]
                  .filter(Boolean)
                  .join(" / ") || undefined
              }
            >
              {d}
              {isReflected && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                    isAttended ? "bg-gold-300" : "bg-gold-400"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-500" /> 出席
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400" />{" "}
          リフレクション
        </span>
        {loading && <span className="text-gray-400">読み込み中...</span>}
      </div>
    </div>
  );
}
