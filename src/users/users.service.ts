import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { FindUserDto } from './dto/find-user.dto';
import { RemoveUserDto } from './dto/remove-user-dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  create(createUserDto: CreateUserDto) {
    const user = this.prisma.user.create({
      data: createUserDto,
    });
    return user;
  }

  findOne(findUserDto: FindUserDto) {

    const query = findUserDto.id && !findUserDto.email ? {
      id: findUserDto.id,
    } : {
      email: findUserDto.email,
    }
    return this.prisma.user.findUnique({
      where: query
    });
  }

  remove(removeUserDto: RemoveUserDto) {
    return this.prisma.user.delete({
      where: {
        id: removeUserDto.id,
      }
    });
  }
}
