import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from 'src/prisma/prisma.service';

const CATEGORY_ID = 'cat-1';
const USER_ID = 'user-1';

const personalCategory = {
    id: CATEGORY_ID,
    name: 'Food',
    scope: 'PERSONAL',
    userId: USER_ID,
    workspaceId: null,
    color: '#fff',
    icon: 'food',
};

describe('CategoriesService', () => {
    let service: CategoriesService;
    let prisma: {
        category: {
            findUnique: jest.Mock;
            delete: jest.Mock;
        };
        transaction: {
            count: jest.Mock;
        };
    };

    beforeEach(async () => {
        prisma = {
            category: {
                findUnique: jest.fn(),
                delete: jest.fn(),
            },
            transaction: {
                count: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CategoriesService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CategoriesService>(CategoriesService);
    });

    describe('remove', () => {
        describe('TASK-035 — category with 3 associated transactions', () => {
            it('throws ConflictException with transactionCount: 3 and does NOT call prisma.category.delete', async () => {
                prisma.category.findUnique.mockResolvedValue(personalCategory);
                prisma.transaction.count.mockResolvedValue(3);

                await expect(service.remove(CATEGORY_ID, USER_ID)).rejects.toThrow(
                    ConflictException,
                );

                try {
                    await service.remove(CATEGORY_ID, USER_ID);
                } catch (err) {
                    expect(err).toBeInstanceOf(ConflictException);
                    expect(err.response).toMatchObject({ transactionCount: 3 });
                }

                expect(prisma.category.delete).not.toHaveBeenCalled();
            });
        });

        describe('TASK-036 — category with 0 transactions', () => {
            it('calls prisma.category.delete and does NOT throw', async () => {
                prisma.category.findUnique.mockResolvedValue(personalCategory);
                prisma.transaction.count.mockResolvedValue(0);
                prisma.category.delete.mockResolvedValue(personalCategory);

                await expect(service.remove(CATEGORY_ID, USER_ID)).resolves.not.toThrow();

                expect(prisma.category.delete).toHaveBeenCalledWith({
                    where: { id: CATEGORY_ID },
                });
            });
        });

        describe('guard — category not found', () => {
            it('throws NotFoundException when category does not exist', async () => {
                prisma.category.findUnique.mockResolvedValue(null);

                await expect(service.remove(CATEGORY_ID, USER_ID)).rejects.toThrow(
                    NotFoundException,
                );

                expect(prisma.category.delete).not.toHaveBeenCalled();
            });
        });
    });
});
