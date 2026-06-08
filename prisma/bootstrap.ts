// 本番初期化(ベキ等)スクリプト。ビルド時に実行され、以下を保証する:
//  - 校舎マスタ(4校舎)
//  - 最上級管理者(super_admin) アカウント
// パスワードは作成時のみ設定し、再実行では上書きしない。
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CAMPUSES = ["佐世保駅前校", "日野校", "大野校", "日宇校"];

// super_admin の初期パスワードハッシュ(初回作成時のみ使用)。
// 平文は別途管理者に通知済み。初回ログイン後に変更してください。
const SUPER_ADMIN = {
  email: "junpei.ando721@gmail.com",
  loginId: "admin",
  name: "管理者",
  passwordHash: "$2a$10$Vs0NgcF.qv03v27NXgtGJeVdHOlMcfWpZCFIzviUzlhZ6pfg/9huO",
};

async function main() {
  // 校舎
  for (let i = 0; i < CAMPUSES.length; i++) {
    await prisma.campus.upsert({
      where: { name: CAMPUSES[i] },
      update: { order: i + 1 },
      create: { name: CAMPUSES[i], order: i + 1 },
    });
  }
  console.log(`✓ 校舎マスタ ${CAMPUSES.length}件`);

  // super_admin（作成時のみパスワード設定、再実行では role と表示名のみ整える）
  const admin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN.email },
    update: { role: "SUPER_ADMIN", name: SUPER_ADMIN.name },
    create: {
      email: SUPER_ADMIN.email,
      loginId: SUPER_ADMIN.loginId,
      name: SUPER_ADMIN.name,
      grade: "-",
      campus: "-",
      role: "SUPER_ADMIN",
      passwordHash: SUPER_ADMIN.passwordHash,
    },
  });
  await prisma.teacher.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id, displayName: SUPER_ADMIN.name },
  });
  console.log(`✓ super_admin: ${SUPER_ADMIN.email}`);
}

main()
  .catch((e) => {
    console.error("bootstrap失敗:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
