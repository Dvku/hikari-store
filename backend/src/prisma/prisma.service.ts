import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    // Se ejecuta automáticamente cuando el backend se enciende
    async onModuleInit() {
        await this.$connect();
        console.log('Conectado a la base de datos')
    }
}
