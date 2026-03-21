import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FindUserDto } from './dto/find-user.dto';
import { RemoveUserDto } from './dto/remove-user-dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        preferredCurrency: true,
        createdAt: true,
      },
    });
  }

  findOne(findUserDto: FindUserDto) {
    const query = findUserDto.id && !findUserDto.email ? {
      id: findUserDto.id,
    } : {
      email: findUserDto.email,
    };
    return this.prisma.user.findUnique({
      where: query,
    });
  }

  async findOnePublic(findUserDto: FindUserDto) {
    const user = await this.findOne(findUserDto);
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
  }

  async remove(removeUserDto: RemoveUserDto) {
    await this.prisma.user.delete({
      where: {
        id: removeUserDto.id,
      }
    });
    return { deleted: true };
  }

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        preferredCurrency: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: { name?: string; lastName?: string; preferredCurrency?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        preferredCurrency: true,
      },
    });
  }
}
