// 塾カルテの教科・期の定義（GAS版の並びを踏襲）

// 通知表：10教科（並び固定）×5期、評定1〜5
export const REPORT_SUBJECTS = [
  "国語",
  "数学",
  "英語",
  "理科",
  "社会",
  "美術",
  "音楽",
  "保健体育",
  "技術",
  "家庭科",
] as const;

export const REPORT_TERMS = [
  { key: "PREV_T3", label: "前年3学期" },
  { key: "GOAL_T1", label: "1学期目標" },
  { key: "T1", label: "1学期" },
  { key: "T2", label: "2学期" },
  { key: "T3", label: "3学期" },
] as const;

// 定期試験：5教科×5期、点数
export const EXAM_SUBJECTS = ["国語", "数学", "英語", "理科", "社会"] as const;

export const EXAM_TERMS = [
  { key: "PREV_T3", label: "前年3学期" },
  { key: "T1", label: "1学期" },
  { key: "T2", label: "2学期" },
  { key: "T3", label: "3学期" },
  { key: "GOAL", label: "目標" },
] as const;

// 模試：5回
export const MOCK_TERMS = [
  { key: "APR", label: "4月実判" },
  { key: "JUL", label: "7月県一斉" },
  { key: "AUG", label: "8月実判" },
  { key: "OCT", label: "10月県一斉" },
  { key: "JAN", label: "1月実判" },
] as const;

// 模試の教科キー（MockTest のカラム）
export const MOCK_SUBJECTS = [
  { key: "japanese", label: "国語" },
  { key: "math", label: "数学" },
  { key: "english", label: "英語" },
  { key: "science", label: "理科" },
  { key: "social", label: "社会" },
] as const;

// 受講科目の選択肢
export const SUBJECT_OPTIONS = ["国", "数", "英", "理", "社"] as const;

export type ReportTermKey = (typeof REPORT_TERMS)[number]["key"];
export type ExamTermKey = (typeof EXAM_TERMS)[number]["key"];
export type MockTermKey = (typeof MOCK_TERMS)[number]["key"];
export type MockSubjectKey = (typeof MOCK_SUBJECTS)[number]["key"];

export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function sum(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0);
}
