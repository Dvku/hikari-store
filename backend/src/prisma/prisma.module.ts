import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Se exporta el servicio para que otros lo puedan usar
})
export class PrismaModule {}
