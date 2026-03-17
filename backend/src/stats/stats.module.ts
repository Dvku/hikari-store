import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { PrismaModule } from '../prisma/prisma.module'; // 👈 O donde tengas tu PrismaModule

@Module({
  imports: [PrismaModule], // 👈 Usamos Prisma en lugar de TypeORM
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
