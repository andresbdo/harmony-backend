import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { LoginUserDto } from 'src/users/dto/login-user-dto';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { hash, compare } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password, name, lastName } = createUserDto;

    const existing = await this.usersService.findOne({ email });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await hash(password, 10);

    // Crear usuario + workspace personal en una transacción atómica
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
