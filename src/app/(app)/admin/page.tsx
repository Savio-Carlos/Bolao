import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import AdminPanel, { type AdminUser } from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (!me.isAdmin) redirect("/");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const matchCount = await prisma.match.count();

  const list: AdminUser[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    isAdmin: u.isAdmin,
  }));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      <AdminPanel users={list} myId={me.id} matchCount={matchCount} />
    </div>
  );
}
