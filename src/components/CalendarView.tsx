"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Reflection = {
  learned: string;
  good: string | null;
  next: string | null;
  mood: number | null;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// 今日(JST)の YYYY-MM-DD
function todayJst(): string {
  const t = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

function formatLabel(ds: string): string {
  const [, m, d] = ds.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

export function CalendarView() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const [year, setYear] = useState(jst.getUTCFullYear());
  const [month, setMonth] = useState(jst.getUTCMonth() + 1); // 1-12
  const [attended, setAttended] = useState<Set<string>>(new Set());
  const [reflectionsByDate, setReflectionsByDate] = useState<
    Record<string, Reflection[]>
  >({});
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelected(null);
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAttended(new Set(data.attended ?? []));
        setReflectionsByDate(data.reflectionsByDate ?? {});
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

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

  const selectedReflections = selected ? reflectionsByDate[selected] ?? [] : [];

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
          const dayReflections = reflectionsByDate[ds] ?? [];
          const hasReflection = dayReflections.length > 0;
          const isToday = ds === today;
          const isSelected = ds === selected;
          const clickable = hasReflection;
          return (
            <button
              key={ds}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && setSelected(isSelected ? null : ds)}
              className={`relative flex aspect-square w-full flex-col items-center justify-center rounded-lg text-sm ${
                isAttended
                  ? "bg-brand-500 font-bold text-white"
                  : "text-gray-600"
              } ${clickable ? "cursor-pointer hover:opacity-90" : "cursor-default"} ${
                isToday && !isAttended ? "ring-2 ring-brand-300" : ""
              } ${isToday && isAttended ? "ring-2 ring-gold-400" : ""} ${
                isSelected ? "outline outline-2 outline-offset-1 outline-brand-600" : ""
              }`}
              title={
                hasReflection
                  ? dayReflections[0].learned.slice(0, 40)
                  : isAttended
                    ? "出席"
                    : undefined
              }
            >
              {d}
              {hasReflection && (
                <span
                  className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                    isAttended ? "bg-gold-300" : "bg-gold-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-brand-500" /> 出席
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-400" />{" "}
          リフレクション（タップで表示）
        </span>
        {loading && <span className="text-gray-400">読み込み中...</span>}
      </div>

      {/* 選択した日のリフレクション内容（モーダル） */}
      {selected && selectedReflections.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-brand-700">
                {formatLabel(selected)} のリフレクション
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="rounded-md px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-3">
              {selectedReflections.map((r, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"
                >
                  {r.mood != null && (
                    <p className="mb-1 text-gold-500">{"★".repeat(r.mood)}</p>
                  )}
                  <p>
                    <span className="font-medium text-gray-500">学んだこと：</span>
                    {r.learned}
                  </p>
                  {r.good && (
                    <p className="mt-1">
                      <span className="font-medium text-gray-500">良かった点：</span>
                      {r.good}
                    </p>
                  )}
                  {r.next && (
                    <p className="mt-1">
                      <span className="font-medium text-gray-500">次に向けて：</span>
                      {r.next}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
