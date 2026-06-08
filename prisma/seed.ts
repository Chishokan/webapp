// 動作テスト用のアカウントを作成するシードスクリプト。
// 実行: DATABASE_URL / DIRECT_URL を設定したうえで `npm run db:seed`
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const testUsers = [
  { name: "テスト一郎", loginId: "test1", grade: "中1", campus: "佐世保駅前校", password: "testpass123" },
  { name: "テスト二郎", loginId: "test2", grade: "中3", campus: "日野校", password: "testpass123" },
  { name: "テスト三郎", loginId: "test3", grade: "高2", campus: "大野校", password: "testpass123" },
];

async function main() {
  for (const u of testUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { loginId: u.loginId },
      update: { name: u.name, grade: u.grade, campus: u.campus, passwordHash },
      create: {
        name: u.name,
        loginId: u.loginId,
        grade: u.grade,
        campus: u.campus,
        passwordHash,
      },
    });
    console.log(`✓ ${user.loginId} (${user.name})`);
  }
  console.log("テストアカウントの作成が完了しました。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
