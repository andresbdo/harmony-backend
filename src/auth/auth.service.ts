import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginUserDto } from '../users/dto/login-user-dto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { hash, compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private workspacesService: WorkspacesService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password, name, lastName } = createUserDto;

    const existing = await this.usersService.findOne({ email });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await hash(password, 10);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, password: hashedPassword, name, lastName },
      });

      await tx.workspace.create({
        data: {
          name: 'Personal',
          isPersonal: true,
          cutoffDay: 1,
          ownerId: user.id,
          inviteToken: randomBytes(16).toString('hex'),
          members: {
            create: {
              userId: user.id,
              email,
              nameAlias: name,
              responsibilityPercentage: 100,
            },
          },
        },
      });

      return user;
    });

    if (createUserDto.inviteToken) {
      try {
        await this.workspacesService.joinByToken(
          createUserDto.inviteToken,
          newUser.id,
        );
      } catch (error) {
        this.logger.warn(
          `Failed to join workspace via invite token: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const { password: _, ...result } = newUser;
    const access_token = await this.jwtService.signAsync({
      id: newUser.id,
      email: newUser.email,
    });

    return { ...result, access_token };
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;
    const user = await this.usersService.findOne({ email });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const { password: _, ...result } = user;
    const access_token = await this.jwtService.signAsync({
      id: user.id,
      email: user.email,
    });
    return { ...result, access_token };
  }
}
