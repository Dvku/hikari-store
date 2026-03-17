import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    UsersModule,
    // Registramos el motor JWT.
    JwtModule.register({
      secret: 'SUPER_SECRET_HIKARI_KEY',
      signOptions: { expiresIn: '8h' }, // El token expirará automáticamente en 8 horas por seguridad
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
