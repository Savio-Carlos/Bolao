import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").trim().toLowerCase();
  const user = await prisma.user.upsert({
    where: { username },
    create: { username, isAdmin: true },
    update: { isAdmin: true },
  });
  console.log(`Admin pronto: "${user.username}" (id ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
