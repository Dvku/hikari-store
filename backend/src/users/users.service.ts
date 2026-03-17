import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Busca un usuario por su nombre
  async findOne(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  // Crea un usuario nuevo en la base de datos
  async create(username: string, passwordHash: string) {
    return this.prisma.user.create({
      data: {
        username: username,
        password: passwordHash,
        role: 'ADMIN',
      },
    });
  }
}
