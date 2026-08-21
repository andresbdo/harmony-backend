import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-strategy';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

class BearerTokenStrategy extends Strategy {
    name = 'api-token';
    private readonly verify: (token: string, req: any, done: (err: any, user: any) => void) => void;

    constructor(verify: (token: string, req: any, done: (err: any, user: any) => void) => void) {
        super();
        this.verify = verify;
    }

    authenticate(req: any) {
        const header = req.headers?.authorization;
        if (!header?.startsWith('Bearer ')) {
            return this.fail('Missing token', 401);
        }
        this.verify(header.slice('Bearer '.length), req, (err: any, user: any) => {
            if (err) return this.error(err);
            if (!user) return this.fail('Invalid token', 401);
            this.success(user);
        });
    }
}

@Injectable()
export class ApiTokenStrategy extends PassportStrategy(BearerTokenStrategy, 'api-token') {
    constructor(private prisma: PrismaService) {
        super();
    }

    async validate(token: string) {
        if (!token.startsWith('htk_')) {
            return null;
        }

        const tokenHash = createHash('sha256').update(token).digest('hex');
        const apiToken = await this.prisma.apiToken.findUnique({ where: { tokenHash } });

        if (!apiToken || apiToken.revokedAt) {
            return null;
        }

        const user = await this.prisma.user.findUnique({
            where: { id: apiToken.userId },
            select: { id: true, email: true, name: true, lastName: true, preferredCurrency: true },
        });

        if (!user) {
            return null;
        }

        this.prisma.apiToken
            .update({ where: { id: apiToken.id }, data: { lastUsedAt: new Date() } })
            .catch(() => undefined);

        return user;
    }
}
