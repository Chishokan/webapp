import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatBox } from "@/components/ChatBox";

export default async function ChatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const history = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">④ AIチャット</h1>
        <p className="mt-1 text-gray-500">
          勉強の質問や相談を、AIに気軽に聞いてみましょう。
        </p>
      </div>

      <ChatBox
        initialMessages={history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
      />
    </div>
  );
}
