import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UsersManager } from "@/components/admin/UsersManager";
import { CsvImporter } from "@/components/admin/CsvImporter";

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  const isSuperAdmin = me?.role === "SUPER_ADMIN";
  const users = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "SUPER_ADMIN"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <UsersManager users={users} isSuperAdmin={isSuperAdmin} selfId={me?.id ?? ""} />
      {isSuperAdmin && <CsvImporter />}
    </div>
  );
}
