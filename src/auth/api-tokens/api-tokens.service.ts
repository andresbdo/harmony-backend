import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiTokensService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, name: string) {
        const token = `htk_${randomBytes(30).toString('hex')}`;
        const tokenHash = createHash('sha256').update(token).digest('hex');

        const apiToken = await this.prisma.apiToken.create({
            data: { userId, name, tokenHash },
        });

        return {
            id: apiToken.id,
            name: apiToken.name,
            token,
            createdAt: apiToken.createdAt,
        };
    }

    async findAll(userId: string) {
        const tokens = await this.prisma.apiToken.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        return tokens.map(({ tokenHash, ...rest }) => rest);
    }

    async revoke(userId: string, id: string) {
        const apiToken = await this.prisma.apiToken.findUnique({ where: { id } });

        if (!apiToken) {
            throw new NotFoundException('Token no encontrado');
        }
        if (apiToken.userId !== userId) {
            throw new ForbiddenException('No tenés acceso a este token');
        }

        await this.prisma.apiToken.update({
            where: { id },
            data: { revokedAt: new Date() },
        });

        return { success: true };
    }
}
