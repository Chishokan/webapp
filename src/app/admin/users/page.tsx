import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function AdminUsersPage() {
  const me = await getCurrentUser();
  const users = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "SUPER_ADMIN"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
  });

  return (
    <UsersManager
      users={users}
      isSuperAdmin={me?.role === "SUPER_ADMIN"}
      selfId={me?.id ?? ""}
    />
  );
}
