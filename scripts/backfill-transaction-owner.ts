/**
 * One-off backfill for the "transaction created with no userId" bug
 * (transactions.service.ts didn't persist the requesting user's id before this fix).
 *
 * Scope: only touches transactions in a PERSONAL workspace (isPersonal = true) that
 * have no userId AND no paidByMemberId — the only case where "who owns this" is
 * unambiguous (a personal workspace has exactly one possible owner). Transactions in
 * shared workspaces are left untouched and only reported, since there's no reliable
 * way to know which member actually logged them.
 *
 * Usage:
 *   DATABASE_URL=<prod-url> npx ts-node scripts/backfill-transaction-owner.ts            # dry run (default)
 *   DATABASE_URL=<prod-url> npx ts-node scripts/backfill-transaction-owner.ts --apply     # actually writes
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
    console.log(APPLY ? '🔧 Running in APPLY mode — this will write to the database.' : '🔍 Running in DRY RUN mode — no writes will be made (pass --apply to write).');

    const personalWorkspaces = await prisma.workspace.findMany({
        where: { isPersonal: true },
        select: { id: true, ownerId: true, name: true },
    });

    let totalFixed = 0;

    for (const ws of personalWorkspaces) {
        const orphaned = await prisma.transaction.findMany({
            where: { workspaceId: ws.id, userId: null, paidByMemberId: null },
            select: { id: true, date: true },
        });

        if (orphaned.length === 0) continue;

        console.log(`Workspace "${ws.name}" (${ws.id}): ${orphaned.length} orphaned transaction(s) -> owner ${ws.ownerId}`);
        totalFixed += orphaned.length;

        if (APPLY) {
            await prisma.transaction.updateMany({
                where: { id: { in: orphaned.map((t) => t.id) } },
                data: { userId: ws.ownerId },
            });
        }
    }

    console.log(`\n${APPLY ? 'Fixed' : 'Would fix'} ${totalFixed} transaction(s) in personal workspaces.`);

    // Report-only: shared-workspace transactions with no owner and no payer can't be
    // safely auto-assigned (any of the workspace's members could have logged it).
    const unresolvedShared = await prisma.transaction.findMany({
        where: { userId: null, paidByMemberId: null, workspace: { isPersonal: false } },
        select: { id: true, date: true, workspaceId: true, workspace: { select: { name: true } } },
    });

    if (unresolvedShared.length > 0) {
        console.log(`\n⚠️  ${unresolvedShared.length} transaction(s) in shared workspaces still have no owner and no payer — can't be auto-assigned, review manually:`);
        for (const tx of unresolvedShared) {
            console.log(`  - ${tx.id} · workspace "${tx.workspace.name}" (${tx.workspaceId}) · ${tx.date.toISOString().slice(0, 10)}`);
        }
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
