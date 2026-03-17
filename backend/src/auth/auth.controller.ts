import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

interface LoginDto {
  username: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: LoginDto) {
    return this.authService.registerAdmin(body.username, body.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(
      body.username,
      body.password,
    );
    return this.authService.login(user);
  }

  // RUTA PROTEGIDA DE PRUEBA
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(
    @Request() req: { user: { id: string; username: string; role: string } },
  ) {
    return {
      mensaje: '¡Acceso concedido a la bóveda de Hikari Store!',
      datosUsuario: req.user,
    };
  }
}
