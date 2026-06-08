-- 認証方式の変更(メール -> ログインID)と生徒プロフィール(学年/所属校舎)の追加。
-- 必須カラムを追加するため、既存ユーザー(旧方式のテストアカウント)は一旦削除する。
-- 関連する出席/リフレクション/チャットは onDelete: Cascade により連動削除される。
DELETE FROM "User";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
ADD COLUMN     "campus" TEXT NOT NULL,
ADD COLUMN     "grade" TEXT NOT NULL,
ADD COLUMN     "loginId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_loginId_key" ON "User"("loginId");
