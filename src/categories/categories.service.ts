import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

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

        return this.prisma.category.findMany({
            where: {
                OR: [
                    { scope: 'PERSONAL' },
                    ...(params?.workspaceId
                        ? [{ scope: 'WORKSPACE', workspaceId: params.workspaceId }]
                        : []),
                ],
            },
            orderBy: { name: 'asc' },
        });
    }
}
