// 生徒データ → 編集モーダルの初期値 への変換（カード/詳細ページで共用）

export type StudentEditorInitial = {
  id: string;
  name: string;
  kana: string;
  campusId: string;
  grade: string;
  school: string;
  joinedAt: string;
  aspire: string;
  dream: string;
  club: string;
  clubDays: string;
  lessons: string;
  lessonDays: string;
  subjects: string[];
  eikenLevel: string;
  kankenLevel: string;
  suikenLevel: string;
  guardian: string;
  notes: string;
  reportCards: { term: string; subject: string; grade: number }[];
  exams: { term: string; subject: string; score: number }[];
  mockTests: {
    term: string;
    japanese: number | null;
    math: number | null;
    english: number | null;
    science: number | null;
    social: number | null;
    fiveSubjectDev: number | null;
  }[];
  siblings: { name: string; school: string | null; status: string | null }[];
};

type StudentLike = {
  id: string;
  user: { name: string };
  kana: string | null;
  campusId: string | null;
  grade: number | null;
  school: string | null;
  joinedAt: Date | null;
  aspire: string | null;
  dream: string | null;
  club: string | null;
  clubDays: string | null;
  lessons: string | null;
  lessonDays: string | null;
  subjects: string[];
  eikenLevel: string | null;
  kankenLevel: string | null;
  suikenLevel: string | null;
  guardian: string | null;
  notes: string | null;
  reportCards: { term: string; subject: string; grade: number }[];
  exams: { term: string; subject: string; score: number }[];
  mockTests: {
    term: string;
    japanese: number | null;
    math: number | null;
    english: number | null;
    science: number | null;
    social: number | null;
    fiveSubjectDev: number | null;
  }[];
  siblings: { name: string; school: string | null; status: string | null }[];
};

export function ymdJst(d: Date | null): string {
  if (!d) return "";
  const x = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
}

export function studentToInitial(s: StudentLike): StudentEditorInitial {
  return {
    id: s.id,
    name: s.user.name,
    kana: s.kana ?? "",
    campusId: s.campusId ?? "",
    grade: s.grade?.toString() ?? "",
    school: s.school ?? "",
    joinedAt: ymdJst(s.joinedAt),
    aspire: s.aspire ?? "",
    dream: s.dream ?? "",
    club: s.club ?? "",
    clubDays: s.clubDays ?? "",
    lessons: s.lessons ?? "",
    lessonDays: s.lessonDays ?? "",
    subjects: s.subjects,
    eikenLevel: s.eikenLevel ?? "",
    kankenLevel: s.kankenLevel ?? "",
    suikenLevel: s.suikenLevel ?? "",
    guardian: s.guardian ?? "",
    notes: s.notes ?? "",
    reportCards: s.reportCards.map((r) => ({
      term: r.term,
      subject: r.subject,
      grade: r.grade,
    })),
    exams: s.exams.map((e) => ({ term: e.term, subject: e.subject, score: e.score })),
    mockTests: s.mockTests.map((m) => ({
      term: m.term,
      japanese: m.japanese,
      math: m.math,
      english: m.english,
      science: m.science,
      social: m.social,
      fiveSubjectDev: m.fiveSubjectDev,
    })),
    siblings: s.siblings.map((sb) => ({
      name: sb.name,
      school: sb.school,
      status: sb.status,
    })),
  };
}
