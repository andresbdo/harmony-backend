import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    // Leer workspaceId de params (solo 'workspaceId', nunca 'id' que es ID del recurso), body o query
    const workspaceId: string | undefined =
      request.params?.workspaceId ??
      request.body?.workspaceId ??
      request.query?.workspaceId;

    // Si el guard está aplicado, workspaceId es requerido
    if (!workspaceId) {
      throw new BadRequestException('workspaceId requerido');
    }

    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) {
      throw new ForbiddenException('No tenés acceso a este workspace');
    }

    // Adjuntar workspaceId al request para uso en controllers/services
    request.workspaceId = workspaceId;
    return true;
  }
}
