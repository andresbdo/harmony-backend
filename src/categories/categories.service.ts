import { Injectable, ForbiddenException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) {}

    async findAll(userId: string, params?: { scope?: string; workspaceId?: string }) {
        if (params?.workspaceId) {
            const workspace = await this.prisma.workspace.findFirst({
                where: {
                    id: params.workspaceId,
                    OR: [
                        { ownerId: userId },
                        { members: { some: { userId } } },
                    ],
                },
            });
            if (!workspace) throw new ForbiddenException('Access denied to workspace');
        }

        const categories = await this.prisma.category.findMany({
            where: {
                isSystem: false,
                OR: [
                    { scope: 'GLOBAL' },
                    { scope: 'PERSONAL', userId },
                    ...(params?.workspaceId
                        ? [{ scope: 'WORKSPACE', workspaceId: params.workspaceId }]
                        : []),
                ],
            },
            orderBy: { name: 'asc' },
        });

        const global = categories.filter(c => c.scope === 'GLOBAL');
        const personal = categories.filter(c => c.scope === 'PERSONAL' && c.userId === userId);
        const workspace = categories.filter(c => c.scope === 'WORKSPACE' && c.workspaceId === params?.workspaceId);

        return { global, personal, workspace };
    }

    async update(id: string, dto: UpdateCategoryDto, userId: string) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Category not found');

        if (category.scope === 'GLOBAL') {
            throw new ForbiddenException('Global categories cannot be modified');
        }

        if (category.scope === 'PERSONAL') {
            if (category.userId !== userId) throw new ForbiddenException('Access denied');
        }

        if (category.scope === 'WORKSPACE') {
            if (!category.workspaceId) throw new ForbiddenException('Access denied');
            const member = await this.prisma.workspaceMember.findFirst({
                where: { workspaceId: category.workspaceId, userId },
            });
            const workspace = await this.prisma.workspace.findFirst({
                where: { id: category.workspaceId, ownerId: userId },
            });
            if (!member && !workspace) throw new ForbiddenException('Access denied');
        }

        return this.prisma.category.update({
            where: { id },
            data: { name: dto.name, color: dto.color, icon: dto.icon },
        });
    }

    async remove(id: string, userId: string) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category) throw new NotFoundException('Category not found');

        if (category.scope === 'GLOBAL') {
            throw new ForbiddenException('Cannot delete global categories');
        }

        if (category.scope === 'PERSONAL') {
            if (category.userId !== userId) throw new ForbiddenException('Access denied');
        }

        if (category.scope === 'WORKSPACE') {
            if (!category.workspaceId) throw new ForbiddenException('Access denied');
            const member = await this.prisma.workspaceMember.findFirst({
                where: { workspaceId: category.workspaceId, userId },
            });
            const workspace = await this.prisma.workspace.findFirst({
                where: { id: category.workspaceId, ownerId: userId },
            });
            if (!member && !workspace) throw new ForbiddenException('Access denied');
        }

        const transactionCount = await this.prisma.transaction.count({
            where: { categoryId: id },
        });

        if (transactionCount > 0) {
            throw new ConflictException({
                message: 'Category in use',
                transactionCount,
            });
        }

        return this.prisma.category.delete({ where: { id } });
    }
}
