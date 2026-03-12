import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoriesService {
    constructor(private prisma: PrismaService) {}

    async findAll(params?: { scope?: string; workspaceId?: string }) {
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
