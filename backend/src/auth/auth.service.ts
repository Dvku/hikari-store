import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

interface ValidatedUser {
  id: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async registerAdmin(username: string, pass: string) {
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(pass, saltOrRounds);
    return this.usersService.create(username, hashedPassword);
  }

  // 1. Validar Credenciales
  async validateUser(username: string, pass: string): Promise<ValidatedUser> {
    const user = await this.usersService.findOne(username);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const isPasswordMatching = await bcrypt.compare(pass, user.password);

    if (!isPasswordMatching) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Construimos y retornamos explícitamente el usuario validado sin incluir el password
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  login(user: ValidatedUser) {
    const payload = { username: user.username, sub: user.id, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
