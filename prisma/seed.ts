// 動作テスト用のアカウントを作成するシードスクリプト。
// 実行: DATABASE_URL / DIRECT_URL を設定したうえで `npm run db:seed`
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const testUsers = [
  { name: "テスト一郎", email: "test1@ohayou.test", password: "testpass123" },
  { name: "テスト二郎", email: "test2@ohayou.test", password: "testpass123" },
  { name: "テスト三郎", email: "test3@ohayou.test", password: "testpass123" },
];

async function main() {
  for (const u of testUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash },
      create: { name: u.name, email: u.email, passwordHash },
    });
    console.log(`✓ ${user.email} (${user.name})`);
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
