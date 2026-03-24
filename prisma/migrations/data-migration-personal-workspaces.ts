import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

/**
 * One-time data migration: creates personal workspaces for existing users
 * and backfills workspaceId on orphaned records.
 *
 * Uses raw SQL for null checks since workspaceId is now required in the schema
 * but legacy data may still have NULLs in the database.
 */
async function main() {
  console.log('Iniciando data migration: workspaces personales...');

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  console.log(`Procesando ${users.length} usuarios...`);

  for (const user of users) {
    const existingPersonal = await prisma.workspace.findFirst({
      where: { ownerId: user.id, isPersonal: true },
    });

    let personalWorkspaceId: string;

    if (existingPersonal) {
      personalWorkspaceId = existingPersonal.id;
      console.log(`  [SKIP] Usuario ${user.email} ya tiene workspace personal`);
    } else {
      const personalWorkspace = await prisma.workspace.create({
        data: {
          name: 'Personal',
          isPersonal: true,
          ownerId: user.id,
          cutoffDay: 1,
          inviteToken: randomBytes(16).toString('hex'),
          members: {
            create: {
              userId: user.id,
              email: user.email,
              nameAlias: user.name,
              responsibilityPercentage: 100,
            },
          },
        },
      });
      personalWorkspaceId = personalWorkspace.id;
      console.log(`  [OK] Workspace personal creado para ${user.email}: ${personalWorkspaceId}`);
    }

    // Backfill using raw SQL (workspaceId is required in schema but may be NULL in DB)
    const tables = ['BankAccount', 'Budget', 'Saving', 'Transaction'];
    for (const table of tables) {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "workspaceId" = $1 WHERE "workspaceId" IS NULL`,
        personalWorkspaceId,
      );
      console.log(`    ${table} actualizadas: ${result}`);
    }
  }

  // Verify no orphans remain
  const orphans = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT (
      (SELECT COUNT(*) FROM "BankAccount" WHERE "workspaceId" IS NULL) +
      (SELECT COUNT(*) FROM "Budget" WHERE "workspaceId" IS NULL) +
      (SELECT COUNT(*) FROM "Saving" WHERE "workspaceId" IS NULL) +
      (SELECT COUNT(*) FROM "Transaction" WHERE "workspaceId" IS NULL)
    ) as total
  `;

  const total = Number(orphans[0]?.total ?? 0);
  if (total > 0) {
    throw new Error(`Quedan ${total} registros sin workspaceId`);
  }

  console.log('Data migration completada exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error en data migration:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
