import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PackItemInput {
  component_id: string;
  quantity: number | string;
}

interface RawProductInput {
  name?: string;
  price_cost?: string | number;
  price_sale?: string | number;
  stock?: string | number;
  image_url?: string | null;
  pack_items?: string | PackItemInput[];
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: RawProductInput) {
    let itemsProcesados: PackItemInput[] = [];

    // 1. "Traducción" forzada: Si es un texto, lo convertimos a objeto real
    if (
      dto.pack_items &&
      typeof dto.pack_items === 'string' &&
      dto.pack_items.length > 2
    ) {
      try {
        itemsProcesados = JSON.parse(dto.pack_items) as PackItemInput[];
      } catch (e) {
        console.error('❌ Error parseando pack_items:', e);
      }
    } else if (Array.isArray(dto.pack_items)) {
      itemsProcesados = dto.pack_items;
    }

    // 🕵️‍♂️ Esta variable manda: Si hay items, ES un pack
    const esRealmenteUnPack = itemsProcesados.length > 0;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name || 'Sin nombre',
          price_cost: Number(dto.price_cost || 0),
          price_sale: Number(dto.price_sale || 0),
          // 🛡️ Si es pack, forzamos 0 en DB. Si no, tomamos el stock manual
          stock: esRealmenteUnPack ? 0 : Number(dto.stock || 0),
          image_url: dto.image_url || null,
          is_pack: esRealmenteUnPack, // 👈 Se guarda como TRUE si hubo items
          is_active: true,
        },
      });

      if (esRealmenteUnPack) {
        await tx.packItem.createMany({
          data: itemsProcesados.map((item) => ({
            pack_id: product.id,
            component_id: item.component_id,
            quantity: Number(item.quantity),
          })),
        });
      }

      return product;
    });
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: {
        pack_items: { include: { component: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return products.map((p) => {
      const productPlain = { ...p };
      let virtualStock = p.stock;

      if (p.is_pack && p.pack_items && p.pack_items.length > 0) {
        const stocksPosibles = p.pack_items.map((item) => {
          if (!item.component) return 0;
          return Math.floor(item.component.stock / Number(item.quantity));
        });
        virtualStock = Math.min(...stocksPosibles);
      }

      return {
        ...productPlain,
        stock: virtualStock, // 🚀 Mostramos el cálculo, no el 0 de la DB
      };
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { pack_items: { include: { component: true } } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(id: string, dto: RawProductInput) {
    let itemsProcesados: PackItemInput[] = [];
    if (dto.pack_items && typeof dto.pack_items === 'string') {
      try {
        itemsProcesados = JSON.parse(dto.pack_items) as PackItemInput[];
      } catch {
        itemsProcesados = [];
      }
    } else if (Array.isArray(dto.pack_items)) {
      itemsProcesados = dto.pack_items;
    }

    const isPack = itemsProcesados.length > 0;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name: dto.name,
          price_cost: dto.price_cost ? Number(dto.price_cost) : undefined,
          price_sale: dto.price_sale ? Number(dto.price_sale) : undefined,
          // 🚀 Si lo conviertes en pack al editar, reseteamos stock a 0
          stock: isPack ? 0 : dto.stock ? Number(dto.stock) : undefined,
          is_pack: isPack,
        },
      });

      await tx.packItem.deleteMany({ where: { pack_id: id } });
      if (isPack) {
        await tx.packItem.createMany({
          data: itemsProcesados.map((item) => ({
            pack_id: id,
            component_id: item.component_id,
            quantity: Number(item.quantity),
          })),
        });
      }
      return product;
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.packItem.deleteMany({
        where: { OR: [{ pack_id: id }, { component_id: id }] },
      });
      await tx.orderItem.deleteMany({ where: { product_id: id } });
      return tx.product.delete({ where: { id } });
    });
  }

  async toggleActive(id: string) {
    const product = await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { is_active: !product.is_active },
    });
  }
}
