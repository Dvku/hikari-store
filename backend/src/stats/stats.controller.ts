import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getStats(
    @Query('start') start: string, // Recibimos la fecha de inicio desde la URL
    @Query('end') end: string, // Recibimos la fecha de fin desde la URL
  ) {
    // Convertimos los strings que vienen de la URL a objetos Date reales
    const startDate = new Date(start);
    const endDate = new Date(end);

    // Llamamos al servicio que acabamos de crear
    return await this.statsService.getDashboardStats(startDate, endDate);
  }
}
