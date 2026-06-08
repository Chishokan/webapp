import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireStaff, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import type {
  ReportTerm,
  ExamTerm,
  MockTerm,
  Prisma,
} from "@prisma/client";

function handleError(e: unknown) {
  if (e instanceof UnauthorizedError)
    return NextResponse.json({ error: e.message }, { status: 401 });
  if (e instanceof ForbiddenError)
    return NextResponse.json({ error: e.message }, { status: 403 });
  console.error(e);
  return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        campus: true,
        siblings: true,
        reportCards: true,
        exams: true,
        mockTests: true,
      },
    });
    if (!student)
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });
    return NextResponse.json({ student });
  } catch (e) {
    return handleError(e);
  }
}

const num = z.coerce.number().optional().nullable();

const schema = z.object({
  name: z.string().min(1, "名前は必須です").max(50),
  kana: z.string().max(50).optional().nullable(),
  campusId: z.string().min(1, "校舎は必須です"),
  grade: z.coerce.number().int().min(1).max(3).optional().nullable(),
  school: z.string().max(100).optional().nullable(),
  joinedAt: z.string().optional().nullable(),
  aspire: z.string().optional().nullable(),
  dream: z.string().optional().nullable(),
  club: z.string().optional().nullable(),
  clubDays: z.string().optional().nullable(),
  lessons: z.string().optional().nullable(),
  lessonDays: z.string().optional().nullable(),
  subjects: z.array(z.string()).optional(),
  eikenLevel: z.string().optional().nullable(),
  kankenLevel: z.string().optional().nullable(),
  suikenLevel: z.string().optional().nullable(),
  guardian: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  reportCards: z
    .array(
      z.object({
        term: z.string(),
        subject: z.string(),
        grade: z.coerce.number().int().min(1).max(5),
      })
    )
    .optional(),
  exams: z
    .array(
      z.object({
        term: z.string(),
        subject: z.string(),
        score: z.coerce.number().int(),
      })
    )
    .optional(),
  mockTests: z
    .array(
      z.object({
        term: z.string(),
        japanese: num,
        math: num,
        english: num,
        science: num,
        social: num,
        fiveSubjectDev: num,
      })
    )
    .optional(),
  siblings: z
    .array(
      z.object({
        name: z.string().min(1),
        school: z.string().optional().nullable(),
        status: z.string().optional().nullable(),
      })
    )
    .optional(),
});

function s(v: string | null | undefined): string | null {
  return v && v.trim() !== "" ? v : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "入力が不正です" },
        { status: 400 }
      );
    }
    const d = parsed.data;

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing)
      return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    const campus = await prisma.campus.findUnique({ where: { id: d.campusId } });
    if (!campus)
      return NextResponse.json({ error: "校舎が存在しません" }, { status: 400 });

    let joined: Date | null = null;
    if (d.joinedAt && d.joinedAt.trim() !== "") {
      const dt = new Date(d.joinedAt);
      if (!isNaN(dt.getTime())) joined = dt;
    }

    // 成績は全置換（空セルは送られてこない想定）
    const reportCards: Prisma.ReportCardCreateManyStudentInput[] = (
      d.reportCards ?? []
    ).map((r) => ({
      term: r.term as ReportTerm,
      subject: r.subject,
      grade: r.grade,
    }));
    const exams: Prisma.ExamScoreCreateManyStudentInput[] = (d.exams ?? []).map(
      (e) => ({ term: e.term as ExamTerm, subject: e.subject, score: e.score })
    );
    const mockTests: Prisma.MockTestCreateManyStudentInput[] = (
      d.mockTests ?? []
    ).map((m) => ({
      term: m.term as MockTerm,
      japanese: m.japanese ?? null,
      math: m.math ?? null,
      english: m.english ?? null,
      science: m.science ?? null,
      social: m.social ?? null,
      fiveSubjectDev: m.fiveSubjectDev ?? null,
    }));
    const siblings = (d.siblings ?? [])
      .filter((sb) => sb.name.trim() !== "")
      .map((sb) => ({ name: sb.name, school: s(sb.school), status: s(sb.status) }));

    await prisma.$transaction([
      prisma.student.update({
        where: { id },
        data: {
          kana: s(d.kana),
          campus: { connect: { id: d.campusId } },
          grade: d.grade ?? null,
          school: s(d.school),
          joinedAt: joined,
          aspire: s(d.aspire),
          dream: s(d.dream),
          club: s(d.club),
          clubDays: s(d.clubDays),
          lessons: s(d.lessons),
          lessonDays: s(d.lessonDays),
          subjects: d.subjects ?? [],
          eikenLevel: s(d.eikenLevel),
          kankenLevel: s(d.kankenLevel),
          suikenLevel: s(d.suikenLevel),
          guardian: s(d.guardian),
          notes: s(d.notes),
          user: {
            update: {
              name: d.name,
              grade: d.grade ? `中${d.grade}` : "-",
              campus: campus.name,
            },
          },
        },
      }),
      // 成績・兄弟生は全置換
      prisma.reportCard.deleteMany({ where: { studentId: id } }),
      prisma.examScore.deleteMany({ where: { studentId: id } }),
      prisma.mockTest.deleteMany({ where: { studentId: id } }),
      prisma.sibling.deleteMany({ where: { studentId: id } }),
      prisma.reportCard.createMany({
        data: reportCards.map((r) => ({ ...r, studentId: id })),
      }),
      prisma.examScore.createMany({
        data: exams.map((e) => ({ ...e, studentId: id })),
      }),
      prisma.mockTest.createMany({
        data: mockTests.map((m) => ({ ...m, studentId: id })),
      }),
      prisma.sibling.createMany({
        data: siblings.map((sb) => ({ ...sb, studentId: id })),
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
