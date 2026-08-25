import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BudgetsService } from '../budgets/budgets.service';
import { TransactionsService } from '../transactions/transactions.service';
import { InstallmentDateMode } from './dto/installment.dto';
import { nextOccurrenceOfDay } from './installment-dates.util';

@Injectable()
export class InstallmentsScheduler {
    constructor(
        private prisma: PrismaService,
        private encryption: EncryptionService,
        private notifications: NotificationsService,
        private budgetsService: BudgetsService,
        private transactionsService: TransactionsService,
    ) { }

    @Cron('0 0 * * *')
    async processDueInstallments() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Prisma can't compare two columns (installmentsPaid < totalInstallments) in `where`,
        // so fetch active+due purchases and filter the remainder in app code.
        const candidates = await this.prisma.installmentPurchase.findMany({
            where: { isActive: true, nextChargeDate: { lte: today } },
        });

        for (const purchase of candidates) {
            if (purchase.installmentsPaid >= purchase.totalInstallments) continue;

            const installmentNumber = purchase.installmentsPaid + 1;

            const transaction = await this.prisma.transaction.create({
                data: {
                    amount: purchase.installmentAmount,
                    currency: purchase.currency,
                    date: today,
                    type: purchase.type,
                    description: this.encryption.encrypt(purchase.description),
                    categoryId: purchase.categoryId,
                    workspaceId: purchase.workspaceId,
                    paidByMemberId: purchase.paidByMemberId,
                    paymentMethod: purchase.paymentMethod,
                    bankAccountId: purchase.bankAccountId,
                    cardId: purchase.cardId,
                    installmentPurchaseId: purchase.id,
                    installmentNumber,
                },
            });

            if (purchase.bankAccountId) {
                await this.transactionsService.recalculateBalance(purchase.bankAccountId);
            }

            try {
                const month = today.getMonth() + 1;
                const year = today.getFullYear();
                const result = await this.budgetsService.checkExceeded(purchase.workspaceId, purchase.categoryId, month, year);
                if (result.exceeded) {
                    const members = await this.prisma.workspaceMember.findMany({
                        where: { workspaceId: purchase.workspaceId, userId: { not: null } },
                    });
                    for (const member of members) {
                        await this.notifications.create(member.userId as string, {
                            type: 'BUDGET_EXCEEDED',
                            message: `Budget exceeded for category`,
                        });
                    }
                }
            } catch { /* budget check failures shouldn't block the charge */ }

            const isLastInstallment = installmentNumber >= purchase.totalInstallments;
            const day = purchase.dateMode === InstallmentDateMode.STATEMENT
                ? (await this.prisma.card.findUnique({ where: { id: purchase.cardId as string } }))?.statementCloseDay
                : purchase.fixedDay;

            await this.prisma.installmentPurchase.update({
                where: { id: purchase.id },
                data: {
                    installmentsPaid: installmentNumber,
                    nextChargeDate: isLastInstallment || !day
                        ? purchase.nextChargeDate
                        : nextOccurrenceOfDay(purchase.nextChargeDate, day),
                    isActive: !isLastInstallment,
                },
            });

            const members = await this.prisma.workspaceMember.findMany({
                where: { workspaceId: purchase.workspaceId, userId: { not: null } },
            });
            for (const member of members) {
                await this.notifications.create(member.userId as string, {
                    type: 'INSTALLMENT_CHARGED',
                    message: `"${purchase.description}" — cuota ${installmentNumber}/${purchase.totalInstallments} cobrada (${purchase.currency} ${purchase.installmentAmount}).`,
                    metadata: { installmentPurchaseId: purchase.id, transactionId: transaction.id },
                });
            }
        }
    }
}
