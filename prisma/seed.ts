import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // 1. Seed default categories (PERSONAL scope)
    const categories = [
        // EXPENSE categories
        { name: 'Alimentación', type: 'EXPENSE', color: '#10b981', icon: 'ShoppingCart', scope: 'PERSONAL' },
        { name: 'Transporte', type: 'EXPENSE', color: '#3b82f6', icon: 'Car', scope: 'PERSONAL' },
        { name: 'Entretenimiento', type: 'EXPENSE', color: '#8b5cf6', icon: 'Film', scope: 'PERSONAL' },
        { name: 'Salud', type: 'EXPENSE', color: '#ef4444', icon: 'Heart', scope: 'PERSONAL' },
        { name: 'Educación', type: 'EXPENSE', color: '#f59e0b', icon: 'BookOpen', scope: 'PERSONAL' },
        { name: 'Vivienda', type: 'EXPENSE', color: '#6366f1', icon: 'Home', scope: 'PERSONAL' },
        { name: 'Servicios', type: 'EXPENSE', color: '#14b8a6', icon: 'Zap', scope: 'PERSONAL' },
        { name: 'Otros Gastos', type: 'EXPENSE', color: '#64748b', icon: 'MoreHorizontal', scope: 'PERSONAL' },

        // INCOME categories
        { name: 'Salario', type: 'INCOME', color: '#22c55e', icon: 'Briefcase', scope: 'PERSONAL' },
        { name: 'Freelance', type: 'INCOME', color: '#06b6d4', icon: 'Code', scope: 'PERSONAL' },
        { name: 'Inversiones', type: 'INCOME', color: '#a855f7', icon: 'TrendingUp', scope: 'PERSONAL' },
        { name: 'Otros Ingresos', type: 'INCOME', color: '#84cc16', icon: 'PlusCircle', scope: 'PERSONAL' },
    ];

    for (const category of categories) {
        await prisma.category.upsert({
            where: {
                id: `default-${category.name.toLowerCase().replace(/\s/g, '-')}`
            },
            update: {},
            create: {
                id: `default-${category.name.toLowerCase().replace(/\s/g, '-')}`,
                ...category,
            },
        });
    }

    console.log('✅ Default categories seeded');

    // 2. Seed exchange rates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exchangeRates = [
        { fromCurrency: 'ARS', toCurrency: 'USD', rate: 0.0010 }, // 1 ARS = 0.001 USD (approx 1000 ARS = 1 USD)
        { fromCurrency: 'USD', toCurrency: 'ARS', rate: 1000.0 },
        { fromCurrency: 'ARS', toCurrency: 'BRL', rate: 0.0050 },
        { fromCurrency: 'BRL', toCurrency: 'ARS', rate: 200.0 },
        { fromCurrency: 'USD', toCurrency: 'BRL', rate: 5.0 },
        { fromCurrency: 'BRL', toCurrency: 'USD', rate: 0.20 },
    ];

    for (const rate of exchangeRates) {
        await prisma.exchangeRate.upsert({
            where: {
                fromCurrency_toCurrency_date: {
                    fromCurrency: rate.fromCurrency,
                    toCurrency: rate.toCurrency,
                    date: today,
                },
            },
            update: { rate: rate.rate },
            create: {
                ...rate,
                date: today,
            },
        });
    }

    console.log('✅ Exchange rates seeded');

    // 3. Seed dev user (optional, controlled by env)
    if (process.env.SEED_DEV_USER === 'true') {
        const devEmail = 'dev@harmony.com';
        const devPassword = await hash('dev123', 10);

        const devUser = await prisma.user.upsert({
            where: { email: devEmail },
            update: {},
            create: {
                email: devEmail,
                password: devPassword,
                name: 'Dev',
                lastName: 'User',
                preferredCurrency: 'ARS',
            },
        });

        console.log('✅ Dev user created:', devEmail);

        // Create sample bank account
        const bankAccount = await prisma.bankAccount.create({
            data: {
                userId: devUser.id,
                name: 'Cuenta Principal',
                type: 'BANK',
                currency: 'ARS',
                currentBalance: 500000,
                initialBalance: 500000,
            },
        });

        console.log('✅ Sample bank account created');

        // Create sample card
        await prisma.card.create({
            data: {
                name: 'Tarjeta Visa',
                type: 'CREDIT',
                currency: 'ARS',
                creditLimit: 200000,
                linkedBankAccountId: bankAccount.id,
                statementCloseDay: 15,
                dueDay: 25,
            },
        });

        console.log('✅ Sample card created');

        // Create sample budget
        const currentDate = new Date();
        await prisma.budget.create({
            data: {
                userId: devUser.id,
                amount: 100000,
                currency: 'ARS',
                type: 'GENERAL',
                month: currentDate.getMonth() + 1,
                year: currentDate.getFullYear(),
            },
        });

        console.log('✅ Sample budget created');

        // Create sample saving
        await prisma.saving.create({
            data: {
                userId: devUser.id,
                amount: 50000,
                currency: 'ARS',
                description: 'Ahorro para emergencias',
            },
        });

        console.log('✅ Sample saving created');

        // Create sample transactions
        const expenseCategory = await prisma.category.findFirst({
            where: { name: 'Alimentación', scope: 'PERSONAL' },
        });

        const incomeCategory = await prisma.category.findFirst({
            where: { name: 'Salario', scope: 'PERSONAL' },
        });

        if (expenseCategory && incomeCategory) {
            // Income transaction
            await prisma.transaction.create({
                data: {
                    amount: 300000,
                    currency: 'ARS',
                    date: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                    description: 'Salario mensual',
                    type: 'INCOME',
                    categoryId: incomeCategory.id,
                    userId: devUser.id,
                    paymentMethod: 'BANK_ACCOUNT',
                    bankAccountId: bankAccount.id,
                },
            });

            // Expense transactions
            const expenses = [
                { amount: 15000, description: 'Supermercado', days: 2 },
                { amount: 8000, description: 'Restaurante', days: 5 },
                { amount: 12000, description: 'Compras varias', days: 7 },
                { amount: 20000, description: 'Supermercado grande', days: 10 },
            ];

            for (const expense of expenses) {
                await prisma.transaction.create({
                    data: {
                        amount: expense.amount,
                        currency: 'ARS',
                        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), expense.days),
                        description: expense.description,
                        type: 'EXPENSE',
                        categoryId: expenseCategory.id,
                        userId: devUser.id,
                        paymentMethod: 'BANK_ACCOUNT',
                        bankAccountId: bankAccount.id,
                    },
                });
            }

            console.log('✅ Sample transactions created');
        }
    }

    console.log('🎉 Seed completed!');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
