import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      let totalVenta = 0;
      const itemsConPrecio: {
        product_id: string;
        quantity: number;
        price: number;
      }[] = [];

      // 1. Validar stocks y capturar precios actuales
      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.product_id },
          include: { pack_items: { include: { component: true } } },
        });

        if (!product || !product.is_active) {
          throw new NotFoundException(
            `El producto ${item.product_id} no está disponible.`,
          );
        }

        // --- LÓGICA DE STOCK ---
        if (product.is_pack) {
          // 📦 VALIDACIÓN PARA PACKS (Ej: Bundle One Direction)
          for (const pItem of product.pack_items) {
            const totalARestar = pItem.quantity * item.quantity;

            // Validamos si el componente tiene stock suficiente
            if (pItem.component.stock < totalARestar) {
              throw new BadRequestException(
                `Stock insuficiente para el componente: ${pItem.component.name} (Parte del pack ${product.name})`,
              );
            }

            await tx.product.update({
              where: { id: pItem.component_id },
              data: { stock: { decrement: totalARestar } },
            });
          }
        } else {
          // 🛍️ VALIDACIÓN PARA PRODUCTOS SIMPLES
          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Stock insuficiente para ${product.name}`,
            );
          }
          await tx.product.update({
            where: { id: item.product_id },
            data: { stock: { decrement: item.quantity } },
          });
        }

        totalVenta += product.price_sale * item.quantity;

        itemsConPrecio.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: product.price_sale,
        });
      }

      // 2. Crear la Orden final
      return await tx.order.create({
        data: {
          customer_name: dto.customer_name,
          social_handle: dto.social_handle,
          social_platform: dto.social_platform,
          region: dto.region,
          commune: dto.commune,
          delivery_method: dto.delivery_method,
          delivery_cost: dto.delivery_cost,
          total_amount: totalVenta + dto.delivery_cost,
          items: {
            create: itemsConPrecio,
          },
        },
        include: { items: { include: { product: true } } },
      });
    });
  }

  async findAll() {
    return await this.prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  // 🚀 ACTUALIZACIÓN DE ESTADO SIN 'ANY'
  async updateStatus(id: string, updateOrderDto: { status: OrderStatus }) {
    return await this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderDto.status,
      },
    });
  }
}
