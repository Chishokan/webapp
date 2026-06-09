/**
 * GASスプレッドシート → PostgreSQL データ移行（CLI版）。
 * Webの「CSVインポート」(管理画面)と同じロジック(src/lib/gas-import.ts)を使用。
 *
 *   1. scripts/gas-export/students.csv を配置
 *   2. DATABASE_URL / DIRECT_URL を設定して:
 *        npx tsx scripts/import-from-gas.ts            # 取り込み
 *        npx tsx scripts/import-from-gas.ts --dry-run  # 件数のみ確認
 *
 *   ※ CSVには個人情報が含まれるためコミット禁止(.gitignore済)。
 *   ※ interviews.csv / advice.csv / config.csv は今後対応。
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { importStudentsFromCsv, csvToObjects } from "../src/lib/gas-import";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const path = join(process.cwd(), "scripts", "gas-export", "students.csv");

async function main() {
  if (!existsSync(path)) {
    console.error("scripts/gas-export/students.csv が見つかりません");
    process.exit(1);
  }
  const text = readFileSync(path, "utf8");
  if (DRY_RUN) {
    const rows = csvToObjects(text);
    console.log(`=== DRY RUN === Students: ${rows.length}行`);
    rows.slice(0, 5).forEach((r) =>
      console.log(`  - [${r.id}] ${r.name} / ${r.campus} / 中${r.grade}`)
    );
    return;
  }
  console.log("=== 取り込み実行 ===");
  const result = await importStudentsFromCsv(prisma, text);
  console.log(
    `完了: 合計${result.total}名 (新規${result.created} / 更新${result.updated})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
