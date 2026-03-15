import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando data migration: workspaces personales...');

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  console.log(`Procesando ${users.length} usuarios...`);

  for (const user of users) {
    // 1. Verificar si ya tiene workspace personal
    const existingPersonal = await prisma.workspace.findFirst({
      where: { ownerId: user.id, isPersonal: true },
    });

    let personalWorkspaceId: string;

    if (existingPersonal) {
      personalWorkspaceId = existingPersonal.id;
      console.log(`  [SKIP] Usuario ${user.email} ya tiene workspace personal`);
    } else {
      // 2. Crear workspace personal
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

    // 3. Backfill BankAccount
    const accountsUpdated = await prisma.bankAccount.updateMany({
      where: { userId: user.id, workspaceId: null },
      data: { workspaceId: personalWorkspaceId },
    });
    console.log(`    BankAccounts actualizadas: ${accountsUpdated.count}`);

    // 4. Backfill Budget
    const budgetsUpdated = await prisma.budget.updateMany({
      where: { userId: user.id, workspaceId: null },
      data: { workspaceId: personalWorkspaceId },
    });
    console.log(`    Budgets actualizados: ${budgetsUpdated.count}`);

    // 5. Backfill Saving
    const savingsUpdated = await prisma.saving.updateMany({
      where: { userId: user.id, workspaceId: null },
      data: { workspaceId: personalWorkspaceId },
    });
    console.log(`    Savings actualizados: ${savingsUpdated.count}`);

    // 6. Backfill Transaction (las personales: workspaceId === null)
    const txUpdated = await prisma.transaction.updateMany({
      where: { userId: user.id, workspaceId: null },
      data: { workspaceId: personalWorkspaceId },
    });
    console.log(`    Transactions actualizadas: ${txUpdated.count}`);
  }

  // 7. Verificar que no quedaron registros sin workspaceId
  const orphanAccounts = await prisma.bankAccount.count({ where: { workspaceId: null } });
  const orphanBudgets = await prisma.budget.count({ where: { workspaceId: null } });
  const orphanSavings = await prisma.saving.count({ where: { workspaceId: null } });
  const orphanTx = await prisma.transaction.count({ where: { workspaceId: null } });

  if (orphanAccounts + orphanBudgets + orphanSavings + orphanTx > 0) {
    throw new Error(
      `❌ Quedan registros sin workspaceId: accounts=${orphanAccounts}, budgets=${orphanBudgets}, savings=${orphanSavings}, tx=${orphanTx}`,
    );
  }

  console.log('✅ Data migration completada exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en data migration:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
