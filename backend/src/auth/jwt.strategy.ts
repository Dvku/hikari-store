import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SUPER_SECRET_HIKARI_KEY',
    });
  }

  // 👈 Le quitamos el 'async' porque es un proceso síncrono
  validate(payload: { sub: string; username: string; role: string }) {
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}
