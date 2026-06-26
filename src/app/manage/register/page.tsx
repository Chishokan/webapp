import { redirect } from "next/navigation";
import { getManageAccess } from "@/lib/manage-auth";
import { UserRegister } from "@/components/manage/UserRegister";

export default async function ManageRegisterPage() {
  // 登録は admin(ohayou-admin) のみ
  const { isAdmin } = await getManageAccess();
  if (!isAdmin) redirect("/manage");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">ユーザー登録</h2>
        <p className="mt-1 text-sm text-gray-500">
          生徒・管理者(職員)のアカウントを作成します（admin専用）。
        </p>
      </div>
      <UserRegister />
    </div>
  );
}
